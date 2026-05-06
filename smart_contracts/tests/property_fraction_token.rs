use leasefi_contracts::{
    compliance_policy::{
        errors::Error as ComplianceError, types::ComplianceConfig, CompliancePolicy,
        CompliancePolicyHostRef, CompliancePolicyInitArgs,
    },
    investor_registry::{
        types::InvestorRecord, InvestorRegistry, InvestorRegistryHostRef, InvestorRegistryInitArgs,
    },
    property_fraction_token::{
        errors::Error as TokenError,
        events::{CompliancePolicySet, PropertyFractionTokenInitialized},
        types::PropertyFractionTokenInitParams,
        PropertyFractionToken, PropertyFractionTokenHostRef, PropertyFractionTokenInitArgs,
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
use odra_modules::access::DEFAULT_ADMIN_ROLE;

// =============================================================================
// Test Context
// =============================================================================

struct Context {
    env: HostEnv,
    token: PropertyFractionTokenHostRef,
    compliance: CompliancePolicyHostRef,
    investor_registry: InvestorRegistryHostRef,
    property_registry: PropertyRegistryHostRef,
    owner: Address,
    token_manager: Address,
    compliance_manager: Address,
    verification_manager: Address,
    property_manager: Address,
    initial_holder: Address,
    recipient: Address,
    spender: Address,
    property_id: U256,
    initial_supply: U256,
}

fn setup(env: HostEnv) -> Context {
    let owner = env.get_account(0);
    let token_manager = env.get_account(1);
    let compliance_manager = env.get_account(2);
    let verification_manager = env.get_account(3);
    let property_manager = env.get_account(4);
    let initial_holder = env.get_account(5);
    let recipient = env.get_account(6);
    let spender = env.get_account(7);
    let revenue_distributor = env.get_account(8);
    let issuer = env.get_account(9);
    let initial_supply = U256::from(1_000_000);

    let mut investor_registry = InvestorRegistry::deploy(&env, InvestorRegistryInitArgs { owner });
    let mut property_registry = PropertyRegistry::deploy(&env, PropertyRegsitryInitArgs { owner });

    let compliance = CompliancePolicy::deploy(
        &env,
        ComplianceInitArgs {
            owner,
            investor_registry: investor_registry.address(),
            property_registry: property_registry.address(),
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

    env.set_caller(property_manager);
    let property_id = property_registry.create_property(CreatePropertyParams {
        issuer,
        total_supply: initial_supply,
        metadata_uri: String::from("ipfs://property-1"),
    });

    let mut token = PropertyFractionToken::deploy(
        &env,
        PropertyFractionTokenInitArgs {
            params: PropertyFractionTokenInitParams {
                owner,
                property_id,
                compliance_policy: compliance.address(),
                symbol: String::from("LFPROP"),
                name: String::from("LeaseFi Property Fraction"),
                decimals: 18,
                initial_supply,
                initial_holder,
            },
        },
    );

    env.set_caller(owner);
    token.grant_role(&token.token_manager_role(), &token_manager);

    property_registry.set_property_token(property_id, token.address());
    property_registry.set_revenue_distributor(property_id, revenue_distributor);
    property_registry.set_property_status(property_id, PropertyStatus::Active);

    Context {
        env,
        token,
        compliance,
        investor_registry,
        property_registry,
        owner,
        token_manager,
        compliance_manager,
        verification_manager,
        property_manager,
        initial_holder,
        recipient,
        spender,
        property_id,
        initial_supply,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn active_investory_record(env: &HostEnv) -> InvestorRecord {
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

fn enable_transfers(ctx: &mut Context) {
    ctx.env.set_caller(ctx.compliance_manager);

    ctx.compliance.set_compliance_config(
        ctx.property_id,
        ComplianceConfig {
            transfers_enabled: true,
        },
    );
}

fn set_transfer_exempt(ctx: &mut Context, account: Address, exempt: bool) {
    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_transfer_exempt(account, exempt);
}

fn enable_primary_distribution(ctx: &mut Context) {
    let initial_holder = ctx.initial_holder;

    enable_transfers(ctx);
    set_transfer_exempt(ctx, initial_holder, true);
}

fn init_args(
    env: &HostEnv,
    name: String,
    symbol: String,
    decimals: u8,
    initial_supply: U256,
) -> PropertyFractionTokenInitArgs {
    PropertyFractionTokenInitArgs {
        params: PropertyFractionTokenInitParams {
            owner: env.get_account(0),
            property_id: U256::zero(),
            compliance_policy: env.get_account(9),
            symbol,
            name,
            decimals,
            initial_supply,
            initial_holder: env.get_account(5),
        },
    }
}
