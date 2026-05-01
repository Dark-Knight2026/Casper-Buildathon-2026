use odra::{casper_types::U256, prelude::*};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::{
    common,
    compliance_policy::{
        errors::Error,
        events::{
            ComplianceConfigSet, InvestorRegistrySet, PropertyRegistrySet, TransferExemptSet,
        },
        types::ComplianceConfig,
    },
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

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct InvestorRegistrySet {
        pub investor_registry: Address,
    }

    #[odra::event]
    pub struct PropertyRegistrySet {
        pub property_registry: Address,
    }

    #[odra::event]
    pub struct ComplianceConfigSet {
        pub property_id: U256,
        pub transfers_enabled: bool,
    }

    #[odra::event]
    pub struct TransferExemptSet {
        pub account: Address,
        pub exempt: bool,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        NotAuthorized = 1000,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [InvestorRegistrySet, PropertyRegistrySet])]
pub struct CompliancePolicy {
    access_control: SubModule<AccessControl>,
    investor_registry: External<InvestorRegistryContractRef>,
    property_registry: External<PropertyRegistryContractRef>,
    configs: Mapping<U256, ComplianceConfig>,
    transfer_exempt_accounts: Mapping<Address, bool>,
}

#[odra::module]
impl CompliancePolicy {
    // =============================================================================
    // Initialization
    // =============================================================================

    pub fn init(&mut self, owner: Address) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &owner);
    }

    // =============================================================================
    // Admin Configuration
    // =============================================================================

    /// Sets the investor registry used for wallet verifications checks
    /// @dev Restricted to `COMPLIANCE_MANAGER`
    pub fn set_investor_registry(&mut self, investor_registry: Address) {
        self.assert_role(ROLE_COMPLIANCE_MANAGER);

        self.investor_registry.set(investor_registry);

        self.env()
            .emit_event(InvestorRegistrySet { investor_registry });
    }

    /// Sets the property registry used for property lifecycle checks
    pub fn set_property_registry(&mut self, property_registry: Address) {
        self.assert_role(ROLE_COMPLIANCE_MANAGER);

        self.property_registry.set(property_registry);

        self.env()
            .emit_event(PropertyRegistrySet { property_registry });
    }

    /// Sets the transfer configuration for a property
    /// Restricted to the `COMPLIANCE_MANAGER`.
    /// @dev Transfers are disabled by default. A property must also be active in `PropertyRegistry`
    ///      before normal transfers can pass.
    pub fn set_compliance_config(&mut self, property_id: U256, config: ComplianceConfig) {
        self.assert_role(ROLE_COMPLIANCE_MANAGER);

        self.env().emit_event(ComplianceConfigSet {
            property_id,
            transfers_enabled: config.transfers_enabled,
        });

        self.configs.set(&property_id, config);
    }

    /// Sets whether an account is exempt from investor verification checks
    /// Restricted to the `COMPLIANCE_MANAGER`.
    /// @dev This is intended for issuance escrow or other protocol-controlled accounts.
    ///      Investor recipient wallets should not be exempt.
    pub fn set_transfer_exempt(&mut self, account: Address, exempt: bool) {
        self.assert_role(ROLE_COMPLIANCE_MANAGER);

        self.transfer_exempt_accounts.set(&account, exempt);

        self.env().emit_event(TransferExemptSet { account, exempt });
    }

    
}

// =============================================================================
// Internal helpers
// =============================================================================

impl CompliancePolicy {
    fn assert_role(&self, role_name: &str) {
        let role = common::hash_role(role_name);

        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::NotAuthorized);
        }
    }
}
