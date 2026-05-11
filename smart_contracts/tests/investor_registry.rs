use leasefi_contracts::investor_registry::{
    errors::Error,
    events::{InvestorFrozen, InvestorRecordSet},
    types::InvestorRecord,
    InvestorRegistry, InvestorRegistryHostRef, InvestorRegistryInitArgs,
};
use odra::host::{Deployer, HostEnv};
use odra::prelude::*;

// =============================================================================
// Test Context
// =============================================================================

struct Context {
    env: HostEnv,
    registry: InvestorRegistryHostRef,
    verification_manager: Address,
    freezer: Address,
    investor: Address,
}

fn setup(env: HostEnv) -> Context {
    let verification_manager = env.get_account(1);
    let freezer = env.get_account(2);
    let investor = env.get_account(3);

    let mut registry = InvestorRegistry::deploy(
        &env,
        InvestorRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    registry.grant_role(&registry.verification_manager_role(), &verification_manager);
    registry.grant_role(&registry.freezer_role(), &freezer);

    Context {
        env,
        registry,
        verification_manager,
        freezer,
        investor,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn active_record(env: &HostEnv) -> InvestorRecord {
    InvestorRecord {
        verified: true,
        frozen: false,
        verified_until: env.block_time() + 1_000,
        jurisdiction: 840,
        identity_hash: [1u8; 32],
    }
}

// =============================================================================
// set_investor_record()
// =============================================================================

#[test]
fn test_set_investor_record_should_store_verified_record() {
    let mut ctx = setup(odra_test::env());
    let record = active_record(&ctx.env);

    ctx.env.set_caller(ctx.verification_manager);
    ctx.registry.set_investor_record(ctx.investor, record);

    assert!(ctx.registry.is_registered(ctx.investor));
    assert!(ctx.registry.is_verified(ctx.investor));

    assert!(ctx.env.emitted_event(
        &ctx.registry,
        InvestorRecordSet {
            account: ctx.investor,
            verified: true,
            verified_until: ctx.env.block_time() + 1_000,
            jurisdiction: 840,
        }
    ));
}

#[test]
fn test_set_investor_record_should_revert_if_caller_is_not_manager() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.env.get_account(9));

    assert_eq!(
        ctx.registry
            .try_set_investor_record(ctx.investor, active_record(&ctx.env))
            .unwrap_err(),
        Error::NotAuthorized.into()
    );
}

#[test]
fn test_verified_record_should_expire() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.verification_manager);
    ctx.registry
        .set_investor_record(ctx.investor, active_record(&ctx.env));

    ctx.env.advance_block_time(1_001);

    assert!(!ctx.registry.is_verified(ctx.investor));
}

#[test]
fn test_is_verified_boundary_conditions() {
    let mut ctx = setup(odra_test::env());
    let mut record = active_record(&ctx.env);
    let now = ctx.env.block_time();

    // Condition 1: verified_until == block_time() -> true
    record.verified_until = now;
    ctx.env.set_caller(ctx.verification_manager);
    ctx.registry.set_investor_record(ctx.investor, record);
    assert!(
        ctx.registry.is_verified(ctx.investor),
        "Should be verified exactly at expiry time"
    );

    // Condition 2: verified_until == block_time() - 1 -> false
    ctx.env.advance_block_time(1);
    assert!(
        !ctx.registry.is_verified(ctx.investor),
        "Should be expired 1ms after expiry time"
    );
}

#[test]
fn test_frozen_investor_should_not_be_verified() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.verification_manager);
    ctx.registry
        .set_investor_record(ctx.investor, active_record(&ctx.env));

    ctx.env.set_caller(ctx.freezer);
    ctx.registry.set_frozen(ctx.investor, true);

    assert!(ctx.registry.is_frozen(ctx.investor));
    assert!(!ctx.registry.is_verified(ctx.investor));

    assert!(ctx.env.emitted_event(
        &ctx.registry,
        InvestorFrozen {
            account: ctx.investor,
            frozen: true,
        }
    ));
}

#[test]
fn test_set_investor_record_should_preserve_frozen_status() {
    let mut ctx = setup(odra_test::env());
    let mut record = active_record(&ctx.env);

    // Register and then freeze the investor
    ctx.env.set_caller(ctx.verification_manager);
    ctx.registry
        .set_investor_record(ctx.investor, record.clone());

    ctx.env.set_caller(ctx.freezer);
    ctx.registry.set_frozen(ctx.investor, true);
    assert!(ctx.registry.is_frozen(ctx.investor));

    // Update the record via set_investor_record (e.g. update jurisdiction)
    record.jurisdiction = 123;
    ctx.env.set_caller(ctx.verification_manager);
    ctx.registry.set_investor_record(ctx.investor, record);

    // Assert frozen status is preserved
    assert!(ctx.registry.is_frozen(ctx.investor));
    assert!(
        !ctx.registry.is_verified(ctx.investor),
        "Frozen investor should not be verified even after record update"
    );

    let updated_record = ctx.registry.get_investor_record(ctx.investor).unwrap();
    assert_eq!(updated_record.jurisdiction, 123);
    assert!(updated_record.frozen);
}

#[test]
fn test_set_frozen_should_revert_if_account_is_not_registered() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.freezer);

    assert_eq!(
        ctx.registry.try_set_frozen(ctx.investor, true).unwrap_err(),
        Error::AccountNotRegistered.into()
    );
}

#[test]
fn test_set_frozen_should_revert_if_caller_is_not_freezer() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.env.get_account(9));

    assert_eq!(
        ctx.registry.try_set_frozen(ctx.investor, true).unwrap_err(),
        Error::NotAuthorized.into()
    );
}

#[test]
fn test_verified_record_should_require_identity_hash() {
    let mut ctx = setup(odra_test::env());
    let mut record = active_record(&ctx.env);
    record.identity_hash = [0u8; 32];

    ctx.env.set_caller(ctx.verification_manager);

    assert_eq!(
        ctx.registry
            .try_set_investor_record(ctx.investor, record)
            .unwrap_err(),
        Error::MissingIdentityHash.into(),
    );
}
