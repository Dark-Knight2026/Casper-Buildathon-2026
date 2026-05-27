use odra::{casper_types::U256, prelude::*, uints::ToU512, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{
    common::CurrencyAmount,
    constants::ONE_MONTH_IN_SECONDS,
    escrow::EscrowContractRef,
    lease::{
        errors::Error,
        events::{
            EquityEligibilityGranted, EquityEligibilityRevoked, LeaseAgreementCreated,
            LeaseAgreementFinished, LeaseAgreementProlonged,
        },
        types::{CreateLeaseAgreementParams, LeaseAgreement},
    },
    nft::NFTContractRef,
    property_registry::PropertyRegistryContractRef,
    roles::RolesContractRef,
};

// =============================================================================
// Lease Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    use crate::common::CurrencyAmount;

    #[odra::odra_type]
    pub struct LeaseEquityOption {
        pub property_id: U256,
    }

    #[odra::odra_type]
    pub struct LeaseAgreement {
        pub tenant: Address,
        pub landlord: Address,
        pub equity_option: Option<LeaseEquityOption>,
        pub monthly_rent: CurrencyAmount,
        pub security_deposit: CurrencyAmount,
        pub invoices_ids: Vec<U256>,
        pub start: u64,
        pub end: u64,
        pub is_finished: bool,
        pub token_id: U256,
    }

    #[odra::odra_type]
    pub struct CreateLeaseAgreementParams {
        pub tenant: Address,
        pub equity_option: Option<LeaseEquityOption>,
        pub monthly_rent: CurrencyAmount,
        pub security_deposit: CurrencyAmount,
        pub start: u64,
        pub end: u64,
        pub invoice_validity_duration: u64,
    }
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct LeaseAgreementCreated {
        pub lease_agreement_id: U256,
        pub created_at: u64,
    }

    #[odra::event]
    pub struct LeaseAgreementFinished {
        pub lease_agreement_id: U256,
        pub finished_at: u64,
    }

    #[odra::event]
    pub struct LeaseAgreementProlonged {
        pub lease_agreement_id: U256,
        pub prolonged_at: u64,
    }

    #[odra::event]
    pub struct EquityEligibilityGranted {
        pub property_id: U256,
        pub account: Address,
    }

    #[odra::event]
    pub struct EquityEligibilityRevoked {
        pub property_id: U256,
        pub account: Address,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotLandlord = 400,
        InvalidLeaseAgreementId = 401,
        EqualTenantAndLandlord = 402,
        InvalidTimeframes = 403,
        ZeroAmount = 404,
        InvalidLandlord = 405,
        LeaseAgreementHasNotFinishedYet = 406,
        NotAllInvoicesArePaid = 407,
        SecurityDepositChargeIsTooHigh = 408,
        InvalidPropertyStatus = 409,
        InvalidPropertyIssuer = 410,
        LeaseAlreadyFinalized = 411,
        TenantAlreadyEquityEligible = 412,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
  LeaseAgreementCreated,
  LeaseAgreementFinished,
  LeaseAgreementProlonged,
  EquityEligibilityGranted,
  EquityEligibilityRevoked,
])]
pub struct Lease {
    ownable: SubModule<Ownable>,
    roles: External<RolesContractRef>,
    escrow: External<EscrowContractRef>,
    nft: External<NFTContractRef>,
    property_registry: External<PropertyRegistryContractRef>,
    leases: Mapping<U256, LeaseAgreement>,
    equity_eligible: Mapping<(U256, Address), bool>,
    leases_count: Var<U256>,
}

#[odra::module]
impl Lease {
    // =========================================================================
    // Initialization
    // =========================================================================

    pub fn init(
        &mut self,
        owner: Address,
        roles: Address,
        escrow: Address,
        nft: Address,
        property_registry: Address,
    ) {
        self.ownable.init(owner);
        self.roles.set(roles);
        self.escrow.set(escrow);
        self.nft.set(nft);
        self.property_registry.set(property_registry);
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

    /// Sets the Roles contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_roles(&mut self, roles: Address) {
        self.assert_owner();
        self.roles.set(roles);
    }

    /// Sets the Escrow contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_escrow(&mut self, escrow: Address) {
        self.assert_owner();
        self.escrow.set(escrow);
    }

    /// Sets the NFT contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_nft(&mut self, nft: Address) {
        self.assert_owner();
        self.nft.set(nft);
    }

    /// Sets the PropertyRegistry contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_property_registry(&mut self, property_registry: Address) {
        self.assert_owner();
        self.property_registry.set(property_registry);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /// Returns the Roles contract address
    pub fn get_roles_contract_address(&self) -> Address {
        *self.roles.address()
    }

    /// Returns the Escrow contract address
    pub fn get_escrow_contract_address(&self) -> Address {
        *self.escrow.address()
    }

    /// Returns the NFT contract address
    pub fn get_nft_contract_address(&self) -> Address {
        *self.nft.address()
    }

    /// Returns the PropertyRegistry contract address
    pub fn get_property_registry_contract_address(&self) -> Address {
        *self.property_registry.address()
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

    /// Returns `true` if security deposit is paid for lease agreement, `false` otherwise
    pub fn is_security_deposit_paid(&self, lease_agreement_id: &U256) -> bool {
        let lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);
        let security_deposit_invoice_id = lease_agreement.invoices_ids[0];

        self.escrow
            .get_invoice_by_id(security_deposit_invoice_id)
            .is_paid
    }

    /// Returns `true` if all invoices are paid for lease agreement, `false` if at least one invoice is not paid
    pub fn is_all_invoices_paid(&self, lease_agreement_id: &U256) -> bool {
        let lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

        for invoice_id in &lease_agreement.invoices_ids {
            if !self.escrow.get_invoice_by_id(*invoice_id).is_paid {
                return false;
            }
        }

        true
    }

    /// @dev Eligibility is not automatically time-bounded. It persists until the
    /// landlord calls `finalize_lease_agreement` for the associated lease.
    /// Finalization is a protocol-level obligation after lease expiry.
    pub fn is_equity_eligible(&self, property_id: U256, account: Address) -> bool {
        self.equity_eligible.get_or_default(&(property_id, account))
    }

    // =========================================================================
    // Lease Management
    // =========================================================================

    /// Allows to create a new lease agreement and all invoices for this agreement by a landlord
    #[odra(non_reentrant)]
    pub fn create_lease_agreement(&mut self, params: CreateLeaseAgreementParams) -> U256 {
        self.assert_landlord();

        let landlord = self.env().caller();

        if params.tenant == landlord {
            self.env().revert(Error::EqualTenantAndLandlord);
        }

        if params.start >= params.end {
            self.env().revert(Error::InvalidTimeframes);
        }

        let lease_duration = params.end - params.start;

        if lease_duration % ONE_MONTH_IN_SECONDS != 0 {
            self.env().revert(Error::InvalidTimeframes);
        }

        let mut monthly_rent = params.monthly_rent;

        if *monthly_rent.amount() == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        let block_timestamp = self.env().get_block_time();
        let mut invoices_ids = vec![self.escrow.create_security_deposit_invoice(
            params.tenant,
            params.security_deposit,
            block_timestamp + params.invoice_validity_duration,
        )];

        for i in 0..(lease_duration / ONE_MONTH_IN_SECONDS) {
            invoices_ids.push(self.escrow.create_lease_invoice(
                params.tenant,
                landlord,
                monthly_rent,
                block_timestamp + (ONE_MONTH_IN_SECONDS * i) + params.invoice_validity_duration,
            ));
        }

        let lease_agreement_id = self.get_lease_agreements_count();

        // Mint a lease NFT to the tenant and freeze it.
        // Invariant: The NFT remains frozen for the entire lease lifecycle to prevent
        // unauthorized transfers. Only administrative actions (disputes/recovery)
        // can move it.
        let metadata = vec![(
            String::from("lease_agreement_id"),
            lease_agreement_id.to_string(),
        )];
        let token_id = self.nft.mint(params.tenant, metadata);
        self.nft.set_frozen_tokens(&token_id, true);

        // Mark the tenant as eligible for property equity
        if let Some(equity_option) = &params.equity_option {
            let property_id = equity_option.property_id;

            if self
                .equity_eligible
                .get_or_default(&(property_id, params.tenant))
            {
                self.env().revert(Error::TenantAlreadyEquityEligible);
            }

            let property = self.property_registry.get_property(property_id);

            if !matches!(
                property.status,
                crate::property_registry::types::PropertyStatus::Active
            ) {
                self.env().revert(Error::InvalidPropertyStatus);
            }

            if property.issuer != landlord {
                self.env().revert(Error::InvalidPropertyIssuer);
            }

            self.equity_eligible
                .set(&(property_id, params.tenant), true);

            self.env().emit_event(EquityEligibilityGranted {
                property_id,
                account: params.tenant,
            });
        }

        let lease_agreement = LeaseAgreement {
            tenant: params.tenant,
            landlord,
            equity_option: params.equity_option,
            monthly_rent,
            security_deposit: params.security_deposit,
            invoices_ids,
            start: params.start,
            end: params.end,
            is_finished: false,
            token_id,
        };

        self.leases.set(&lease_agreement_id, lease_agreement);
        self.leases_count.set(lease_agreement_id + 1);

        self.env().emit_event(LeaseAgreementCreated {
            lease_agreement_id,
            created_at: block_timestamp,
        });

        lease_agreement_id
    }

    /// Allows to finalize lease agreement between tenant and landlord when agreement has finished and won't be prolonged
    ///
    /// @dev Finalization is a protocol-level obligation after lease expiry. This
    /// is the only mechanism that removes equity eligibility for the tenant.
    /// Until this function is called, the tenant remains eligible regardless of
    /// the lease end time.
    #[odra(non_reentrant)]
    pub fn finalize_lease_agreement(
        &mut self,
        lease_agreement_id: &U256,
        security_deposit_charge: &U256,
    ) {
        let mut lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

        if lease_agreement.is_finished {
            self.env().revert(Error::LeaseAlreadyFinalized);
        }

        if lease_agreement.landlord != self.env().caller() {
            self.env().revert(Error::InvalidLandlord);
        }

        if self.env().get_block_time() < lease_agreement.end {
            self.env().revert(Error::LeaseAgreementHasNotFinishedYet);
        }

        self.assert_all_invoices_paid(lease_agreement_id);
        self.release_security_deposit(
            &lease_agreement.tenant,
            &lease_agreement.landlord,
            &mut lease_agreement.security_deposit,
            security_deposit_charge,
        );

        // Clear the `equity_eligible` entry that was set at lease creation
        if let Some(ref equity_option) = lease_agreement.equity_option {
            let property_id = equity_option.property_id;
            let tenant = lease_agreement.tenant;
            self.equity_eligible.set(&(property_id, tenant), false);

            self.env().emit_event(EquityEligibilityRevoked {
                property_id,
                account: tenant,
            });
        }

        // The lease NFT remains frozen (set at creation) to prevent unauthorized transfers.
        lease_agreement.is_finished = true;

        self.leases.set(lease_agreement_id, lease_agreement);

        self.env().emit_event(LeaseAgreementFinished {
            lease_agreement_id: *lease_agreement_id,
            finished_at: self.env().get_block_time(),
        });
    }

    /// Allows to prolong lease agreement between tenant and landlord when agreement has finished and both parties decided to prolong it
    /// @dev The lease NFT is not updated during prolongation — the token persists in its current state. Lease terms are authoritative via get_lease_agreement_by_id(); the NFT metadata references the lease ID, not the terms themselves.
    #[odra(non_reentrant)]
    pub fn prolong_lease_agreement(
        &mut self,
        lease_agreement_id: &U256,
        new_end: u64,
        invoice_validity_duration: u64,
    ) {
        let mut lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

        if lease_agreement.is_finished {
            self.env().revert(Error::LeaseAlreadyFinalized);
        }

        if lease_agreement.landlord != self.env().caller() {
            self.env().revert(Error::InvalidLandlord);
        }

        if self.env().get_block_time() < lease_agreement.end {
            self.env().revert(Error::LeaseAgreementHasNotFinishedYet);
        }

        self.assert_all_invoices_paid(lease_agreement_id);

        if lease_agreement.end >= new_end {
            self.env().revert(Error::InvalidTimeframes);
        }

        let lease_duration = new_end - lease_agreement.end;

        if lease_duration % ONE_MONTH_IN_SECONDS != 0 {
            self.env().revert(Error::InvalidTimeframes);
        }

        let block_timestamp = self.env().get_block_time();

        for i in 0..(lease_duration / ONE_MONTH_IN_SECONDS) {
            lease_agreement
                .invoices_ids
                .push(self.escrow.create_lease_invoice(
                    lease_agreement.tenant,
                    lease_agreement.landlord,
                    lease_agreement.monthly_rent,
                    block_timestamp + (ONE_MONTH_IN_SECONDS * i) + invoice_validity_duration,
                ));
        }

        lease_agreement.end = new_end;
        self.leases.set(lease_agreement_id, lease_agreement);

        self.env().emit_event(LeaseAgreementProlonged {
            lease_agreement_id: *lease_agreement_id,
            prolonged_at: self.env().get_block_time(),
        });
    }

    // =========================================================================
    // Ownable delegation
    // =========================================================================

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }
    }
}

// =============================================================================
// Internal Types
// =============================================================================

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

    fn assert_all_invoices_paid(&self, lease_agreement_id: &U256) {
        if !self.is_all_invoices_paid(lease_agreement_id) {
            self.env().revert(Error::NotAllInvoicesArePaid);
        }
    }

    fn transfer_currency_amount(&self, currency_amount: &mut CurrencyAmount, recipient: &Address) {
        if currency_amount.currency().is_none() {
            self.env()
                .transfer_tokens(recipient, &currency_amount.amount().to_u512());
        } else {
            Cep18ContractRef::new(self.env(), currency_amount.currency().unwrap())
                .transfer(recipient, currency_amount.amount());
        }
    }

    fn release_security_deposit(
        &self,
        tenant: &Address,
        landlord: &Address,
        security_deposit: &mut CurrencyAmount,
        security_deposit_charge: &U256,
    ) {
        if security_deposit_charge > security_deposit.amount() {
            self.env().revert(Error::SecurityDepositChargeIsTooHigh);
        }

        if *security_deposit_charge > U256::zero() {
            self.transfer_currency_amount(
                &mut CurrencyAmount::new(*security_deposit.currency(), *security_deposit_charge),
                landlord,
            );
            self.transfer_currency_amount(
                &mut CurrencyAmount::new(
                    *security_deposit.currency(),
                    *security_deposit.amount() - *security_deposit_charge,
                ),
                tenant,
            );
        } else {
            self.transfer_currency_amount(
                &mut CurrencyAmount::new(*security_deposit.currency(), *security_deposit.amount()),
                tenant,
            );
        }
    }
}
