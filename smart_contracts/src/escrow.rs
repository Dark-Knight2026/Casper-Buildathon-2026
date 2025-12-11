use odra::{casper_types::U256, prelude::*, uints::ToU512, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::escrow::{
    errors::Error,
    events::{InvoiceCreated, InvoicePaid, MinDeadlineSet},
};

#[odra::odra_type]
pub enum InvoiceKind {
    LEASE,
}

#[odra::odra_type]
pub struct Invoice {
    kind: InvoiceKind,
    buyer: Address,
    seller: Address,
    currency: Option<Address>,
    amount: U256,
    deadline: u64,
    is_paid: bool,
}

#[odra::module(errors = Error, events = [MinDeadlineSet, InvoiceCreated, InvoicePaid])]
pub struct Escrow {
    ownable: SubModule<Ownable>,
    lease: Var<Address>,
    invoices: Mapping<U256, Invoice>,
    invoices_count: Var<U256>,
    min_deadline: Var<u64>,
}

#[odra::module]
impl Escrow {
    pub fn init(&mut self, owner: Address, lease: Address, min_deadline: u64) {
        self.ownable.init(owner);
        self.lease.set(lease);
        self.set_min_deadline(min_deadline);
    }

    pub fn set_min_deadline(&mut self, new_min_deadline: u64) {
        self.ownable.assert_owner(&self.env().caller());

        let old_min_deadline = self.min_deadline.get_or_default();

        self.min_deadline.set(new_min_deadline);

        self.env().emit_native_event(MinDeadlineSet {
            old_min_deadline,
            new_min_deadline,
        });
    }

    pub fn create_lease_invoice(
        &mut self,
        tenant: Address,
        currency: Option<Address>,
        amount: U256,
        deadline: u64,
    ) -> U256 {
        self.assert_lease(self.env().caller());
        self.create_invoice(InvoiceKind::LEASE, tenant, currency, amount, deadline)
    }

    #[odra(payable)]
    pub fn pay_invoice(&mut self, invoice_id: U256) {
        let mut invoice = self
            .invoices
            .get(&invoice_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidInvoiceId);

        if self.env().caller() != invoice.buyer {
            self.env().revert(Error::CallerIsNotBuyer);
        }

        if invoice.is_paid {
            self.env().revert(Error::InvoiceIsAlreadyPaid);
        }

        if self.env().get_block_time() > invoice.deadline {
            self.env().revert(Error::InvoiceIsExpired);
        }

        let recipient = invoice.seller;

        if invoice.currency.is_none() {
            let attached_value = self.env().attached_value();

            if attached_value != invoice.amount.to_u512() {
                self.env().revert(Error::InvalidAmountAttached);
            }

            self.env().transfer_tokens(&recipient, &attached_value);
        } else {
            Cep18ContractRef::new(self.env(), invoice.currency.unwrap()).transfer_from(
                &invoice.buyer,
                &recipient,
                &invoice.amount,
            );
        }

        invoice.is_paid = true;
        self.invoices.set(&invoice_id, invoice);

        // TODO notify the Lease contract about successful payment of the invoice ?

        self.env().emit_native_event(InvoicePaid {
            invoice_id,
            paid_at: self.env().get_block_time(),
        });
    }

    pub fn get_lease_contract_address(&self) -> Address {
        self.lease
            .get()
            .unwrap_or_revert_with(&self.env(), Error::LeaseContractIsNotSet)
    }

    pub fn get_invoice_by_id(&self, invoice_id: U256) -> Invoice {
        self.invoices
            .get(&invoice_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidInvoiceId)
    }

    pub fn get_invoices_count(&self) -> U256 {
        self.invoices_count.get_or_default()
    }

    pub fn get_min_invoice_deadline(&self) -> u64 {
        self.min_deadline.get_or_default()
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }
    }
}

impl Escrow {
    fn create_invoice(
        &mut self,
        kind: InvoiceKind,
        buyer: Address,
        currency: Option<Address>,
        amount: U256,
        deadline: u64,
    ) -> U256 {
        if amount == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        if deadline <= self.env().get_block_time() + self.min_deadline.get_or_default() {
            self.env().revert(Error::InvalidDeadline);
        }

        let seller = self.env().caller();
        let invoice_id = self.invoices_count.get_or_default();
        let invoice = Invoice {
            kind,
            buyer,
            seller,
            currency,
            amount,
            deadline,
            is_paid: false,
        };

        self.invoices.set(&invoice_id, invoice);
        self.invoices_count.set(invoice_id + 1);

        self.env().emit_native_event(InvoiceCreated {
            invoice_id,
            created_at: self.env().get_block_time(),
        });

        invoice_id
    }

    fn assert_lease(&self, caller: Address) {
        if caller != self.lease.get_or_revert_with(Error::LeaseContractIsNotSet) {
            self.env().revert(Error::CallerNotLeaseContract);
        }
    }
}

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct MinDeadlineSet {
        pub old_min_deadline: u64,
        pub new_min_deadline: u64,
    }

    #[odra::event]
    pub struct InvoiceCreated {
        pub invoice_id: U256,
        pub created_at: u64,
    }

    #[odra::event]
    pub struct InvoicePaid {
        pub invoice_id: U256,
        pub paid_at: u64,
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotLeaseContract = 65_000,
        LeaseContractIsNotSet = 65_001,
        ZeroAmount = 65_002,
        InvalidDeadline = 65_003,
        InvalidInvoiceId = 65_004,
        CallerIsNotBuyer = 65_005,
        InvoiceIsAlreadyPaid = 65_006,
        InvoiceIsExpired = 65_007,
        InvalidAmountAttached = 65_008,
    }
}

#[cfg(test)]
mod tests {
    use odra::host::{Deployer, HostEnv};
    use odra_modules::access::errors::Error;

    use super::*;

    #[test]
    fn test_init_should_initialize_contract_properly() {
        let env = odra_test::env();
        let escrow = setup(&env);

        assert_eq!(escrow.get_owner(), env.get_account(0), "Invalid owner");
        assert_eq!(
            escrow.get_lease_contract_address(),
            env.get_account(15),
            "Invalid Lease contract address"
        );
        assert_eq!(
            escrow.get_min_invoice_deadline(),
            5 * 60,
            "Invalid minimal invoice deadline"
        );
        assert_eq!(
            escrow.get_invoices_count(),
            U256::zero(),
            "Invalid initial invoices count"
        );
    }

    #[test]
    fn test_set_min_deadline_should_revert_if_no_owner_is_calling() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            escrow.try_set_min_deadline(0).unwrap_err(),
            Error::CallerNotTheOwner.into(),
            "Should revert when is called by not owner"
        );
    }

    fn setup(env: &HostEnv) -> EscrowHostRef {
        Escrow::deploy(
            env,
            EscrowInitArgs {
                owner: env.get_account(0),
                lease: env.get_account(15),
                min_deadline: 5 * 60,
            },
        )
    }
}
