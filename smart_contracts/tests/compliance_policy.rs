use leasefi_contracts::{
    compliance_policy::{
        errors::Error as ComplianceError,
        events::{ComplianceConfigSet, TransferExemptSet},
        types::ComplianceConfig,
        CompliancePolicy, CompliancePolicyHostRef, CompliancePolicyInitArgs,
    },
    investor_registry::{
        types::InvestorRecord, InvestorRegistry, InvestorRegistryHostRef, InvestorRegistryInitArgs,
    },
    property_registry::{
        types::{CreatePropertyParams, PropertyStatus},
        PropertyRegistry, PropertyRegistryHostRef, PropertyRegistryInitArgs,
    },
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
    compliance: CompliancePolicyHostRef,
    investor_registry: InvestorRegistryHostRef,
    property_registry: PropertyRegistryHostRef,
    compliance_manager: Address,
    verification_manager: Address,
    property_manager: Address,
    sender: Address,
    recipient: Address,
    property_token: Address,
    revenue_distributor: Address,
}

fn setup(env: HostEnv) -> Context {
    let compliance_manager = env.get_account(1);
    let verification_manager = env.get_account(2);
    let property_manager = env.get_account(3);
    let sender = env.get_account(4);
    let recipient = env.get_account(5);
    let property_token = env.get_account(6);
    let revenue_distributor = env.get_account(7);

    let mut investor_registry = InvestorRegistry::deploy(
        &env,
        InvestorRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    let mut property_registry = PropertyRegistry::deploy(
        &env,
        PropertyRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    let mut compliance = CompliancePolicy::deploy(
        &env,
        CompliancePolicyInitArgs {
            owner: env.get_account(0),
        },
    );

    investor_registry.grant_role(
        &investor_registry.verification_manager_role(),
        &verification_manager,
    );

    property_registry.grant_role(
        &property_registry.property_manager_role(),
        &property_manager,
    );

    compliance.grant_role(&compliance.compliance_manager_role(), &compliance_manager);

    env.set_caller(compliance_manager);
    compliance.set_investor_registry(investor_registry.address());
    compliance.set_property_registry(property_registry.address());

    Context {
        env,
        compliance,
        investor_registry,
        property_registry,
        compliance_manager,
        verification_manager,
        property_manager,
        sender,
        recipient,
        property_token,
        revenue_distributor,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn active_investor_record(env: &HostEnv) -> InvestorRecord {
    InvestorRecord {
        verified: true,
        frozen: false,
        verified_until: env.block_time() + 1_000,
        jurisdiction: 840,
        identity_hash: String::from("kyc-hash"),
    }
}

fn verify_investor(ctx: &mut Context, account: Address) {
    ctx.env.set_caller(ctx.verification_manager);
    ctx.investor_registry
        .set_investor_record(account, active_investor_record(&ctx.env));
}

fn create_draft_property(ctx: &mut Context) -> U256 {
    ctx.env.set_caller(ctx.property_manager);

    ctx.property_registry.create_property(CreatePropertyParams {
        issuer: ctx.env.get_account(8),
        total_supply: U256::from(1_000_000),
        metadata_uri: String::from("ipfs://property-1"),
    })
}

fn create_active_property(ctx: &mut Context) -> U256 {
    let property_id = create_draft_property(ctx);

    ctx.property_registry
        .set_property_token(property_id, ctx.property_token);

    ctx.property_registry
        .set_revenue_distributor(property_id, ctx.revenue_distributor);

    ctx.property_registry
        .set_property_status(property_id, PropertyStatus::Active);

    property_id
}

fn enable_transfers(ctx: &mut Context, property_id: U256) {
    ctx.env.set_caller(ctx.compliance_manager);

    ctx.compliance.set_compliance_config(
        property_id,
        ComplianceConfig {
            transfers_enabled: true,
        },
    );
}

fn verify_sender_and_recipient(ctx: &mut Context) {
    verify_investor(ctx, ctx.sender);
    verify_investor(ctx, ctx.recipient);
}
