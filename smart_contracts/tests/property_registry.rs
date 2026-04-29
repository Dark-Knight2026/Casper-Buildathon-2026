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
