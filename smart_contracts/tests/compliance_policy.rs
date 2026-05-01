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
        property_manager,
        sender,
        recipient,
        property_token,
        revenue_distributor,
    }
}
