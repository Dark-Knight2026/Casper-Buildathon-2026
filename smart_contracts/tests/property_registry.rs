use leasefi_contracts::{
    property_registry::{
        errors::Error,
        events::{PropertyCreated, PropertyMetadataSet, PropertyTokenSet},
        types::{CreatePropertyParams, PropertyStatus},
        PropertyRegistry, PropertyRegistryHostRef, PropertyRegistryInitArgs,
    },
    user_registry::{
        UserRegistry, UserRegistryInitArgs, ROLE_FLAG_LANDLORD, ROLE_FLAG_PROPERTY_MANAGER,
    },
};
use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};

use crate::property_registry::events::PropertyStatusSet;

// =============================================================================
// Test Context
// =============================================================================

struct Context {
    env: HostEnv,
    registry: PropertyRegistryHostRef,
    property_manager: Address,
    issuer_id: U256,
    token: Address,
}

fn setup(env: HostEnv) -> Context {
    let owner = env.get_account(0);
    let property_manager = env.get_account(1);
    let issuer = env.get_account(2);
    let token = env.get_account(3);

    let mut user_registry = UserRegistry::deploy(&env, UserRegistryInitArgs { owner });

    let registry = PropertyRegistry::deploy(
        &env,
        PropertyRegistryInitArgs {
            owner,
            user_registry: user_registry.address(),
        },
    );

    user_registry.grant_role(&user_registry.identity_manager_role(), &owner);

    let _property_manager_id =
        user_registry.create_user([1u8; 32], property_manager, ROLE_FLAG_PROPERTY_MANAGER);
    let issuer_id = user_registry.create_user([2u8; 32], issuer, ROLE_FLAG_LANDLORD);

    Context {
        env,
        registry,
        property_manager,
        issuer_id,
        token,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn property_params(ctx: &Context) -> CreatePropertyParams {
    CreatePropertyParams {
        issuer: ctx.issuer_id,
        total_supply: U256::from(1_000_000),
        metadata_uri: String::from("ipfs://property-1"),
    }
}

fn create_property(ctx: &mut Context) -> U256 {
    ctx.env.set_caller(ctx.property_manager);
    ctx.registry.create_property(property_params(ctx))
}

// =============================================================================
// create_property()
// =============================================================================

#[test]
fn test_create_property_should_create_draft_properly() {
    let mut ctx = setup(odra_test::env());
    let params = property_params(&ctx);
    let expected_property_id = U256::zero();

    ctx.env.set_caller(ctx.property_manager);
    let property_id = ctx.registry.create_property(params);

    let property = ctx.registry.get_property(property_id);

    assert_eq!(property_id, expected_property_id, "Invalid Property ID");
    assert_eq!(property.issuer, ctx.issuer_id, "Invalid issuer");
    assert_eq!(property.total_supply, U256::from(1_000_000));
    assert_eq!(
        property.metadata_uri,
        String::from("ipfs://property-1"),
        "Invalid metadata URI"
    );
    assert!(
        matches!(property.status, PropertyStatus::Draft),
        "Property should start in Draft status"
    );
    assert!(ctx.env.emitted_event(
        &ctx.registry,
        PropertyCreated {
            property_id,
            issuer: ctx.issuer_id,
            total_supply: U256::from(1_000_000),
            metadata_uri: property.metadata_uri,
        }
    ));
}

#[test]
fn test_create_property_should_revert_if_caller_is_not_property_manager() {
    let mut ctx = setup(odra_test::env());
    let params = property_params(&ctx);

    ctx.env.set_caller(ctx.env.get_account(10));
    assert_eq!(
        ctx.registry.try_create_property(params).unwrap_err(),
        Error::CallerNotPropertyManager.into(),
        "Should revert if caller is not property manager",
    );
}

#[test]
fn test_create_property_should_revert_if_total_supply_is_zero() {
    let mut ctx = setup(odra_test::env());

    let params = CreatePropertyParams {
        issuer: ctx.issuer_id,
        total_supply: U256::zero(),
        metadata_uri: String::from("ipfs://property-1"),
    };

    ctx.env.set_caller(ctx.property_manager);
    assert_eq!(
        ctx.registry.try_create_property(params).unwrap_err(),
        Error::ZeroTotalSupply.into(),
        "Should revert if total supply is zero",
    );
}

#[test]
fn test_create_property_should_revert_if_metadata_uri_is_empty() {
    let mut ctx = setup(odra_test::env());

    let params = CreatePropertyParams {
        issuer: ctx.issuer_id,
        total_supply: U256::from(1_000_000),
        metadata_uri: String::new(),
    };

    ctx.env.set_caller(ctx.property_manager);
    assert_eq!(
        ctx.registry.try_create_property(params).unwrap_err(),
        Error::EmptyMetadataUri.into(),
        "Should revert if metadata URI is empty",
    );
}

// =============================================================================
// View Functions
// =============================================================================

#[test]
fn test_get_property_should_revert_for_invalid_id() {
    let ctx = setup(odra_test::env());
    assert_eq!(
        ctx.registry.try_get_property(U256::from(999)).unwrap_err(),
        Error::InvalidPropertyId.into(),
        "Should revert for non-existent property ID"
    );
}

// =============================================================================
// Draft Configuration
// =============================================================================

#[test]
fn test_set_property_token_should_set_token_for_draft_property() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.registry.set_property_token(property_id, ctx.token);

    assert_eq!(
        ctx.registry.get_property_token(property_id),
        ctx.token,
        "Invalid property token",
    );
    assert!(ctx.env.emitted_event(
        &ctx.registry,
        PropertyTokenSet {
            property_id,
            token: ctx.token,
        }
    ));
}

#[test]
fn test_set_metadata_uri_should_update_metadata_uri_for_draft_property() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);
    let new_metadata_uri = String::from("ipfs://property-1-updated");

    ctx.registry
        .set_metadata_uri(property_id, new_metadata_uri.clone());

    assert_eq!(
        ctx.registry.get_property(property_id).metadata_uri,
        new_metadata_uri,
        "Invalid metadata URI",
    );
    assert!(ctx
        .env
        .emitted_event(&ctx.registry, PropertyMetadataSet { property_id }));
}

#[test]
fn test_set_property_token_should_revert_if_caller_is_not_manager() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.env.set_caller(ctx.env.get_account(9));
    assert_eq!(
        ctx.registry
            .try_set_property_token(property_id, ctx.token)
            .unwrap_err(),
        Error::CallerNotPropertyManager.into(),
        "Should revert if caller is not property manager",
    );
}

#[test]
fn test_set_property_token_should_set_reverse_lookup() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.registry.set_property_token(property_id, ctx.token);

    assert_eq!(
        ctx.registry.get_property_id_by_token(ctx.token),
        Some(property_id),
        "Invalid reverse token lookup",
    );

    assert_eq!(
        ctx.registry
            .get_property_id_by_token(ctx.env.get_account(5)),
        None,
        "Unknown token should not resolve to a property",
    );
}

#[test]
fn test_set_property_token_should_clear_old_reverse_lookup_when_replaced() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);
    let old_token = ctx.token;
    let new_token = ctx.env.get_account(5);

    ctx.registry.set_property_token(property_id, old_token);
    ctx.registry.set_property_token(property_id, new_token);

    assert_eq!(
        ctx.registry.get_property_token(property_id),
        new_token,
        "Property should point to new token",
    );

    assert_eq!(
        ctx.registry.get_property_id_by_token(old_token),
        None,
        "Old token reverse lookup should be cleared",
    );

    assert_eq!(
        ctx.registry.get_property_id_by_token(new_token),
        Some(property_id),
        "New token should resolve to property",
    );
}

#[test]
fn test_set_property_token_should_revert_if_token_is_registered_to_another_property() {
    let mut ctx = setup(odra_test::env());

    let first_property_id = create_property(&mut ctx);
    let second_property_id = create_property(&mut ctx);

    ctx.registry
        .set_property_token(first_property_id, ctx.token);

    assert_eq!(
        ctx.registry
            .try_set_property_token(second_property_id, ctx.token)
            .unwrap_err(),
        Error::PropertyTokenAlreadyRegistered.into(),
        "Should not allow one token to represent two properties",
    );
}

#[test]
fn test_set_metadata_uri_should_revert_if_caller_is_not_manager() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.env.set_caller(ctx.env.get_account(9));
    assert_eq!(
        ctx.registry
            .try_set_metadata_uri(property_id, String::from("ipfs://new"))
            .unwrap_err(),
        Error::CallerNotPropertyManager.into(),
        "Should revert if caller is not property manager",
    );
}

// =============================================================================
// set_property_status()
// =============================================================================

#[test]
fn test_set_property_status_should_revert_if_caller_is_not_manager() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.env.set_caller(ctx.env.get_account(9));
    assert_eq!(
        ctx.registry
            .try_set_property_status(property_id, PropertyStatus::Active)
            .unwrap_err(),
        Error::CallerNotPropertyManager.into(),
        "Should revert if caller is not property manager",
    );
}

#[test]
fn test_set_property_status_should_require_token_before_active_status() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    assert_eq!(
        ctx.registry
            .try_set_property_status(property_id, PropertyStatus::Active)
            .unwrap_err(),
        Error::MissingPropertyToken.into(),
        "Should require token before activation",
    );
}

#[test]
fn test_set_property_status_should_activate_property_after_required_addresses_are_set() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.registry.set_property_token(property_id, ctx.token);
    ctx.registry
        .set_property_status(property_id, PropertyStatus::Active);

    assert!(
        ctx.registry.is_property_active(property_id),
        "Property should be active",
    );

    assert!(ctx.env.emitted_event(
        &ctx.registry,
        PropertyStatusSet {
            property_id,
            status: PropertyStatus::Active,
        }
    ));
}

#[test]
fn test_draft_only_fields_should_revert_after_property_is_active() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.registry.set_property_token(property_id, ctx.token);
    ctx.registry
        .set_property_status(property_id, PropertyStatus::Active);

    assert_eq!(
        ctx.registry
            .try_set_property_token(property_id, ctx.env.get_account(5))
            .unwrap_err(),
        Error::PropertyNotDraft.into(),
        "Should not allow token changes after activation",
    );

    assert_eq!(
        ctx.registry
            .try_set_metadata_uri(property_id, String::from("ipfs://metadata-changed"))
            .unwrap_err(),
        Error::PropertyNotDraft.into(),
        "Should not allow metadata URI changes after activation",
    );
}

#[test]
fn test_set_property_status_should_revert_if_transitioning_from_active_to_draft() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.registry.set_property_token(property_id, ctx.token);
    ctx.registry
        .set_property_status(property_id, PropertyStatus::Active);

    assert_eq!(
        ctx.registry
            .try_set_property_status(property_id, PropertyStatus::Draft)
            .unwrap_err(),
        Error::InvalidStatusTransition.into(),
        "Should not allow transition from Active back to Draft",
    );
}

#[test]
fn test_set_property_status_should_revert_if_transitioning_from_terminal_states() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.registry.set_property_token(property_id, ctx.token);

    // Test Sold is terminal
    ctx.registry
        .set_property_status(property_id, PropertyStatus::Sold);
    assert_eq!(
        ctx.registry
            .try_set_property_status(property_id, PropertyStatus::Active)
            .unwrap_err(),
        Error::InvalidStatusTransition.into(),
        "Should not allow transition from Sold back to Active",
    );

    // Test Closed is terminal
    let property_id_2 = create_property(&mut ctx);
    let token_2 = ctx.env.get_account(10);
    ctx.registry.set_property_token(property_id_2, token_2);
    ctx.registry
        .set_property_status(property_id_2, PropertyStatus::Closed);
    assert_eq!(
        ctx.registry
            .try_set_property_status(property_id_2, PropertyStatus::Active)
            .unwrap_err(),
        Error::InvalidStatusTransition.into(),
        "Should not allow transition from Closed back to Active",
    );
}

#[test]
fn test_set_property_status_liquidating_transitions() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_property(&mut ctx);

    ctx.registry.set_property_token(property_id, ctx.token);

    ctx.registry
        .set_property_status(property_id, PropertyStatus::Liquidating);

    // Liquidating -> Active should fail
    assert_eq!(
        ctx.registry
            .try_set_property_status(property_id, PropertyStatus::Active)
            .unwrap_err(),
        Error::InvalidStatusTransition.into(),
        "Should not allow transition from Liquidating back to Active",
    );

    // Liquidating -> Closed should succeed
    ctx.registry
        .set_property_status(property_id, PropertyStatus::Closed);
    assert!(
        matches!(
            ctx.registry.get_property(property_id).status,
            PropertyStatus::Closed
        ),
        "Should allow transition from Liquidating to Closed"
    );
}
