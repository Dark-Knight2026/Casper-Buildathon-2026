use odra::{
    casper_types::{U256, U512},
    prelude::*,
    uints::ToU512,
    ContractRef,
};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{
    common::CurrencyAmount,
    escrow::{
        errors::Error,
        events::{InvoiceCreated, InvoicePaid, MinDeadlineSet},
        types::{Invoice, InvoiceKind},
    },
};

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

    /// Sets the minimum possible invoice deadline by the owner
    pub fn set_min_deadline(&mut self, new_min_deadline: u64) {
        self.assert_owner();

        let old_min_deadline = self.min_deadline.get_or_default();

        self.min_deadline.set(new_min_deadline);

        self.env().emit_native_event(MinDeadlineSet {
            old_min_deadline,
            new_min_deadline,
        });
    }

    /// Sets the Lease contract address by the owner
    pub fn set_lease(&mut self, lease: Address) {
        self.assert_owner();
        self.lease.set(lease);
    }

    /// Sets the Treasury contract address by the owner
    pub fn set_treasury(&mut self, treasury: Address) {
        self.assert_owner();
        self.treasury.set(treasury);
    }

    /// Allows to create a lease invoice by the Lease contract
    pub fn create_lease_invoice(
        &mut self,
        tenant: Address,
        landlord: Address,
        amount_due: CurrencyAmount,
        deadline: u64,
    ) -> U256 {
        self.assert_lease();
        self.create_invoice(InvoiceKind::Lease, tenant, landlord, amount_due, deadline)
    }

    /// Allows to create a security deposit invoice by the Lease contract
    pub fn create_security_deposit_invoice(
        &mut self,
        tenant: Address,
        amount_due: CurrencyAmount,
        deadline: u64,
    ) -> U256 {
        self.assert_lease();
        self.create_invoice(
            InvoiceKind::SecurityDeposit,
            tenant,
            self.get_lease_contract_address(),
            amount_due,
            deadline,
        )
    }

    /// Allows to pay any invoice created earlier
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

        // TODO charge 2% fee for every payment, and accumulate unless TailorCoin (BIG) token pool is deployed

        if invoice.amount_due.currency().is_none() {
            let attached_value = self.env().attached_value();

            if attached_value != invoice.amount_due.amount().to_u512() {
                self.env().revert(Error::InvalidAmountAttached);
            }

            self.env().transfer_tokens(&recipient, &attached_value);
        } else {
            if self.env().attached_value() > U512::zero() {
                self.env().revert(Error::InvalidAmountAttached);
            }

            Cep18ContractRef::new(self.env(), invoice.amount_due.currency().unwrap())
                .transfer_from(&invoice.buyer, &recipient, invoice.amount_due.amount());
        }

        invoice.is_paid = true;
        self.invoices.set(&invoice_id, invoice);

        self.env().emit_native_event(InvoicePaid {
            invoice_id,
            paid_at: self.env().get_block_time(),
        });
    }

    /// Returns the Lease contract address
    pub fn get_lease_contract_address(&self) -> Address {
        self.lease.get_or_revert_with(Error::LeaseContractIsNotSet)
    }

    /// Returns the Treasury contract address
    pub fn get_treasury_contract_address(&self) -> Address {
        self.treasury
            .get_or_revert_with(Error::TreasuryContractIsNotSet)
    }

    /// Returns invoice by its ID
    pub fn get_invoice_by_id(&self, invoice_id: U256) -> Invoice {
        self.invoices
            .get(&invoice_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidInvoiceId)
    }

    /// Returns number of invoices created through this contract
    pub fn get_invoices_count(&self) -> U256 {
        self.invoices_count.get_or_default()
    }

    /// Returns the minimum invoice deadline
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
        mut amount_due: CurrencyAmount,
        deadline: u64,
    ) -> U256 {
        if buyer == seller {
            self.env().revert(Error::EqualBuyerAndSeller)
        }

        if *amount_due.amount() == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        if deadline < self.env().get_block_time() + self.min_deadline.get_or_default() {
            self.env().revert(Error::InvalidDeadline);
        }

        let invoice_id = self.get_invoices_count();
        let invoice = Invoice {
            kind,
            buyer,
            seller,
            amount_due,
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

    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn assert_lease(&self) {
        if self.env().caller() != self.get_lease_contract_address() {
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
        CallerNotLeaseContract = 61_000,
        LeaseContractIsNotSet = 61_001,
        TreasuryContractIsNotSet = 61_002,
        ZeroAmount = 61_003,
        InvalidDeadline = 61_004,
        InvalidInvoiceId = 61_005,
        CallerIsNotBuyer = 61_006,
        InvoiceIsAlreadyPaid = 61_007,
        InvoiceIsExpired = 61_008,
        InvalidAmountAttached = 61_009,
        EqualBuyerAndSeller = 61_010,
    }
}

pub mod types {
    use odra::prelude::*;

    use crate::common::CurrencyAmount;

    #[odra::odra_type]
    pub enum InvoiceKind {
        SecurityDeposit,
        Lease,
    }

    #[odra::odra_type]
    pub struct Invoice {
        pub kind: InvoiceKind,
        pub buyer: Address,
        pub seller: Address,
        pub amount_due: CurrencyAmount,
        pub deadline: u64,
        pub is_paid: bool,
    }
}

#[cfg(test)]
mod tests {
    use odra::host::{Deployer, HostEnv, HostRef};
    use odra_modules::access::errors::Error as AccessError;

    use crate::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};

    use super::*;

    const MIN_DEADLINE: u64 = 5 * 60; // 5 minutes

    struct TestData {
        env: HostEnv,
        escrow: EscrowHostRef,
        mock_cep18: TailorCoinHostRef,
    }

    struct InvoiceParams {
        tenant: Address,
        landlord: Address,
        amount_due: CurrencyAmount,
        deadline: u64,
    }

    #[test]
    fn test_init_should_initialize_contract_properly() {
        let test_data = setup(odra_test::env());

        assert_eq!(
            test_data.escrow.get_owner(),
            test_data.env.get_account(0),
            "Invalid owner"
        );
        assert_eq!(
            test_data.escrow.get_lease_contract_address(),
            test_data.env.get_account(15),
            "Invalid Lease contract address"
        );
        assert_eq!(
            test_data.escrow.get_treasury_contract_address(),
            test_data.env.get_account(14),
            "Invalid Treasury contract address"
        );
        assert_eq!(
            test_data.escrow.get_min_deadline(),
            MIN_DEADLINE,
            "Invalid minimal invoice deadline"
        );
        assert_eq!(
            test_data.escrow.get_invoices_count(),
            U256::zero(),
            "Invalid initial invoices count"
        );
    }

    #[test]
    fn test_set_min_deadline_should_revert_if_not_owner_is_calling() {
        let mut test_data = setup(odra_test::env());

        test_data.env.set_caller(test_data.env.get_account(1));

        assert_eq!(
            test_data.escrow.try_set_min_deadline(0).unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_min_deadline_should_update_min_deadline_properly() {
        let mut test_data = setup(odra_test::env());
        let new_min_deadline = 10 * 60; // 10 minutes

        test_data.escrow.set_min_deadline(new_min_deadline);

        assert_eq!(
            test_data.escrow.get_min_deadline(),
            new_min_deadline,
            "Invalid minimal invoice deadline"
        );
        assert!(test_data.env.emitted_native_event(
            &test_data.escrow,
            MinDeadlineSet {
                old_min_deadline: MIN_DEADLINE,
                new_min_deadline
            }
        ));
    }

    #[test]
    fn test_set_lease_should_revert_if_not_owner_is_calling() {
        let mut test_data = setup(odra_test::env());

        test_data.env.set_caller(test_data.env.get_account(1));

        assert_eq!(
            test_data
                .escrow
                .try_set_lease(test_data.env.get_account(1))
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_lease_should_set_lease_properly() {
        let mut test_data = setup(odra_test::env());
        let lease = test_data.env.get_account(10);

        test_data.escrow.set_lease(lease);

        assert_eq!(
            test_data.escrow.get_lease_contract_address(),
            lease,
            "Invalid Lease contract address"
        );
    }

    #[test]
    fn test_set_treasury_should_revert_if_not_owner_is_calling() {
        let mut test_data = setup(odra_test::env());

        test_data.env.set_caller(test_data.env.get_account(1));

        assert_eq!(
            test_data
                .escrow
                .try_set_treasury(test_data.env.get_account(1))
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_treasury_should_set_treasury_properly() {
        let mut test_data = setup(odra_test::env());
        let treasury = test_data.env.get_account(10);

        test_data.escrow.set_treasury(treasury);

        assert_eq!(
            test_data.escrow.get_treasury_contract_address(),
            treasury,
            "Invalid Treasury contract address"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_not_lease_contract_is_calling() {
        let mut test_data = setup(odra_test::env());

        assert_eq!(
            test_data
                .escrow
                .try_create_lease_invoice(
                    test_data.env.get_account(0),
                    test_data.env.get_account(0),
                    CurrencyAmount::new(None, U256::zero()),
                    0
                )
                .unwrap_err(),
            Error::CallerNotLeaseContract.into(),
            "Should revert when is called by not the Lease contract"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_buyer_is_equal_to_seller() {
        let mut test_data = setup(odra_test::env());

        test_data
            .env
            .set_caller(test_data.escrow.get_lease_contract_address());

        assert_eq!(
            test_data
                .escrow
                .try_create_lease_invoice(
                    test_data.env.get_account(0),
                    test_data.env.get_account(0),
                    CurrencyAmount::new(None, U256::zero()),
                    0
                )
                .unwrap_err(),
            Error::EqualBuyerAndSeller.into(),
            "Should revert when buyer is the same as seller"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_amount_is_zero() {
        let mut test_data = setup(odra_test::env());

        test_data
            .env
            .set_caller(test_data.escrow.get_lease_contract_address());

        assert_eq!(
            test_data
                .escrow
                .try_create_lease_invoice(
                    test_data.env.get_account(0),
                    test_data.env.get_account(1),
                    CurrencyAmount::new(None, U256::zero()),
                    0
                )
                .unwrap_err(),
            Error::ZeroAmount.into(),
            "Should revert when is called with zero amount"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_fail_if_deadline_is_sooner_than_min_deadline() {
        let mut test_data = setup(odra_test::env());

        test_data
            .env
            .set_caller(test_data.escrow.get_lease_contract_address());

        assert_eq!(
            test_data
                .escrow
                .try_create_lease_invoice(
                    test_data.env.get_account(0),
                    test_data.env.get_account(1),
                    CurrencyAmount::new(None, U256::one()),
                    test_data.env.block_time() + test_data.escrow.get_min_deadline() - 1
                )
                .unwrap_err(),
            Error::InvalidDeadline.into(),
            "Should revert when deadline is sooner than block.time + minimum deadline"
        );
    }

    #[test]
    fn test_create_lease_invoice_should_create_lease_invoice_properly() {
        let mut test_data = setup(odra_test::env());
        let params = generate_invoice_params(&test_data);
        let invoice_id = create_lease_invoice(&mut test_data, &params);

        assert_eq!(invoice_id, U256::zero(), "Invalid invoice ID");
    }

    #[test]
    fn test_pay_invoice_should_fail_if_invoice_does_not_exist() {
        let mut test_data = setup(odra_test::env());

        assert_eq!(
            test_data.escrow.try_pay_invoice(U256::zero()).unwrap_err(),
            Error::InvalidInvoiceId.into(),
            "Should revert when invoice does not exist"
        );
    }

    #[test]
    fn test_pay_invoice_should_fail_if_not_buyer_is_trying_to_pay_invoice() {
        let mut test_data = setup(odra_test::env());
        let params = generate_invoice_params(&test_data);
        let invoice_id = create_lease_invoice(&mut test_data, &params);

        test_data.env.set_caller(params.landlord);

        assert_eq!(
            test_data.escrow.try_pay_invoice(invoice_id).unwrap_err(),
            Error::CallerIsNotBuyer.into(),
            "Should revert when caller is not buyer"
        );
    }

    #[test]
    fn test_pay_invoice_should_fail_if_invoice_is_already_paid() {
        let mut test_data = setup(odra_test::env());
        let mut params = generate_invoice_params(&test_data);
        let invoice_id = create_lease_invoice(&mut test_data, &params);

        test_data
            .escrow
            .with_tokens(params.amount_due.amount().to_u512())
            .pay_invoice(invoice_id);

        assert_eq!(
            test_data.escrow.try_pay_invoice(invoice_id).unwrap_err(),
            Error::InvoiceIsAlreadyPaid.into(),
            "Should revert when invoice is already paid"
        );
    }

    #[test]
    fn test_pay_invoice_should_fail_if_invoice_is_expired() {
        let mut test_data = setup(odra_test::env());
        let params = generate_invoice_params(&test_data);
        let invoice_id = create_lease_invoice(&mut test_data, &params);

        test_data
            .env
            .advance_block_time(test_data.escrow.get_invoice_by_id(invoice_id).deadline + 1);

        assert_eq!(
            test_data.escrow.try_pay_invoice(invoice_id).unwrap_err(),
            Error::InvoiceIsExpired.into(),
            "Should revert when invoice is expired"
        );
    }

    #[test]
    fn test_pay_invoice_should_fail_if_attached_cspr_value_is_invalid_for_invoice_in_native_token()
    {
        let mut test_data = setup(odra_test::env());
        let mut params = generate_invoice_params(&test_data);
        let invoice_id = create_lease_invoice(&mut test_data, &params);

        assert_eq!(
            test_data
                .escrow
                .with_tokens(params.amount_due.amount().to_u512() - 1)
                .try_pay_invoice(invoice_id)
                .unwrap_err(),
            Error::InvalidAmountAttached.into(),
            "Should revert when attached CSPR value is invalid - 1"
        );
        assert_eq!(
            test_data
                .escrow
                .with_tokens(params.amount_due.amount().to_u512() + 1)
                .try_pay_invoice(invoice_id)
                .unwrap_err(),
            Error::InvalidAmountAttached.into(),
            "Should revert when attached CSPR value is invalid - 2"
        );
    }

    #[test]
    fn test_pay_invoice_should_fail_if_attached_cspr_value_is_invalid_for_invoice_in_cep18_token() {
        let mut test_data = setup(odra_test::env());
        let mut params = generate_invoice_params(&test_data);

        *params.amount_due.currency() = Some(test_data.mock_cep18.address());

        let invoice_id = create_lease_invoice(&mut test_data, &params);

        assert_eq!(
            test_data
                .escrow
                .with_tokens(U512::one())
                .try_pay_invoice(invoice_id)
                .unwrap_err(),
            Error::InvalidAmountAttached.into(),
            "Should revert when attached CSPR value is invalid"
        );
    }

    #[test]
    fn test_pay_invoice_should_pay_invoice_in_native_token_properly() {
        let mut test_data = setup(odra_test::env());
        let mut params = generate_invoice_params(&test_data);
        let invoice_id = create_lease_invoice(&mut test_data, &params);
        let prev_recipient_token_balance = test_data.env.balance_of(&params.landlord);

        test_data
            .escrow
            .with_tokens(params.amount_due.amount().to_u512())
            .pay_invoice(invoice_id);

        let curr_recipient_token_balance = test_data.env.balance_of(&params.landlord);

        assert!(test_data.env.emitted_native_event(
            &test_data.escrow,
            InvoicePaid {
                invoice_id,
                paid_at: test_data.env.block_time(),
            }
        ));
        assert_eq!(
            curr_recipient_token_balance,
            prev_recipient_token_balance + params.amount_due.amount().to_u512(),
            "Invalid current recipient balance"
        );
        assert!(
            test_data.escrow.get_invoice_by_id(invoice_id).is_paid,
            "Invoice should be marked as paid after successful payment"
        );
    }

    #[test]
    fn test_pay_invoice_should_pay_invoice_in_cep18_token_properly() {
        let mut test_data = setup(odra_test::env());
        let mut params = generate_invoice_params(&test_data);

        *params.amount_due.currency() = Some(test_data.mock_cep18.address());

        let invoice_id = create_lease_invoice(&mut test_data, &params);
        let prev_recipient_token_balance = test_data.mock_cep18.balance_of(&params.landlord);

        test_data
            .mock_cep18
            .approve(&test_data.escrow.address(), params.amount_due.amount());
        test_data.escrow.pay_invoice(invoice_id);

        let curr_recipient_token_balance = test_data.mock_cep18.balance_of(&params.landlord);

        assert!(test_data.env.emitted_native_event(
            &test_data.escrow,
            InvoicePaid {
                invoice_id,
                paid_at: test_data.env.block_time(),
            }
        ));
        assert_eq!(
            curr_recipient_token_balance,
            prev_recipient_token_balance + *params.amount_due.amount(),
            "Invalid current recipient balance"
        );
        assert!(
            test_data.escrow.get_invoice_by_id(invoice_id).is_paid,
            "Invoice should be marked as paid after successful payment"
        );
    }

    fn setup(env: HostEnv) -> TestData {
        let mut escrow = Escrow::deploy(
            &env,
            EscrowInitArgs {
                owner: env.get_account(0),
                min_deadline: MIN_DEADLINE,
            },
        );
        let mock_cep18 = TailorCoin::deploy(
            &env,
            TailorCoinInitArgs {
                symbol: String::from("MOCK"),
                name: String::from("MOCK"),
                decimals: 18,
                initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
            },
        );

        escrow.set_lease(env.get_account(15));
        escrow.set_treasury(env.get_account(14));

        TestData {
            env,
            escrow,
            mock_cep18,
        }
    }

    fn generate_invoice_params(test_data: &TestData) -> InvoiceParams {
        InvoiceParams {
            tenant: test_data.env.get_account(0),
            landlord: test_data.env.get_account(1),
            amount_due: CurrencyAmount::new(
                None,
                U256::from_dec_str("1000000000000000000").unwrap(),
            ),
            deadline: test_data.env.block_time() + test_data.escrow.get_min_deadline(),
        }
    }

    fn create_lease_invoice(test_data: &mut TestData, params: &InvoiceParams) -> U256 {
        test_data
            .env
            .set_caller(test_data.escrow.get_lease_contract_address());

        let invoice_id = test_data.escrow.create_lease_invoice(
            params.tenant,
            params.landlord,
            params.amount_due,
            params.deadline,
        );

        test_data.env.set_caller(test_data.env.get_account(0));

        assert!(test_data.env.emitted_native_event(
            &test_data.escrow,
            InvoiceCreated {
                invoice_id,
                created_at: test_data.env.block_time(),
            }
        ));
        assert_eq!(
            test_data.escrow.get_invoice_by_id(invoice_id),
            Invoice {
                kind: InvoiceKind::Lease,
                buyer: params.tenant,
                seller: params.landlord,
                amount_due: params.amount_due,
                deadline: params.deadline,
                is_paid: false
            },
            "Invalid invoice"
        );
        assert_eq!(
            test_data.escrow.get_invoices_count(),
            invoice_id + 1,
            "Invalid invoices count number"
        );

        invoice_id
    }
}
