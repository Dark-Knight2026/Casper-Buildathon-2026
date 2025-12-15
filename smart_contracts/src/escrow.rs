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
    treasury: Var<Address>,
    invoices: Mapping<U256, Invoice>,
    invoices_count: Var<U256>,
    min_deadline: Var<u64>,
}

#[odra::module]
impl Escrow {
    pub fn init(&mut self, owner: Address, min_deadline: u64) {
        self.ownable.init(owner);
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

    pub fn set_lease(&mut self, lease: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.lease.set(lease);
    }

    pub fn set_treasury(&mut self, treasury: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.treasury.set(treasury);
    }

    pub fn create_lease_invoice(
        &mut self,
        tenant: Address,
        landlord: Address,
        currency: Option<Address>,
        amount: U256,
        deadline: u64,
    ) -> U256 {
        self.assert_lease(self.env().caller());
        self.create_invoice(
            InvoiceKind::LEASE,
            tenant,
            landlord,
            currency,
            amount,
            deadline,
        )
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
        self.lease.get_or_revert_with(Error::LeaseContractIsNotSet)
    }

    pub fn get_treasury_contract_address(&self) -> Address {
        self.treasury
            .get_or_revert_with(Error::TreasuryContractIsNotSet)
    }

    pub fn get_invoice_by_id(&self, invoice_id: U256) -> Invoice {
        self.invoices
            .get(&invoice_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidInvoiceId)
    }

    pub fn get_invoices_count(&self) -> U256 {
        self.invoices_count.get_or_default()
    }

    pub fn get_min_deadline(&self) -> u64 {
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
        seller: Address,
        currency: Option<Address>,
        amount: U256,
        deadline: u64,
    ) -> U256 {
        if buyer == seller {
            self.env().revert(Error::EqualBuyerAndSeller)
        }

        if amount == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        if deadline < self.env().get_block_time() + self.min_deadline.get_or_default() {
            self.env().revert(Error::InvalidDeadline);
        }

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
        if caller != self.get_lease_contract_address() {
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
        TreasuryContractIsNotSet = 65_002,
        ZeroAmount = 65_003,
        InvalidDeadline = 65_004,
        InvalidInvoiceId = 65_005,
        CallerIsNotBuyer = 65_006,
        InvoiceIsAlreadyPaid = 65_007,
        InvoiceIsExpired = 65_008,
        InvalidAmountAttached = 65_009,
        EqualBuyerAndSeller = 65_010,
    }
}

#[cfg(test)]
mod tests {
    use odra::host::{Deployer, HostEnv};
    use odra_modules::access::errors::Error as AccessError;

    use super::*;

    const MIN_DEADLINE: u64 = 5 * 60; // 5 minutes

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
            escrow.get_treasury_contract_address(),
            env.get_account(14),
            "Invalid Treasury contract address"
        );
        assert_eq!(
            escrow.get_min_deadline(),
            MIN_DEADLINE,
            "Invalid minimal invoice deadline"
        );
        assert_eq!(
            escrow.get_invoices_count(),
            U256::zero(),
            "Invalid initial invoices count"
        );
    }

    #[test]
    fn test_set_min_deadline_should_revert_if_not_owner_is_calling() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            escrow.try_set_min_deadline(0).unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_min_deadline_should_update_min_deadline_properly() {
        let env = odra_test::env();
        let mut escrow = setup(&env);
        let new_min_deadline = 10 * 60; // 10 minutes

        escrow.set_min_deadline(new_min_deadline);

        assert_eq!(
            escrow.get_min_deadline(),
            new_min_deadline,
            "Invalid minimal invoice deadline"
        );
        assert!(env.emitted_native_event(
            &escrow,
            MinDeadlineSet {
                old_min_deadline: MIN_DEADLINE,
                new_min_deadline
            }
        ));
    }

    #[test]
    fn test_set_lease_should_revert_if_not_owner_is_calling() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            escrow.try_set_lease(env.get_account(1)).unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_lease_should_set_lease_properly() {
        let env = odra_test::env();
        let mut escrow = setup(&env);
        let lease = env.get_account(10);

        escrow.set_lease(lease);

        assert_eq!(
            escrow.get_lease_contract_address(),
            lease,
            "Invalid Lease contract address"
        );
    }

    #[test]
    fn test_set_treasury_should_revert_if_not_owner_is_calling() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            escrow.try_set_treasury(env.get_account(1)).unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_treasury_should_set_treasury_properly() {
        let env = odra_test::env();
        let mut escrow = setup(&env);
        let treasury = env.get_account(10);

        escrow.set_treasury(treasury);

        assert_eq!(
            escrow.get_treasury_contract_address(),
            treasury,
            "Invalid Treasury contract address"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_not_lease_contract_is_calling() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        assert_eq!(
            escrow
                .try_create_lease_invoice(
                    env.get_account(0),
                    env.get_account(0),
                    None,
                    U256::zero(),
                    0
                )
                .unwrap_err(),
            Error::CallerNotLeaseContract.into(),
            "Should revert when is called by not the Lease contract"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_buyer_is_equal_to_seller() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(escrow.get_lease_contract_address());

        assert_eq!(
            escrow
                .try_create_lease_invoice(
                    env.get_account(0),
                    env.get_account(0),
                    None,
                    U256::zero(),
                    0
                )
                .unwrap_err(),
            Error::EqualBuyerAndSeller.into(),
            "Should revert when buyer is the same as seller"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_amount_is_zero() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(escrow.get_lease_contract_address());

        assert_eq!(
            escrow
                .try_create_lease_invoice(
                    env.get_account(0),
                    env.get_account(1),
                    None,
                    U256::zero(),
                    0
                )
                .unwrap_err(),
            Error::ZeroAmount.into(),
            "Should revert when is called with zero amount"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_deadline_is_sooner_than_min_deadline() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(escrow.get_lease_contract_address());

        assert_eq!(
            escrow
                .try_create_lease_invoice(
                    env.get_account(0),
                    env.get_account(1),
                    None,
                    U256::one(),
                    env.block_time() + escrow.get_min_deadline() - 1
                )
                .unwrap_err(),
            Error::InvalidDeadline.into(),
            "Should revert when deadline is sooner than block.time + minimum deadline"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_create_lease_invoice_properly() {
        let env = odra_test::env();
        let mut escrow = setup(&env);

        env.set_caller(escrow.get_lease_contract_address());

        let tenant = env.get_account(0);
        let landlord = env.get_account(1);
        let currency = None;
        let amount = U256::from_dec_str("1000000000000000000").unwrap();
        let deadline = env.block_time() + escrow.get_min_deadline();
        let invoice_id = escrow.create_lease_invoice(tenant, landlord, currency, amount, deadline);

        assert_eq!(invoice_id, U256::zero(), "Invalid invoice ID");
        assert!(env.emitted_native_event(
            &escrow,
            InvoiceCreated {
                invoice_id,
                created_at: env.block_time(),
            }
        ));
        assert_eq!(
            escrow.get_invoices_count(),
            U256::one(),
            "Invalid invoices count number"
        );
        assert_eq!(
            escrow.get_invoice_by_id(invoice_id),
            Invoice {
                kind: InvoiceKind::LEASE,
                buyer: tenant,
                seller: landlord,
                currency,
                amount,
                deadline,
                is_paid: false
            },
            "Invalid invoice"
        )
    }

    fn setup(env: &HostEnv) -> EscrowHostRef {
        let mut escrow = Escrow::deploy(
            env,
            EscrowInitArgs {
                owner: env.get_account(0),
                min_deadline: MIN_DEADLINE,
            },
        );

        escrow.set_lease(env.get_account(15));
        escrow.set_treasury(env.get_account(14));

        escrow
    }
}
