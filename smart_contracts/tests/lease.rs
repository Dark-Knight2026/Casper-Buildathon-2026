use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv, HostRef},
    prelude::*,
    uints::ToU512,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::big_coin::{BigCoin, BigCoinHostRef, BigCoinInitArgs};
use leasefi_contracts::common::CurrencyAmount;
use leasefi_contracts::constants::ONE_MONTH_IN_MILLISECONDS;
use leasefi_contracts::escrow::{
    types::{Invoice, InvoiceKind},
    Escrow, EscrowHostRef, EscrowInitArgs,
};
use leasefi_contracts::lease::{
    errors::Error,
    events::{
        LeaseAgreementCreated, LeaseAgreementFinished, LeaseAgreementProlonged,
        LeaseNftRecovered,
    },
    types::{CreateLeaseAgreementParams, LeaseAgreement, RentDistributionTerms},
    Lease, LeaseHostRef, LeaseInitArgs,
};
use leasefi_contracts::nft::{errors::Error as NftError, events::Frozen, types::NFTInitParams};
use leasefi_contracts::property_registry::{
    types::{CreatePropertyParams, PropertyStatus},
    PropertyRegistry, PropertyRegistryHostRef, PropertyRegistryInitArgs,
};
use leasefi_contracts::user_registry::{
    UserRegistry, UserRegistryHostRef, UserRegistryInitArgs, ROLE_FLAG_LANDLORD,
    ROLE_FLAG_PROPERTY_MANAGER, ROLE_FLAG_TENANT,
};

use crate::nft::{NFTHostRef, NFTInitArgs, NFT};

// =============================================================================
// Test Context
// =============================================================================

struct TestData {
    env: HostEnv,
    user_registry: UserRegistryHostRef,
    lease: LeaseHostRef,
    escrow: EscrowHostRef,
    nft: NFTHostRef,
    property_registry: PropertyRegistryHostRef,
    security_deposit_token: BigCoinHostRef,
    landlord: Address,
    landlord_id: U256,
    tenant_id: U256,
    unwhitelisted_tenant_id: U256,
    default_property_id: U256,
}

fn setup(env: HostEnv) -> TestData {
    let mut user_registry = UserRegistry::deploy(
        &env,
        UserRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    let mut escrow = Escrow::deploy(
        &env,
        EscrowInitArgs {
            owner: env.get_account(0),
            min_deadline: 5 * 60, // 5 minutes
            user_registry: user_registry.address(),
        },
    );

    let mut security_deposit_token = BigCoin::deploy(
        &env,
        BigCoinInitArgs {
            symbol: String::from("USDC"),
            name: String::from("USDC"),
            decimals: 18,
            initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
        },
    );

    let mut property_registry = PropertyRegistry::deploy(
        &env,
        PropertyRegistryInitArgs {
            owner: env.get_account(0),
            user_registry: user_registry.address(),
        },
    );

    let mut nft = NFT::deploy(
        &env,
        NFTInitArgs {
            params: NFTInitParams {
                owner: env.get_account(0),
                symbol: String::from("LEASE"),
                name: String::from("LEASE"),
                minters: vec![],
                burners: vec![],
                whitelist_managers: vec![env.get_account(0)],
                freezers: vec![],
                force_transferers: vec![],
            },
        },
    );

    let lease = Lease::deploy(
        &env,
        LeaseInitArgs {
            owner: env.get_account(0),
            escrow: escrow.address(),
            nft: nft.address(),
            property_registry: property_registry.address(),
            user_registry: user_registry.address(),
        },
    );

    let tenant_wallet = env.get_account(1);
    let landlord = env.get_account(14);

    // Register users (property manager = account 0, tenant, landlord, and an unwhitelisted tenant for negative test)
    user_registry.grant_role(&user_registry.identity_manager_role(), &env.get_account(0));
    let _pm_id =
        user_registry.create_user([10u8; 32], env.get_account(0), ROLE_FLAG_PROPERTY_MANAGER);
    let tenant_id = user_registry.create_user([12u8; 32], tenant_wallet, ROLE_FLAG_TENANT);
    let landlord_id = user_registry.create_user([14u8; 32], landlord, ROLE_FLAG_LANDLORD);
    let unwhitelisted_tenant_wallet = env.get_account(15);
    let unwhitelisted_tenant_id =
        user_registry.create_user([15u8; 32], unwhitelisted_tenant_wallet, ROLE_FLAG_TENANT);

    // Fund tenant (and landlord) with security_deposit_token (USDC BigCoin) so that pay_all_lease_agreement_invoices
    // (used by finalize/prolong tests) can approve and pay the security deposit invoice.
    // The initial supply after deploy belongs to owner (account 0).
    env.set_caller(env.get_account(0));
    let fund = U256::from_dec_str("10000000000000000000000").unwrap();
    security_deposit_token.transfer(&tenant_wallet, &fund);
    security_deposit_token.transfer(&landlord, &fund);

    escrow.set_lease(lease.address());
    escrow.set_treasury(env.get_account(19));
    escrow.set_security_deposit_token(security_deposit_token.address());

    nft.add_minter(&lease.address());
    nft.add_freezer(&lease.address());
    nft.add_whitelist_manager(&lease.address());
    nft.add_force_transferer(&lease.address());

    nft.add_to_whitelist(&env.get_account(0));
    nft.add_to_whitelist(&tenant_wallet);
    // Note: unwhitelisted_tenant_wallet is intentionally not whitelisted for nft mint test

    // Register a default active property owned by the landlord so always-on property validation passes.
    env.set_caller(env.get_account(0));
    let default_property_id = property_registry.create_property(CreatePropertyParams {
        issuer: landlord_id,
        total_supply: U256::from(1_000_000),
        metadata_uri: String::from("ipfs://property-default"),
    });
    property_registry.set_property_token(default_property_id, env.get_account(2));
    property_registry.set_property_status(default_property_id, PropertyStatus::Active);

    // Default to landlord wallet so create_lease_agreement tests (and similar) have correct caller
    // for get_caller_landlord() without every test having to set it. Negative tests override as needed.
    env.set_caller(landlord);

    TestData {
        env,
        user_registry,
        lease,
        escrow,
        nft,
        property_registry,
        security_deposit_token,
        landlord,
        landlord_id,
        tenant_id,
        unwhitelisted_tenant_id,
        default_property_id,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn generate_lease_agreement_creation_params(test_data: &TestData) -> CreateLeaseAgreementParams {
    CreateLeaseAgreementParams {
        tenant: test_data.tenant_id,
        rent_distribution_terms: RentDistributionTerms {
            property_manager: None,
            property_manager_bps: 0,
        },
        property_id: test_data.default_property_id,
        monthly_rent: CurrencyAmount::new(None, U256::from_dec_str("250000000000000000").unwrap()),
        security_deposit: CurrencyAmount::new(
            Some(test_data.security_deposit_token.address()),
            U256::from_dec_str("5000000000000000000").unwrap(),
        ),
        start: test_data.env.block_time(),
        end: test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12),
        invoice_validity_duration: test_data.escrow.get_min_deadline(),
    }
}

fn pay_all_lease_agreement_invoices(test_data: &mut TestData, lease_agreement_id: &U256) {
    let mut lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(lease_agreement_id);

    let tenant_wallet = test_data
        .user_registry
        .get_active_wallet(lease_agreement.tenant);
    test_data.env.set_caller(tenant_wallet);

    // Approve escrow to spend security deposit tokens
    test_data.security_deposit_token.approve(
        &test_data.escrow.address(),
        lease_agreement.security_deposit.amount(),
    );
    test_data.escrow.pay_invoice(
        lease_agreement.invoices_ids[0],
        *lease_agreement.security_deposit.amount(),
    );

    for invoice_id in lease_agreement.invoices_ids.iter().skip(1) {
        let rent = *lease_agreement.monthly_rent.amount();
        let amount = rent;
        test_data
            .escrow
            .with_tokens(amount.to_u512())
            .pay_invoice(*invoice_id, amount);
    }

    let landlord_wallet = test_data
        .user_registry
        .get_active_wallet(lease_agreement.landlord);
    test_data.env.set_caller(landlord_wallet);

    assert!(
        test_data.lease.is_security_deposit_paid(lease_agreement_id),
        "Security deposit invoice should been paid"
    );
    assert!(
        test_data.lease.is_all_invoices_paid(lease_agreement_id),
        "All invoices should been paid"
    );
}

fn create_active_property(
    test_data: &mut TestData,
    issuer: U256,
    token_account_index: usize,
) -> U256 {
    test_data.env.set_caller(test_data.env.get_account(0));
    let property_id = test_data
        .property_registry
        .create_property(CreatePropertyParams {
            issuer,
            total_supply: U256::from(1_000_000),
            metadata_uri: String::from("ipfs://property-1"),
        });

    test_data.property_registry.set_property_token(
        property_id,
        test_data.env.get_account(token_account_index),
    );
    test_data
        .property_registry
        .set_property_status(property_id, PropertyStatus::Active);

    test_data.env.set_caller(test_data.landlord);
    property_id
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
        test_data.lease.get_user_registry_contract_address(),
        test_data.user_registry.address(),
        "Invalid UserRegistry contract address"
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
// set_user_registry()
// =============================================================================

#[test]
fn test_set_user_registry_should_revert_if_not_owner_is_calling() {
    let mut test_data = setup(odra_test::env());

    assert_eq!(
        test_data
            .lease
            .try_set_user_registry(test_data.env.get_account(1))
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_user_registry_should_set_user_registry_properly() {
    let mut test_data = setup(odra_test::env());
    let user_registry = test_data.env.get_account(10);

    test_data.env.set_caller(test_data.env.get_account(0));
    test_data.lease.set_user_registry(user_registry);

    assert_eq!(
        test_data.lease.get_user_registry_contract_address(),
        user_registry,
        "Invalid UserRegistry contract address"
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
fn test_set_nft_should_set_nft_properly() {
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

    params.tenant = test_data.landlord_id;

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

    params.tenant = test_data.unwhitelisted_tenant_id;

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
    let mut params = generate_lease_agreement_creation_params(&test_data);

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
        Some(test_data.user_registry.get_active_wallet(params.tenant)),
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
            landlord: test_data.landlord_id,
            rent_distribution_terms: params.rent_distribution_terms,
            property_id: params.property_id,
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
            seller: test_data.landlord_id,
            amount_due: params.security_deposit,
            rent_amount: U256::zero(),
            rent_paid: U256::zero(),
            property_manager: None,
            property_manager_bps: 0,
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
                seller: test_data.landlord_id,
                amount_due: params.monthly_rent,
                rent_amount: *params.monthly_rent.amount(),
                rent_paid: U256::zero(),
                property_manager: None,
                property_manager_bps: 0,
                deadline: test_data.env.block_time()
                    + (ONE_MONTH_IN_MILLISECONDS * (i - 1) as u64)
                    + params.invoice_validity_duration,
                is_paid: false
            },
            "Invalid lease payment invoice - {}",
            i
        );
    }
}

#[test]
fn test_create_lease_agreement_should_fail_if_property_is_not_active() {
    let mut test_data = setup(odra_test::env());

    // Test Draft status (default after create_property)
    let mut params = generate_lease_agreement_creation_params(&test_data);
    test_data.env.set_caller(test_data.env.get_account(0));
    let draft_property_id = test_data
        .property_registry
        .create_property(CreatePropertyParams {
            issuer: test_data.landlord_id,
            total_supply: U256::from(1_000_000),
            metadata_uri: String::from("ipfs://property-draft"),
        });

    test_data.env.set_caller(test_data.landlord);
    params.property_id = draft_property_id;

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidPropertyStatus.into(),
        "Should revert if property is Draft"
    );

    // Test Paused status
    let mut params = generate_lease_agreement_creation_params(&test_data);
    test_data.env.set_caller(test_data.env.get_account(0));
    let paused_property_id = test_data
        .property_registry
        .create_property(CreatePropertyParams {
            issuer: test_data.landlord_id,
            total_supply: U256::from(1_000_000),
            metadata_uri: String::from("ipfs://property-paused"),
        });
    test_data
        .property_registry
        .set_property_token(paused_property_id, test_data.env.get_account(3));
    test_data
        .property_registry
        .set_property_status(paused_property_id, PropertyStatus::Paused);

    test_data.env.set_caller(test_data.landlord);
    params.property_id = paused_property_id;

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidPropertyStatus.into(),
        "Should revert if property is Paused"
    );

    // Test Sold status
    // Test Sold status
    let mut params = generate_lease_agreement_creation_params(&test_data);
    test_data.env.set_caller(test_data.env.get_account(0));
    let sold_property_id = test_data
        .property_registry
        .create_property(CreatePropertyParams {
            issuer: test_data.landlord_id,
            total_supply: U256::from(1_000_000),
            metadata_uri: String::from("ipfs://property-sold"),
        });
    test_data
        .property_registry
        .set_property_token(sold_property_id, test_data.env.get_account(4));
    test_data
        .property_registry
        .set_property_status(sold_property_id, PropertyStatus::Sold);

    test_data.env.set_caller(test_data.landlord);
    params.property_id = sold_property_id;
    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidPropertyStatus.into(),
        "Should revert if property is Sold"
    );

    // Test Liquidating status
    let mut params = generate_lease_agreement_creation_params(&test_data);
    test_data.env.set_caller(test_data.env.get_account(0));
    let liquidating_property_id =
        test_data
            .property_registry
            .create_property(CreatePropertyParams {
                issuer: test_data.landlord_id,
                total_supply: U256::from(1_000_000),
                metadata_uri: String::from("ipfs://property-liquidating"),
            });
    test_data
        .property_registry
        .set_property_token(liquidating_property_id, test_data.env.get_account(6));
    test_data
        .property_registry
        .set_property_status(liquidating_property_id, PropertyStatus::Liquidating);

    test_data.env.set_caller(test_data.landlord);
    params.property_id = liquidating_property_id;
    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidPropertyStatus.into(),
        "Should revert if property is Liquidating"
    );

    // Test Closed status
    let mut params = generate_lease_agreement_creation_params(&test_data);
    test_data.env.set_caller(test_data.env.get_account(0));
    let closed_property_id = test_data
        .property_registry
        .create_property(CreatePropertyParams {
            issuer: test_data.landlord_id,
            total_supply: U256::from(1_000_000),
            metadata_uri: String::from("ipfs://property-closed"),
        });
    test_data
        .property_registry
        .set_property_token(closed_property_id, test_data.env.get_account(8));
    test_data
        .property_registry
        .set_property_status(closed_property_id, PropertyStatus::Closed);

    test_data.env.set_caller(test_data.landlord);
    params.property_id = closed_property_id;
    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidPropertyStatus.into(),
        "Should revert if property is Closed"
    );
}

#[test]
fn test_create_lease_agreement_should_fail_if_landlord_is_not_issuer() {
    let mut test_data = setup(odra_test::env());
    let mut params = generate_lease_agreement_creation_params(&test_data);

    let other_issuer_wallet = test_data.env.get_account(16);
    // Property issuer is different from landlord
    test_data.env.set_caller(test_data.env.get_account(0));
    let other_issuer_id =
        test_data
            .user_registry
            .create_user([99u8; 32], other_issuer_wallet, ROLE_FLAG_LANDLORD);
    let property_id = create_active_property(&mut test_data, other_issuer_id, 3);

    params.property_id = property_id;

    assert_eq!(
        test_data
            .lease
            .try_create_lease_agreement(params)
            .unwrap_err(),
        Error::InvalidPropertyIssuer.into(),
        "Should revert if landlord is not property issuer"
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
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12));

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
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12));
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

#[test]
fn test_finalize_already_finalized_lease_should_revert() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());

    pay_all_lease_agreement_invoices(&mut test_data, &lease_agreement_id);

    test_data
        .env
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12));
    test_data
        .lease
        .finalize_lease_agreement(&lease_agreement_id, &U256::zero());

    // Second finalize should revert
    assert_eq!(
        test_data
            .lease
            .try_finalize_lease_agreement(&lease_agreement_id, &U256::zero())
            .unwrap_err(),
        Error::LeaseAlreadyFinalized.into(),
        "Should revert when lease agreement is already finalized"
    );
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
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12));

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
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12));

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
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12));

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
    let mut params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement_before = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    pay_all_lease_agreement_invoices(&mut test_data, &lease_agreement_id);

    test_data.env.advance_block_time(params.end);

    let new_end = params.end + (ONE_MONTH_IN_MILLISECONDS * 24);
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
                seller: test_data.landlord_id,
                amount_due: params.monthly_rent,
                rent_amount: *params.monthly_rent.amount(),
                rent_paid: U256::zero(),
                property_manager: None,
                property_manager_bps: 0,
                deadline: test_data.env.block_time()
                    + (ONE_MONTH_IN_MILLISECONDS * n as u64)
                    + params.invoice_validity_duration,
                is_paid: false
            },
            "Invalid prolonged lease payment invoice - {}",
            i
        );
    }
}

#[test]
fn test_prolong_finalized_lease_should_revert() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params.clone());
    let lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);

    pay_all_lease_agreement_invoices(&mut test_data, &lease_agreement_id);

    test_data
        .env
        .advance_block_time(test_data.env.block_time() + (ONE_MONTH_IN_MILLISECONDS * 12));
    test_data
        .lease
        .finalize_lease_agreement(&lease_agreement_id, &U256::zero());

    // Prolong after finalization should revert
    assert_eq!(
        test_data
            .lease
            .try_prolong_lease_agreement(
                &lease_agreement_id,
                lease_agreement.end + ONE_MONTH_IN_MILLISECONDS,
                test_data.escrow.get_min_deadline(),
            )
            .unwrap_err(),
        Error::LeaseAlreadyFinalized.into(),
        "Should revert when trying to prolong an already-finalized lease"
    );
}

// =============================================================================
// recover_lease_nft()
// =============================================================================

#[test]
fn test_recover_lease_nft_should_move_frozen_token_to_active_wallet() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);
    let lease_agreement = test_data
        .lease
        .get_lease_agreement_by_id(&lease_agreement_id);
    let token_id = lease_agreement.token_id;
    let old_tenant_wallet = test_data.env.get_account(1);
    let new_tenant_wallet = test_data.env.get_account(16);

    assert_eq!(
        test_data.nft.owner_of(token_id),
        Some(old_tenant_wallet),
        "Lease NFT should be minted to the tenant's original wallet"
    );
    assert!(
        test_data.nft.is_frozen(&token_id),
        "Lease NFT should be frozen at creation"
    );

    test_data.env.set_caller(test_data.env.get_account(0));
    test_data
        .user_registry
        .replace_active_wallet(test_data.tenant_id, new_tenant_wallet);

    assert_eq!(
        test_data
            .user_registry
            .get_active_wallet(test_data.tenant_id),
        new_tenant_wallet,
        "Tenant active wallet should be updated after recovery"
    );
    assert!(
        !test_data.nft.can_transact(&new_tenant_wallet),
        "New wallet should not be whitelisted before lease NFT recovery"
    );

    test_data.env.set_caller(new_tenant_wallet);
    test_data.lease.recover_lease_nft(&lease_agreement_id);

    assert_eq!(
        test_data.nft.owner_of(token_id),
        Some(new_tenant_wallet),
        "Lease NFT should be owned by the tenant's current active wallet"
    );
    assert!(
        test_data.nft.is_frozen(&token_id),
        "Lease NFT should remain frozen after recovery"
    );
    assert!(
        test_data.nft.can_transact(&new_tenant_wallet),
        "New wallet should be whitelisted during recovery"
    );
    assert!(test_data.env.emitted_event(
        &test_data.lease,
        LeaseNftRecovered {
            lease_agreement_id,
            token_id,
            old_wallet: old_tenant_wallet,
            new_wallet: new_tenant_wallet,
        }
    ));
    assert!(test_data.env.emitted_event(
        &test_data.nft,
        Frozen {
            account: new_tenant_wallet,
            token_id,
            frozen_status: true,
        }
    ));

    let receiver = test_data.env.get_account(17);
    test_data.env.set_caller(test_data.env.get_account(0));
    test_data.nft.add_to_whitelist(&receiver);

    test_data.env.set_caller(new_tenant_wallet);
    assert_eq!(
        test_data
            .nft
            .try_transfer_from(new_tenant_wallet, receiver, token_id)
            .unwrap_err(),
        NftError::TokenIsFrozen.into(),
        "Frozen lease NFT should not be transferable even when both parties are whitelisted"
    );
}

#[test]
fn test_recover_lease_nft_should_revert_if_caller_is_old_wallet() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);
    let old_tenant_wallet = test_data.env.get_account(1);
    let new_tenant_wallet = test_data.env.get_account(16);

    test_data.env.set_caller(test_data.env.get_account(0));
    test_data
        .user_registry
        .replace_active_wallet(test_data.tenant_id, new_tenant_wallet);

    test_data.env.set_caller(old_tenant_wallet);
    assert_eq!(
        test_data
            .lease
            .try_recover_lease_nft(&lease_agreement_id)
            .unwrap_err(),
        Error::InvalidTenant.into(),
        "Old wallet should not be able to recover the lease NFT"
    );
}

#[test]
fn test_recover_lease_nft_should_revert_if_nft_already_on_active_wallet() {
    let mut test_data = setup(odra_test::env());
    let params = generate_lease_agreement_creation_params(&test_data);
    let lease_agreement_id = test_data.lease.create_lease_agreement(params);
    let tenant_wallet = test_data.env.get_account(1);

    test_data.env.set_caller(tenant_wallet);
    assert_eq!(
        test_data
            .lease
            .try_recover_lease_nft(&lease_agreement_id)
            .unwrap_err(),
        Error::LeaseNftAlreadyOwnedByActiveWallet.into(),
        "Recovery should revert when the lease NFT is already on the active wallet"
    );
}
