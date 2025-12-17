use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::access::Ownable;

use crate::{
    escrow::EscrowContractRef,
    lease::{
        errors::Error,
        events::LeaseAgreementCreated,
        types::{CreateLeaseAgreementParams, LeaseAgreement},
    },
    roles::RolesContractRef,
};

#[odra::module(errors = Error, events = [LeaseAgreementCreated])]
pub struct Lease {
    ownable: SubModule<Ownable>,
    roles: External<RolesContractRef>,
    escrow: External<EscrowContractRef>,
    leases: Mapping<U256, LeaseAgreement>,
    leases_count: Var<U256>,
}

#[odra::module]
impl Lease {
    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    /// Sets the Roles contract address by the owner
    pub fn set_roles(&mut self, roles: Address) {
        self.assert_owner();
        self.roles.set(roles);
    }

    /// Sets the Escrow contract address by the owner
    pub fn set_escrow(&mut self, escrow: Address) {
        self.assert_owner();
        self.escrow.set(escrow);
    }

    /// Allows to create a new lease agreement by a landlord
    pub fn create_lease_agreement(&mut self, params: CreateLeaseAgreementParams) -> U256 {
        self.assert_landlord();

        let landlord = self.env().caller();

        if params.tenant == landlord {
            self.env().revert(Error::EqualTenantAndLandlord);
        }

        // TODO

        let invoice_id = self.escrow.create_lease_invoice(
            params.tenant,
            landlord,
            *params.monthly_rent.currency(),
            *params.monthly_rent.amount(),
            0,
        );

        let lease_agreement_id = self.get_lease_agreements_count();
        let lease_agreement = LeaseAgreement {
            tenant: params.tenant,
            landlord,
            monthly_rent: params.monthly_rent,
            security_deposit: params.security_deposit,
            invoices_ids: vec![invoice_id],
            start: params.start,
            end: params.end,
            is_closed: false,
        };

        self.leases.set(&lease_agreement_id, lease_agreement);
        self.leases_count.set(lease_agreement_id + 1);

        self.env().emit_native_event(LeaseAgreementCreated {
            lease_agreement_id,
            created_at: self.env().get_block_time(),
        });

        lease_agreement_id
    }

    pub fn close_lease_agreement(&mut self) {
        self.assert_landlord();
    }

    /// Returns the Roles contract address
    pub fn get_roles_contract_address(&self) -> Address {
        *self.roles.address()
    }

    /// Returns the Escrow contract address
    pub fn get_escrow_contract_address(&self) -> Address {
        *self.escrow.address()
    }

    /// Returns lease agreement by its ID
    pub fn get_lease_agreement_by_id(&self, lease_agreement_id: &U256) -> LeaseAgreement {
        self.leases
            .get(lease_agreement_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidLeaseAgreementId)
    }

    /// Returns number of lease agreements created through this contract
    pub fn get_lease_agreements_count(&self) -> U256 {
        self.leases_count.get_or_default()
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }
    }
}

impl Lease {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn assert_landlord(&self) {
        let landlord_role = self.roles.get_landlord_role();

        if !self.roles.has_role(&landlord_role, &self.env().caller()) {
            self.env().revert(Error::CallerNotLandlord);
        }
    }
}

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct LeaseAgreementCreated {
        pub lease_agreement_id: U256,
        pub created_at: u64,
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotLandlord = 60_000,
        InvalidLeaseAgreementId = 60_001,
        EqualTenantAndLandlord = 60_002,
    }
}

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    use crate::common::CurrencyAmount;

    #[odra::odra_type]
    pub struct LeaseAgreement {
        pub tenant: Address,
        pub landlord: Address,
        pub monthly_rent: CurrencyAmount,
        pub security_deposit: CurrencyAmount,
        pub invoices_ids: Vec<U256>,
        pub start: u64,
        pub end: u64,
        pub is_closed: bool,
    }

    #[odra::odra_type]
    pub struct CreateLeaseAgreementParams {
        pub tenant: Address,
        pub monthly_rent: CurrencyAmount,
        pub security_deposit: CurrencyAmount,
        pub start: u64,
        pub end: u64,
    }
}

#[cfg(test)]
mod tests {}
