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
