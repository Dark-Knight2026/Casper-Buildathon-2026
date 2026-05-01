use odra::{casper_types::U256, prelude::*};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::{
    common,
    compliance_policy::{errors::Error, types::ComplianceConfig},
    investor_registry::InvestorRegistryContractRef,
    property_registry::PropertyRegistryContractRef,
};

// =============================================================================
// Roles
// =============================================================================

pub const ROLE_COMPLIANCE_MANAGER: &str = "COMPLIANCE_MANAGER";

// =============================================================================
// Types
// =============================================================================

pub mod types {
    #[odra::odra_type]
    pub struct ComplianceConfig {
        pub transfers_enabled: bool,
    }
}

// =============================================================================
// Events
// =============================================================================

// =============================================================================
// Errors
// =============================================================================

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [])]
pub struct CompliancePolicy {
    access_control: SubModule<AccessControl>,
    investory_registry: External<InvestorRegistryContractRef>,
    property_registry: External<PropertyRegistryContractRef>,
    configs: Mapping<U256, ComplianceConfig>,
    transfer_exempt_accounts: Mapping<Address, bool>,
}

#[odra::module]
impl CompliancePolicy {}
