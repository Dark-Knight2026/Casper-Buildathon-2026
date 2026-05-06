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
