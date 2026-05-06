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
