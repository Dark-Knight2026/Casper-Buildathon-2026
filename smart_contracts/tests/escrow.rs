use odra::{
    casper_types::{U256, U512},
    host::{Deployer, HostEnv, HostRef},
    prelude::{Address, Addressable},
    uints::ToU512,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::common::CurrencyAmount;
use leasefi_contracts::escrow::{
    errors::Error,
    events::{InvoiceCreated, InvoicePaid, MinDeadlineSet},
    types::{Invoice, InvoiceKind},
    Escrow, EscrowHostRef, EscrowInitArgs,
};
use leasefi_contracts::big_coin::{BigCoin, BigCoinHostRef, BigCoinInitArgs};

const MIN_DEADLINE: u64 = 5 * 60; // 5 minutes

struct TestData {
    env: HostEnv,
    escrow: EscrowHostRef,
    mock_cep18: BigCoinHostRef,
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
    assert!(test_data.env.emitted_event(
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
fn test_pay_invoice_should_fail_if_attached_cspr_value_is_invalid_for_invoice_in_native_token() {
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

    assert!(test_data.env.emitted_event(
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

    assert!(test_data.env.emitted_event(
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
    let mock_cep18 = BigCoin::deploy(
        &env,
        BigCoinInitArgs {
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
        amount_due: CurrencyAmount::new(None, U256::from_dec_str("1000000000000000000").unwrap()),
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

    assert!(test_data.env.emitted_event(
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
