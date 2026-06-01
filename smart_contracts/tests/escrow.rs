use odra::{
    casper_types::{U256, U512},
    host::{Deployer, HostEnv, HostRef},
    prelude::{Address, Addressable},
    uints::ToU512,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::big_coin::{BigCoin, BigCoinHostRef, BigCoinInitArgs};
use leasefi_contracts::common::CurrencyAmount;
use leasefi_contracts::escrow::{
    errors::Error,
    events::{InvoiceCreated, InvoicePaid, InvoicePaymentApplied, MinDeadlineSet},
    types::{CreateLeaseInvoiceParams, Invoice, InvoiceKind},
    Escrow, EscrowHostRef, EscrowInitArgs,
};

use crate::escrow::events::{SecurityDepositHeld, SecurityDepositReleased};

const MIN_DEADLINE: u64 = 5 * 60; // 5 minutes

// =============================================================================
// Test Context
// =============================================================================

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
    escrow.set_security_deposit_token(mock_cep18.address());

    TestData {
        env,
        escrow,
        mock_cep18,
    }
}

// =============================================================================
// Helpers
// =============================================================================

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

    let invoice_id = test_data
        .escrow
        .create_lease_invoice(CreateLeaseInvoiceParams {
            tenant: params.tenant,
            landlord: params.landlord,
            rent: params.amount_due,
            property_manager: None,
            property_manager_bps: 0,
            deadline: params.deadline,
        });

    test_data.env.set_caller(test_data.env.get_account(0));

    assert!(test_data.env.emitted_event(
        &test_data.escrow,
        InvoiceCreated {
            invoice_id,
            created_at: test_data.env.block_time(),
        }
    ));

    let mut amount_due = params.amount_due;
    assert_eq!(
        test_data.escrow.get_invoice_by_id(invoice_id),
        Invoice {
            kind: InvoiceKind::Lease,
            buyer: params.tenant,
            seller: params.landlord,
            amount_due: params.amount_due,
            rent_amount: *amount_due.amount(),
            rent_paid: U256::zero(),
            property_manager: None,
            property_manager_bps: 0,
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

fn create_security_deposit_invoice(test_data: &mut TestData, params: &mut InvoiceParams) -> U256 {
    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    let amount_due = CurrencyAmount::new(
        Some(test_data.mock_cep18.address()),
        *params.amount_due.amount(),
    );

    let invoice_id = test_data.escrow.create_security_deposit_invoice(
        params.tenant,
        amount_due,
        params.deadline,
    );

    test_data.env.set_caller(test_data.env.get_account(0));

    invoice_id
}

// =============================================================================
// init()
// =============================================================================

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
    assert_eq!(
        test_data.escrow.get_security_deposit_token_address(),
        test_data.mock_cep18.address(),
        "Invalid security deposit token address"
    );
}

// =============================================================================
// set_min()
// =============================================================================

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

// =============================================================================
// set_lease()
// =============================================================================

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

// =============================================================================
// set_treasury()
// =============================================================================

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

// =============================================================================
// set_security_deposit_token()
// =============================================================================

#[test]
fn test_set_security_deposit_token_should_set_properly() {
    let mut test_data = setup(odra_test::env());
    let token = test_data.env.get_account(10);

    test_data.escrow.set_security_deposit_token(token);

    assert_eq!(
        test_data.escrow.get_security_deposit_token_address(),
        token,
        "Invalid security deposit token address",
    )
}

#[test]
fn test_set_security_deposit_token_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    test_data.env.set_caller(test_data.env.get_account(1));

    assert_eq!(
        test_data
            .escrow
            .try_set_security_deposit_token(test_data.env.get_account(1))
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when called by non-owner",
    )
}

// =============================================================================
// create_lease_invoice()
// =============================================================================

#[test]
fn test_create_lease_invoice_should_fail_if_not_lease_contract_is_calling() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .escrow
            .try_create_lease_invoice(CreateLeaseInvoiceParams {
                tenant: test_data.env.get_account(0),
                landlord: test_data.env.get_account(0),
                rent: CurrencyAmount::new(None, U256::zero()),
                property_manager: None,
                property_manager_bps: 0,
                deadline: 0,
            })
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
            .try_create_lease_invoice(CreateLeaseInvoiceParams {
                tenant: test_data.env.get_account(0),
                landlord: test_data.env.get_account(0),
                rent: CurrencyAmount::new(None, U256::one()),
                property_manager: None,
                property_manager_bps: 0,
                deadline: 0,
            })
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
            .try_create_lease_invoice(CreateLeaseInvoiceParams {
                tenant: test_data.env.get_account(0),
                landlord: test_data.env.get_account(1),
                rent: CurrencyAmount::new(None, U256::zero()),
                property_manager: None,
                property_manager_bps: 0,
                deadline: 0,
            })
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
            .try_create_lease_invoice(CreateLeaseInvoiceParams {
                tenant: test_data.env.get_account(0),
                landlord: test_data.env.get_account(1),
                rent: CurrencyAmount::new(None, U256::one()),
                property_manager: None,
                property_manager_bps: 0,
                deadline: test_data.env.block_time() + test_data.escrow.get_min_deadline() - 1,
            })
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

// =============================================================================
// pay_invoice()
// =============================================================================

#[test]
fn test_pay_invoice_should_fail_if_invoice_does_not_exist() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .escrow
            .try_pay_invoice(U256::zero(), U256::zero())
            .unwrap_err(),
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
        test_data
            .escrow
            .try_pay_invoice(invoice_id, U256::zero())
            .unwrap_err(),
        Error::CallerIsNotBuyer.into(),
        "Should revert when caller is not buyer"
    );
}

#[test]
fn test_pay_invoice_should_fail_if_invoice_is_already_paid() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);
    let invoice_id = create_lease_invoice(&mut test_data, &params);

    let rent = *params.amount_due.amount();
    let amount = rent + rent / U256::from(49u32);

    test_data
        .escrow
        .with_tokens(amount.to_u512())
        .pay_invoice(invoice_id, amount);

    assert_eq!(
        test_data
            .escrow
            .try_pay_invoice(invoice_id, U256::zero())
            .unwrap_err(),
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
        test_data
            .escrow
            .try_pay_invoice(invoice_id, U256::zero())
            .unwrap_err(),
        Error::InvoiceIsExpired.into(),
        "Should revert when invoice is expired"
    );
}

#[test]
fn test_pay_invoice_should_fail_if_attached_cspr_value_is_invalid_for_invoice_in_native_token() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);
    let invoice_id = create_lease_invoice(&mut test_data, &params);

    let amount = *params.amount_due.amount();

    assert_eq!(
        test_data
            .escrow
            .with_tokens(U512::zero())
            .try_pay_invoice(invoice_id, amount)
            .unwrap_err(),
        Error::InvalidAmountAttached.into(),
        "Should revert when attached CSPR value is invalid - 1"
    );
    assert_eq!(
        test_data
            .escrow
            .with_tokens(U512::zero())
            .try_pay_invoice(invoice_id, U256::one())
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
            .try_pay_invoice(invoice_id, *params.amount_due.amount())
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

    let rent = *params.amount_due.amount();
    let amount = rent + rent / U256::from(49u32);

    test_data
        .escrow
        .with_tokens(amount.to_u512())
        .pay_invoice(invoice_id, amount);

    let curr_recipient_token_balance = test_data.env.balance_of(&params.landlord);

    let protocol_fee = amount * U256::from(200u32) / U256::from(10000u32);
    let rent_allocation = amount - protocol_fee;

    assert!(test_data.env.emitted_event(
        &test_data.escrow,
        InvoicePaymentApplied {
            invoice_id,
            payer: params.tenant,
            amount,
            protocol_fee,
            rent_paid: rent_allocation,
        }
    ));

    assert!(test_data.env.emitted_event(
        &test_data.escrow,
        InvoicePaid {
            invoice_id,
            paid_at: test_data.env.block_time(),
        }
    ));

    assert_eq!(
        curr_recipient_token_balance,
        prev_recipient_token_balance + rent_allocation.to_u512(),
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

    let rent = *params.amount_due.amount();
    let amount = rent + rent / U256::from(49u32);

    test_data
        .mock_cep18
        .approve(&test_data.escrow.address(), &amount);
    test_data.escrow.pay_invoice(invoice_id, amount);

    let curr_recipient_token_balance = test_data.mock_cep18.balance_of(&params.landlord);

    let protocol_fee = amount * U256::from(200u32) / U256::from(10000u32);
    let rent_allocation = amount - protocol_fee;

    assert!(test_data.env.emitted_event(
        &test_data.escrow,
        InvoicePaymentApplied {
            invoice_id,
            payer: params.tenant,
            amount,
            protocol_fee,
            rent_paid: rent_allocation,
        }
    ));
    assert!(test_data.env.emitted_event(
        &test_data.escrow,
        InvoicePaid {
            invoice_id,
            paid_at: test_data.env.block_time(),
        }
    ));
    assert_eq!(
        curr_recipient_token_balance,
        prev_recipient_token_balance + rent_allocation,
        "Invalid current recipient balance"
    );
    assert!(
        test_data.escrow.get_invoice_by_id(invoice_id).is_paid,
        "Invoice should be marked as paid after successful payment"
    );
}

#[test]
fn test_pay_invoice_should_hold_security_deposit_in_escrow() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);

    let amount = *params.amount_due.amount();
    let invoice_id = create_security_deposit_invoice(&mut test_data, &mut params);
    let previous_escrow_balance = test_data.mock_cep18.balance_of(&test_data.escrow.address());

    test_data
        .mock_cep18
        .approve(&test_data.escrow.address(), &amount);

    test_data.escrow.pay_invoice(invoice_id, amount);

    let deposit = test_data.escrow.get_security_deposit(invoice_id);

    assert_eq!(
        test_data.mock_cep18.balance_of(&test_data.escrow.address()),
        previous_escrow_balance + amount,
        "Escrow should hold the security deposit"
    );

    assert_eq!(deposit.amount, amount, "Invalid held deposit amount");
    assert!(deposit.paid, "Security deposit should be marked paid");
    assert!(!deposit.released, "Security deposit should not be released");
    assert!(test_data.escrow.get_invoice_by_id(invoice_id).is_paid);

    assert!(test_data.env.emitted_event(
        &test_data.escrow,
        SecurityDepositHeld {
            invoice_id,
            tenant: params.tenant,
            amount,
        },
    ));
}

#[test]
fn test_pay_invoice_should_revert_if_security_deposit_payment_is_not_exact() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);

    let amount = *params.amount_due.amount();
    let invoice_id = create_security_deposit_invoice(&mut test_data, &mut params);

    test_data
        .mock_cep18
        .approve(&test_data.escrow.address(), &amount);

    assert_eq!(
        test_data
            .escrow
            .try_pay_invoice(invoice_id, amount - U256::one())
            .unwrap_err(),
        Error::InvalidPaymentAmount.into(),
        "Security deposits should require exact payment",
    );
}

// =============================================================================
// create_security_deposit_invoice()
// =============================================================================

#[test]
fn test_create_security_deposit_invoice_should_revert_if_not_lease_contract_is_calling() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);

    let amount_due = CurrencyAmount::new(
        Some(test_data.mock_cep18.address()),
        *params.amount_due.amount(),
    );

    assert_eq!(
        test_data
            .escrow
            .try_create_security_deposit_invoice(params.tenant, amount_due, params.deadline,)
            .unwrap_err(),
        Error::CallerNotLeaseContract.into(),
        "Should revert when caller is not the Lease contract",
    );
}

#[test]
fn test_create_security_deposit_invoice_should_revert_if_currency_is_not_security_deposit_token() {
    let mut test_data = setup(odra_test::env());
    let params = generate_invoice_params(&test_data);

    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    assert_eq!(
        test_data
            .escrow
            .try_create_security_deposit_invoice(params.tenant, params.amount_due, params.deadline,)
            .unwrap_err(),
        Error::InvalidSecurityDepositCurrency.into(),
        "Should require configured security deposit token"
    );
}

#[test]
fn test_create_security_deposit_invoice_should_create_invoice_properly() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);

    let amount_due = CurrencyAmount::new(
        Some(test_data.mock_cep18.address()),
        *params.amount_due.amount(),
    );

    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    let invoice_id = test_data.escrow.create_security_deposit_invoice(
        params.tenant,
        amount_due,
        params.deadline,
    );

    assert_eq!(
        test_data.escrow.get_invoice_by_id(invoice_id),
        Invoice {
            kind: InvoiceKind::SecurityDeposit,
            buyer: params.tenant,
            seller: test_data.escrow.get_lease_contract_address(),
            amount_due,
            rent_amount: U256::zero(),
            rent_paid: U256::zero(),
            property_manager: None,
            property_manager_bps: 0,
            deadline: params.deadline,
            is_paid: false,
        },
        "Invalid security deposit invoice"
    );
}

// =============================================================================
// release_security_deposit_invoice()
// =============================================================================

#[test]
fn test_release_security_deposit_should_revert_if_not_lease_contract_is_calling() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);

    let amount = *params.amount_due.amount();
    let invoice_id = create_security_deposit_invoice(&mut test_data, &mut params);

    test_data
        .mock_cep18
        .approve(&test_data.escrow.address(), &amount);

    test_data.escrow.pay_invoice(invoice_id, amount);

    assert_eq!(
        test_data
            .escrow
            .try_release_security_deposit(invoice_id, params.landlord, U256::zero())
            .unwrap_err(),
        Error::CallerNotLeaseContract.into(),
        "Only the Lease contract should release deposits",
    );
}

#[test]
fn test_release_security_deposit_should_revert_if_invoice_is_not_security_deposit() {
    let mut test_data = setup(odra_test::env());
    let params = generate_invoice_params(&test_data);
    let invoice_id = create_lease_invoice(&mut test_data, &params);

    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    assert_eq!(
        test_data
            .escrow
            .try_release_security_deposit(invoice_id, params.landlord, U256::zero())
            .unwrap_err(),
        Error::InvalidInvoiceKind.into(),
        "Should only release security deposit invoices",
    );
}

#[test]
fn test_release_security_deposit_should_revert_if_deposit_is_not_paid() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);
    let invoice_id = create_security_deposit_invoice(&mut test_data, &mut params);

    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    assert_eq!(
        test_data
            .escrow
            .try_release_security_deposit(invoice_id, params.landlord, U256::zero())
            .unwrap_err(),
        Error::SecurityDepositNotPaid.into(),
        "Should not release unpaid security deposit",
    );
}

#[test]
fn test_release_security_deposit_should_revert_if_charge_is_too_high() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);
    let amount = *params.amount_due.amount();
    let invoice_id = create_security_deposit_invoice(&mut test_data, &mut params);

    test_data
        .mock_cep18
        .approve(&test_data.escrow.address(), &amount);

    test_data.escrow.pay_invoice(invoice_id, amount);

    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    assert_eq!(
        test_data
            .escrow
            .try_release_security_deposit(invoice_id, params.landlord, amount + U256::one(),)
            .unwrap_err(),
        Error::SecurityDepositChargeTooHigh.into(),
        "Charge cannot exceed security deposit",
    );
}

#[test]
fn test_release_security_deposit_should_split_charge_and_refund() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);

    let amount = *params.amount_due.amount();
    let landlord_charge = amount / U256::from(4u32);
    let tenant_refund = amount - landlord_charge;

    let invoice_id = create_security_deposit_invoice(&mut test_data, &mut params);

    let previous_landlord_balance = test_data.mock_cep18.balance_of(&params.landlord);
    let previous_tenant_balance = test_data.mock_cep18.balance_of(&params.tenant);

    test_data
        .mock_cep18
        .approve(&test_data.escrow.address(), &amount);

    test_data.escrow.pay_invoice(invoice_id, amount);

    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    test_data
        .escrow
        .release_security_deposit(invoice_id, params.landlord, landlord_charge);

    let deposit = test_data.escrow.get_security_deposit(invoice_id);

    assert!(deposit.released, "Security deposit should be released");
    assert_eq!(deposit.landlord_charge, landlord_charge);
    assert_eq!(deposit.tenant_refund, tenant_refund);

    assert_eq!(
        test_data.mock_cep18.balance_of(&params.landlord),
        previous_landlord_balance + landlord_charge,
        "Invalid landlord balance",
    );

    assert_eq!(
        test_data.mock_cep18.balance_of(&params.tenant),
        previous_tenant_balance - landlord_charge,
        "Invalid tenant balance after deposit and refund",
    );

    assert!(test_data.env.emitted_event(
        &test_data.escrow,
        SecurityDepositReleased {
            invoice_id,
            landlord: params.landlord,
            tenant: params.tenant,
            landlord_charge,
            tenant_refund,
        },
    ));
}

#[test]
fn test_release_security_deposit_should_revert_if_already_released() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_invoice_params(&test_data);
    let amount = *params.amount_due.amount();
    let invoice_id = create_security_deposit_invoice(&mut test_data, &mut params);

    test_data
        .mock_cep18
        .approve(&test_data.escrow.address(), &amount);

    test_data.escrow.pay_invoice(invoice_id, amount);

    test_data
        .env
        .set_caller(test_data.escrow.get_lease_contract_address());

    test_data
        .escrow
        .release_security_deposit(invoice_id, params.landlord, U256::zero());

    assert_eq!(
        test_data
            .escrow
            .try_release_security_deposit(invoice_id, params.landlord, U256::zero(),)
            .unwrap_err(),
        Error::SecurityDepositAlreadyReleased.into(),
        "Security deposit should not be released twice",
    );
}
