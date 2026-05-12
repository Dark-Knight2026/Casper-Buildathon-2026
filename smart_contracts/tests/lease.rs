use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv, HostRef},
    prelude::*,
    uints::ToU512,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::common::CurrencyAmount;
use leasefi_contracts::constants::ONE_MONTH_IN_SECONDS;
use leasefi_contracts::escrow::{
    types::{Invoice, InvoiceKind},
    Escrow, EscrowHostRef, EscrowInitArgs,
};
use leasefi_contracts::lease::{
    errors::Error,
    events::{
        EquityEligibilityGranted, LeaseAgreementCreated, LeaseAgreementFinished,
        LeaseAgreementProlonged,
    },
    types::{CreateLeaseAgreementParams, LeaseAgreement},
    Lease, LeaseHostRef, LeaseInitArgs,
};
use leasefi_contracts::nft::{errors::Error as NftError, types::NFTInitParams};
use leasefi_contracts::roles::{Roles, RolesHostRef, RolesInitArgs};

use crate::{
    lease::types::LeaseEquityOption,
    nft::{NFTHostRef, NFTInitArgs, NFT},
};

// =============================================================================
// Test Context
// =============================================================================

struct TestData {
    env: HostEnv,
    roles: RolesHostRef,
    lease: LeaseHostRef,
    escrow: EscrowHostRef,
    nft: NFTHostRef,
    landlord: Address,
}

fn setup(env: HostEnv) -> TestData {
    let mut roles = Roles::deploy(
        &env,
        RolesInitArgs {
            admin: env.get_account(0),
        },
    );

    let mut lease = Lease::deploy(
        &env,
        LeaseInitArgs {
            owner: env.get_account(0),
        },
    );

    let mut escrow = Escrow::deploy(
        &env,
        EscrowInitArgs {
            owner: env.get_account(0),
            min_deadline: 5 * 60, // 5 minutes
        },
    );

    let mut nft = NFT::deploy(
        &env,
        NFTInitArgs {
            params: NFTInitParams {
                owner: env.get_account(0),
                symbol: String::from("LEASE"),
                name: String::from("LEASE"),
                minters: vec![lease.address()],
                burners: vec![],
                whitelist_managers: vec![env.get_account(0)],
                freezers: vec![lease.address()],
                force_transferers: vec![],
            },
        },
    );

    let landlord = env.get_account(14);

    lease.set_escrow(escrow.address());
    lease.set_roles(roles.address());
    lease.set_nft(nft.address());

    escrow.set_lease(lease.address());
    escrow.set_treasury(env.get_account(19));

    nft.add_to_whitelist(&env.get_account(0));

    roles.grant_role(
        &roles.get_role_admin(&roles.get_landlord_role()),
        &env.get_account(0),
    );
    roles.grant_role(&roles.get_landlord_role(), &landlord);

    env.set_caller(landlord);

    TestData {
        env,
        roles,
        lease,
        escrow,
        nft,
        landlord,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn generate_lease_agreement_creation_params(test_data: &TestData) -> CreateLeaseAgreementParams {
    CreateLeaseAgreementParams {
        tenant: test_data.env.get_account(0),
        equity_option: None,
        monthly_rent: CurrencyAmount::new(None, U256::from_dec_str("250000000000000000").unwrap()),
        security_deposit: CurrencyAmount::new(
            None,
            U256::from_dec_str("5000000000000000000").unwrap(),
        ),
        start: test_data.env.block_time(),
        end: test_data.env.block_time() + (ONE_MONTH_IN_SECONDS * 12),
        invoice_validity_duration: test_data.escrow.get_min_deadline(),
    }
}

fn pay_all_lease_agreement_invoices(test_data: &mut TestData, lease_agreement_id: &U256) {
    let mut lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(lease_agreement_id);

    test_data.env.set_caller(lease_agreement.tenant);
    test_data
        .escrow
        .with_tokens(lease_agreement.security_deposit.amount().to_u512())
        .pay_invoice(lease_agreement.invoices_ids[0]);

    for invoice_id in lease_agreement.invoices_ids.iter().skip(1) {
        test_data
            .escrow
            .with_tokens(lease_agreement.monthly_rent.amount().to_u512())
            .pay_invoice(*invoice_id);
    }

    test_data.env.set_caller(lease_agreement.landlord);

    assert!(
        test_data.lease.is_security_deposit_paid(lease_agreement_id),
        "Security deposit invoice should been paid"
    );
    assert!(
        test_data.lease.is_all_invoices_paid(lease_agreement_id),
        "All invoices should been paid"
    );
}

// =============================================================================
// init()
// =============================================================================

#[test]
fn test_init_should_initialize_contract_properly() {
    let test_data = setup(odra_test::env());

    assert_eq!(
        test_data.lease.get_owner(),
        test_data.env.get_account(0),
        "Invalid owner"
    );
    assert_eq!(
        test_data.lease.get_roles_contract_address(),
        test_data.roles.address(),
        "Invalid Roles contract address"
    );
    assert_eq!(
        test_data.lease.get_escrow_contract_address(),
        test_data.escrow.address(),
        "Invalid Escrow contract address"
    );
    assert_eq!(
        test_data.lease.get_lease_agreements_count(),
        U256::zero(),
        "Invalid initial lease agreements count"
    );
}

// =============================================================================
// set_roles()
// =============================================================================

#[test]
fn test_set_roles_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .lease
            .try_set_roles(test_data.env.get_account(1))
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_roles_should_set_roles_properly() {
    let mut test_data = setup(odra_test::env());
    let roles = test_data.env.get_account(10);

    test_data.env.set_caller(test_data.env.get_account(0));
    test_data.lease.set_roles(roles);

    assert_eq!(
        test_data.lease.get_roles_contract_address(),
        roles,
        "Invalid Roles contract address"
    );
}

// =============================================================================
// set_escrow()
// =============================================================================

#[test]
fn test_set_escrow_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .lease
            .try_set_escrow(test_data.env.get_account(1))
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_escrow_should_set_escrow_properly() {
    let mut test_data = setup(odra_test::env());
    let escrow = test_data.env.get_account(10);

    test_data.env.set_caller(test_data.env.get_account(0));
    test_data.lease.set_escrow(escrow);

    assert_eq!(
        test_data.lease.get_escrow_contract_address(),
        escrow,
        "Invalid Escrow contract address"
    );
}

// =============================================================================
// set_nft()
// =============================================================================

#[test]
fn test_set_nft_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .lease
            .try_set_nft(test_data.env.get_account(1))
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_nft_should_set_escrow_properly() {
    let mut test_data = setup(odra_test::env());
    let nft = test_data.env.get_account(10);

    test_data.env.set_caller(test_data.env.get_account(0));
    test_data.lease.set_nft(nft);

    assert_eq!(
        test_data.lease.get_nft_contract_address(),
        nft,
        "Invalid NFT contract address"
    );
}

// =============================================================================
// create_lease_agreement()
// =============================================================================

#[test]
fn test_create_lease_agreement_should_fail_if_not_landlord_is_calling() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);

    test_data.env.set_caller(test_data.env.get_account(0));

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::CallerNotLandlord.into(),
        "Should revert when is called by not a landlord"
    );
}

#[test]
fn test_create_lease_agreement_should_fail_if_tenant_is_equal_to_landlord() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_lease_agreement_creation_params(&test_data);

    params.tenant = test_data.landlord;

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::EqualTenantAndLandlord.into(),
        "Should revert when tenant is the same as landlord"
    );
}

#[test]
fn test_create_lease_agreement_should_fail_if_lease_agreement_end_timestamp_is_lte_start_timestamp()
{
    let mut test_data = setup(odra_test::env());
    let mut params = generate_lease_agreement_creation_params(&test_data);

    params.start = params.end;

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params.clone())
            .unwrap_err(),
        Error::InvalidTimeframes.into(),
        "Should revert when lease agreement end timestamp is less than or equal to start timestamp - 1"
    );

    params.start = params.end + 1;

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidTimeframes.into(),
        "Should revert when lease agreement end timestamp is less than or equal to start timestamp - 2"
    );
}

#[test]
fn test_create_lease_agreement_should_fail_if_lease_duration_is_not_even_to_n_months() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_lease_agreement_creation_params(&test_data);

    params.start = params.end - 1;

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidTimeframes.into(),
        "Should revert when lease agreement duration is not even to N months"
    );
}

#[test]
fn test_create_lease_agreement_should_fail_if_tenant_is_not_whitelisted() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_lease_agreement_creation_params(&test_data);

    params.tenant = test_data.env.get_account(1);

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        NftError::CannotTransact.into(),
        "Should revert if tenant is not whitelisted to transact",
    );
}

#[test]
fn test_create_lease_agreement_should_fail_if_monthly_rent_amount_is_zero() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_lease_agreement_creation_params(&test_data);

    *params.monthly_rent.amount() = U256::zero();

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::ZeroAmount.into(),
        "Should revert when monthly rent amount is zero"
    );
}

#[test]
fn test_create_lease_agreement_should_create_lease_agreement_properly() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);

    let expected_token_id = test_data.nft.get_tokens_count();

    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    assert_eq!(
        lease_agreement.token_id, expected_token_id,
        "Lease agreement token ID should match expected token ID"
    );
    assert_eq!(
        test_data.nft.owner_of(expected_token_id),
        Some(params.tenant),
        "NFT should be minted to tenant",
    );
    assert!(test_data.env.emitted_event(
        &test_data.lease,
        LeaseAgreementCreated {
            lease_agreement_id,
            created_at: test_data.env.block_time(),
        }
    ));
    assert_eq!(
        lease_agreement_id,
        U256::zero(),
        "Invalid lease agreement id"
    );
    assert_eq!(
        test_data.lease.get_lease_agreements_count(),
        U256::one(),
        "Invalid lease agreements count"
    );
    assert!(
        !test_data
            .lease
            .is_security_deposit_paid(&lease_agreement_id),
        "Security deposit should be unpaid at lease agreement creation"
    );
    assert!(
        !test_data.lease.is_all_invoices_paid(&lease_agreement_id),
        "All invoices should be unpaid at lease agreement creation"
    );
    assert_eq!(
        lease_agreement,
        LeaseAgreement {
            tenant: params.tenant,
            landlord: test_data.landlord,
            equity_option: None,
            monthly_rent: params.monthly_rent,
            security_deposit: params.security_deposit,
            invoices_ids: (0..=12).map(U256::from).collect(),
            start: params.start,
            end: params.end,
            is_finished: false,
            token_id: expected_token_id,
        },
        "Invalid lease agreement"
    );
    assert_eq!(
        test_data
            .escrow
            .get_invoice_by_id(lease_agreement.invoices_ids[0]),
        Invoice {
            kind: InvoiceKind::SecurityDeposit,
            buyer: params.tenant,
            seller: test_data.lease.address(),
            amount_due: params.security_deposit,
            deadline: test_data.env.block_time() + params.invoice_validity_duration,
            is_paid: false
        },
        "Invalid security deposit invoice"
    );

    for i in 1..lease_agreement.invoices_ids.len() {
        let invoice = test_data
            .escrow
            .get_invoice_by_id(lease_agreement.invoices_ids[i]);

        assert_eq!(
            invoice,
            Invoice {
                kind: InvoiceKind::Lease,
                buyer: params.tenant,
                seller: test_data.landlord,
                amount_due: params.monthly_rent,
                deadline: test_data.env.block_time()
                    + (ONE_MONTH_IN_SECONDS * (i - 1) as u64)
                    + params.invoice_validity_duration,
                is_paid: false
            },
            "Invalid lease payment invoice - {}",
            i
        );
    }
}

#[test]
fn test_create_lease_agreement_with_equity_option_should_mark_tenant_equity_eligible() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_lease_agreement_creation_params(&test_data);
    let property_id = U256::from(77);

    params.equity_option = Some(LeaseEquityOption { property_id });

    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    assert_eq!(
        lease_agreement.equity_option, params.equity_option,
        "Lease should store the equity option",
    );

    assert!(
        test_data
            .lease
            .is_equity_eligible(property_id, params.tenant),
        "Tenant should be equity eligible for the property",
    );

    assert!(test_data.env.emitted_event(
        &test_data.lease,
        EquityEligibilityGranted {
            property_id,
            account: params.tenant,
        }
    ));

    assert!(
        !test_data
            .lease
            .is_equity_eligible(property_id + U256::one(), params.tenant),
        "Tenant should not be equity eligible for a different property",
    );

    assert!(
        !test_data
            .lease
            .is_equity_eligible(property_id, test_data.env.get_account(1)),
        "A different account should not be equity eligible",
    );
}

#[test]
fn test_create_lease_agreement_without_equity_option_should_not_mark_tenant_equity_eligible() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let property_id = U256::from(77);

    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    assert_eq!(
        lease_agreement.equity_option, None,
        "Lease should not store an equity options",
    );

    assert!(
        !test_data
            .lease
            .is_equity_eligible(property_id, params.tenant),
        "Tenant should not be equity eligible without an equity options",
    );
}

// =============================================================================
// finalize_lease_agreement()
// =============================================================================

#[test]
fn test_finalize_lease_agreement_should_fail_if_lease_agreement_does_not_exist() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .lease
            .try_finalize_lease_agreement(&U256::zero(), &U256::zero())
            .unwrap_err(),
        Error::InvalidLeaseAgreementId.into(),
        "Should revert when lease agreement does not exist"
    );
}

#[test]
fn test_finalize_lease_agreement_should_fail_if_invalid_landlord_is_calling() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);

    test_data.env.set_caller(test_data.env.get_account(0));

    assert_eq!(
        test_data
            .lease
            .try_finalize_lease_agreement(&lease_agreement_id, &U256::zero())
            .unwrap_err(),
        Error::InvalidLandlord.into(),
        "Should revert when not lease agreement landlord-creator is calling"
    );
}

#[test]
fn test_finalize_lease_agreement_should_fail_if_lease_agreement_has_not_finished_yet() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);

    assert_eq!(
        test_data
            .lease
            .try_finalize_lease_agreement(&lease_agreement_id, &U256::zero())
            .unwrap_err(),
        Error::LeaseAgreementHasNotFinishedYet.into(),
        "Should revert when lease agreement has not finished yet"
    );
}

#[test]
fn test_finalize_lease_agreement_should_fail_if_not_all_invoices_are_paid() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);

    test_data
        .env
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_SECONDS * 12));

    assert_eq!(
        test_data
            .lease
            .try_finalize_lease_agreement(&lease_agreement_id, &U256::zero())
            .unwrap_err(),
        Error::NotAllInvoicesArePaid.into(),
        "Should revert when not all invoices are paid"
    );
}

#[test]
fn test_finalize_lease_agreement_should_finalize_properly_when_all_invoices_paid() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());

    pay_all_lease_agreement_invoices(&mut test_data, &lease_agreement_id);

    test_data
        .env
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_SECONDS * 12));
    test_data
        .lease
        .finalize_lease_agreement(&lease_agreement_id, &U256::zero());

    let lease_agreement_after = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    assert!(
        lease_agreement_after.is_finished,
        "Lease should be finished"
    );
    assert!(test_data.env.emitted_event(
        &test_data.lease,
        LeaseAgreementFinished {
            lease_agreement_id,
            finished_at: test_data.env.block_time(),
        }
    ));
}

// =============================================================================
// prolong_lease_agreement()
// =============================================================================

#[test]
fn test_prolong_lease_agreement_should_fail_if_lease_agreement_does_not_exist() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(&U256::zero(), 0, 0)
            .unwrap_err(),
        Error::InvalidLeaseAgreementId.into(),
        "Should revert when lease agreement does not exist"
    );
}

#[test]
fn test_prolong_lease_agreement_should_fail_if_invalid_landlord_is_calling() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);

    test_data.env.set_caller(test_data.env.get_account(0));

    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(&lease_agreement_id, 0, 0)
            .unwrap_err(),
        Error::InvalidLandlord.into(),
        "Should revert when not lease agreement landlord-creator is calling"
    );
}

#[test]
fn test_prolong_lease_agreement_should_fail_if_lease_not_finished_yet() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);

    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(&lease_agreement_id, 0, 0)
            .unwrap_err(),
        Error::LeaseAgreementHasNotFinishedYet.into(),
        "Should revert when lease agreement has not finished yet"
    );
}

#[test]
fn test_prolong_lease_agreement_should_fail_if_not_all_invoices_are_paid() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);

    test_data
        .env
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_SECONDS * 12));

    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(&lease_agreement_id, 0, 0)
            .unwrap_err(),
        Error::NotAllInvoicesArePaid.into(),
        "Should revert when not all invoices are paid"
    );
}

#[test]
fn test_prolong_lease_agreement_should_fail_if_new_end_timestamp_is_lte_previous_end_timestamp() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    pay_all_lease_agreement_invoices(&mut test_data, &lease_agreement_id);

    test_data
        .env
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_SECONDS * 12));

    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(&lease_agreement_id, lease_agreement.end, 0)
            .unwrap_err(),
        Error::InvalidTimeframes.into(),
        "Should revert when lease agreement new end timestamp is less than or equal to previous end timestamp - 1"
    );
    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(&lease_agreement_id, lease_agreement.end - 1, 0)
            .unwrap_err(),
        Error::InvalidTimeframes.into(),
        "Should revert when lease agreement new end timestamp is less than or equal to previous end timestamp - 2"
    );
}

#[test]
fn test_prolong_lease_agreement_should_fail_if_new_lease_duration_is_not_even_to_n_months() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    pay_all_lease_agreement_invoices(&mut test_data, &lease_agreement_id);

    test_data
        .env
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_SECONDS * 12));

    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(&lease_agreement_id, lease_agreement.end + 1, 0)
            .unwrap_err(),
        Error::InvalidTimeframes.into(),
        "Should revert when new lease agreement duration is not even to N months"
    );
}

#[test]
fn test_prolong_lease_agreement_should_prolong_lease_agreement_and_create_new_invoices() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement_before = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    pay_all_lease_agreement_invoices(&mut test_data, &lease_agreement_id);

    test_data.env.advance_block_time(params.end);

    let new_end = params.end + (ONE_MONTH_IN_SECONDS * 24);
    let old_invoices_len = lease_agreement_before.invoices_ids.len();

    test_data.lease.prolong_lease_agreement(
        &lease_agreement_id,
        new_end,
        test_data.escrow.get_min_deadline(),
    );

    assert!(test_data.env.emitted_event(
        &test_data.lease,
        LeaseAgreementProlonged {
            lease_agreement_id,
            prolonged_at: test_data.env.block_time(),
        }
    ));

    let lease_agreement_after = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    assert_eq!(
        lease_agreement_after.end, new_end,
        "Lease end should be updated"
    );
    assert_eq!(
        lease_agreement_after.invoices_ids.len(),
        old_invoices_len + 24,
        "Should create invoices for prolonged period"
    );

    for (n, i) in (13..lease_agreement_after.invoices_ids.len()).enumerate() {
        let invoice = test_data
            .escrow
            .get_invoice_by_id(lease_agreement_after.invoices_ids[i]);

        assert_eq!(
            invoice,
            Invoice {
                kind: InvoiceKind::Lease,
                buyer: params.tenant,
                seller: test_data.landlord,
                amount_due: params.monthly_rent,
                deadline: test_data.env.block_time()
                    + (ONE_MONTH_IN_SECONDS * n as u64)
                    + params.invoice_validity_duration,
                is_paid: false
            },
            "Invalid prolonged lease payment invoice - {}",
            i
        );
    }
}
