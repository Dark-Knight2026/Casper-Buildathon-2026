use leasefi_contracts::property_registry::{
    errors::Error,
    events::{PropertyCreated, PropertyMetadataSet, PropertyTokenSet, RevenueDistributorSet},
    types::{CreatePropertyParams, PropertyStatus},
    PropertyRegistry, PropertyRegistryHostRef, PropertyRegistryInitArgs,
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
    registry: PropertyRegistryHostRef,
    property_manager: Address,
    issuer: Address,
    token: Address,
    revenue_distributor: Address,
}

fn setup(env: HostEnv) -> Context {
    let property_manager = env.get_account(1);
    let issuer = env.get_account(2);
    let token = env.get_account(3);
    let revenue_distributor = env.get_account(4);

    let mut registry = PropertyRegistry::deploy(
        &env,
        PropertyRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    registry.grant_role(&registry.property_manager_role(), &property_manager);

    Context {
        env,
        registry,
        property_manager,
        issuer,
        token,
        revenue_distributor,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn property_params(ctx: &Context) -> CreatePropertyParams {
    CreatePropertyParams {
        issuer: ctx.issuer,
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
    assert_eq!(
        ctx.registry.get_properties_count(),
        U256::from(1),
        "Invalid property count",
    );
    assert_eq!(property.issuer, ctx.issuer, "Invalid issuer");
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
            issuer: ctx.issuer,
            total_supply: U256::from(1_000_000),
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
        Error::NotAuthorized.into(),
        "Should revert if caller is not property manager",
    );
}

#[test]
fn test_create_property_should_revert_if_total_supply_is_zero() {
    let mut ctx = setup(odra_test::env());

    let params = CreatePropertyParams {
        issuer: ctx.issuer,
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
        issuer: ctx.issuer,
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
