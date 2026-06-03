use leasefi_contracts::user_registry::{
    errors::Error,
    events::{ActiveWalletReplaced, UserCreated, UserRoleFlagsSet, UserStatusSet},
    types::{UserStatus, WalletStatus},
    UserRegistry, UserRegistryHostRef, UserRegistryInitArgs, ROLE_FLAG_LANDLORD,
    ROLE_FLAG_PROPERTY_MANAGER, ROLE_FLAG_TENANT,
};
use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};

// =============================================================================
// Test Context
// =============================================================================

struct Context {
    env: HostEnv,
    registry: UserRegistryHostRef,
    identity_manager: Address,
    role_manager: Address,
    wallet_1: Address,
    wallet_2: Address,
    wallet_3: Address,
}

fn setup(env: HostEnv) -> Context {
    let identity_manager = env.get_account(1);
    let role_manager = env.get_account(2);
    let wallet_1 = env.get_account(3);
    let wallet_2 = env.get_account(4);
    let wallet_3 = env.get_account(5);

    let mut registry = UserRegistry::deploy(
        &env,
        UserRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    registry.grant_role(&registry.identity_manager_role(), &identity_manager);
    registry.grant_role(&registry.user_role_manager_role(), &role_manager);

    Context {
        env,
        registry,
        identity_manager,
        role_manager,
        wallet_1,
        wallet_2,
        wallet_3,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn create_user(ctx: &mut Context) -> U256 {
    ctx.env.set_caller(ctx.identity_manager);
    ctx.registry
        .create_user([1u8; 32], ctx.wallet_1, ROLE_FLAG_TENANT)
}

// =============================================================================
// create_user()
// =============================================================================

#[test]
fn test_create_user_should_store_user_and_wallet_indexes() {
    let mut ctx = setup(odra_test::env());

    let user_id = create_user(&mut ctx);
    let user = ctx.registry.get_user(user_id);

    assert_eq!(user_id, U256::zero());
    assert_eq!(ctx.registry.get_users_count(), U256::one());
    assert_eq!(user.identity_hash, [1u8; 32]);
    assert_eq!(user.active_wallet, ctx.wallet_1);
    assert!(matches!(user.status, UserStatus::Active));
    assert_eq!(
        ctx.registry.get_user_id_by_identity_hash([1u8; 32]),
        Some(user_id)
    );
    assert_eq!(
        ctx.registry.get_user_id_by_wallet(ctx.wallet_1),
        Some(user_id)
    );
    assert!(ctx.registry.is_active_wallet(user_id, ctx.wallet_1));
    assert!(ctx.registry.has_tenant_role(user_id));
    assert!(!ctx.registry.has_landlord_role(user_id));
    assert_eq!(ctx.registry.get_wallet_history(user_id), vec![ctx.wallet_1]);
    assert!(matches!(
        ctx.registry.get_wallet_status(ctx.wallet_1),
        Some(WalletStatus::Active),
    ));
    assert!(ctx.env.emitted_event(
        &ctx.registry,
        UserCreated {
            user_id,
            active_wallet: ctx.wallet_1,
            role_flags: ROLE_FLAG_TENANT,
        }
    ))
}

#[test]
fn test_create_user_should_revert_if_caller_is_not_identity_manager() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.env.get_account(9));

    assert_eq!(
        ctx.registry
            .try_create_user([1u8; 32], ctx.wallet_1, ROLE_FLAG_TENANT)
            .unwrap_err(),
        Error::NotAuthorized.into(),
    );
}

#[test]
fn test_create_user_should_require_identity_hash() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.identity_manager);

    assert_eq!(
        ctx.registry
            .try_create_user([0u8; 32], ctx.wallet_1, ROLE_FLAG_TENANT)
            .unwrap_err(),
        Error::MissingIdentityHash.into(),
    );
}

#[test]
fn test_create_user_should_revert_for_duplicate_identity() {
    let mut ctx = setup(odra_test::env());
    create_user(&mut ctx);

    ctx.env.set_caller(ctx.identity_manager);

    assert_eq!(
        ctx.registry
            .try_create_user([1u8; 32], ctx.wallet_2, ROLE_FLAG_LANDLORD)
            .unwrap_err(),
        Error::IdentityAlreadyRegistered.into(),
    );
}

#[test]
fn test_create_user_should_revert_for_duplicate_wallet() {
    let mut ctx = setup(odra_test::env());
    create_user(&mut ctx);

    ctx.env.set_caller(ctx.identity_manager);

    assert_eq!(
        ctx.registry
            .try_create_user([2u8; 32], ctx.wallet_1, ROLE_FLAG_TENANT)
            .unwrap_err(),
        Error::WalletAlreadyLinked.into(),
    );
}

// =============================================================================
// replace_active_wallet()
// =============================================================================

#[test]
fn test_replace_active_wallet_should_revoke_old_wallet_and_activate_new_wallet() {
    let mut ctx = setup(odra_test::env());
    let user_id = create_user(&mut ctx);

    ctx.registry.replace_active_wallet(user_id, ctx.wallet_2);

    assert_eq!(ctx.registry.get_active_wallet(user_id), ctx.wallet_2);
    assert_eq!(ctx.registry.get_user_id_by_wallet(ctx.wallet_1), None);
    assert_eq!(
        ctx.registry.get_user_id_by_wallet(ctx.wallet_2),
        Some(user_id),
    );
    assert!(matches!(
        ctx.registry.get_wallet_status(ctx.wallet_1),
        Some(WalletStatus::Revoked),
    ));
    assert!(matches!(
        ctx.registry.get_wallet_status(ctx.wallet_2),
        Some(WalletStatus::Active),
    ));
    assert_eq!(
        ctx.registry.get_wallet_history(user_id),
        vec![ctx.wallet_1, ctx.wallet_2],
    );
    assert!(ctx.env.emitted_event(
        &ctx.registry,
        ActiveWalletReplaced {
            user_id,
            old_wallet: ctx.wallet_1,
            new_wallet: ctx.wallet_2,
        }
    ));
}

#[test]
fn test_replace_active_wallet_should_reject_any_previously_linked_wallet() {
    let mut ctx = setup(odra_test::env());
    let user_id = create_user(&mut ctx);

    ctx.registry.replace_active_wallet(user_id, ctx.wallet_2);

    assert_eq!(
        ctx.registry
            .try_replace_active_wallet(user_id, ctx.wallet_1)
            .unwrap_err(),
        Error::WalletAlreadyLinked.into()
    );
}

#[test]
fn test_replace_active_wallet_should_revert_if_caller_is_not_identity_manager() {
    let mut ctx = setup(odra_test::env());
    let user_id = create_user(&mut ctx);

    ctx.env.set_caller(ctx.env.get_account(9));

    assert_eq!(
        ctx.registry
            .try_replace_active_wallet(user_id, ctx.wallet_2)
            .unwrap_err(),
        Error::NotAuthorized.into()
    );
}
