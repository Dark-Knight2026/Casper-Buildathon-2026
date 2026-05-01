use odra::{casper_types::U256, prelude::*, ContractRef};
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
        ZeroAmount = 1001,
        PropertyNotActive = 1002,
        TransfersDisabled = 1003,
        SenderNotVerified = 1004,
        RecipientNotVerified = 1005,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
  InvestorRegistrySet,
  PropertyRegistrySet,
  ComplianceConfigSet,
  TransferExemptSet,
])]
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

    // =============================================================================
    // View Functions
    // =============================================================================

    /// Returns the investor registry contract address.
    pub fn get_investor_registry_contract(&self) -> Address {
        *self.investor_registry.address()
    }

    /// Returns the property registry contract address.
    pub fn get_property_registry_contract(&self) -> Address {
        *self.property_registry.address()
    }

    /// Returns the compliance config for a property
    pub fn get_compliance_config(&self, property_id: U256) -> ComplianceConfig {
        self.configs.get(&property_id).unwrap_or(ComplianceConfig {
            transfers_enabled: false,
        })
    }

    pub fn is_transfer_exempt(&self, account: Address) -> bool {
        self.transfer_exempt_accounts.get(&account).unwrap_or(false)
    }

    // =========================================================================
    // Compliance Checks
    // =========================================================================

    pub fn can_transfer(
        &self,
        property_id: U256,
        from: Address,
        to: Address,
        amount: U256,
    ) -> bool {
        self.get_transfer_error(property_id, from, to, amount)
            .is_none()
    }

    pub fn assert_can_transfer(&self, property_id: U256, from: Address, to: Address, amount: U256) {
        if let Some(error) = self.get_transfer_error(property_id, from, to, amount) {
            self.env().revert(error);
        }
    }

    // =========================================================================
    // Role Getters
    // =========================================================================

    /// Returns the role hash for accounts allowed to manage property records.
    pub fn compliance_manager_role(&self) -> Role {
        common::hash_role(ROLE_COMPLIANCE_MANAGER)
    }

    // =========================================================================
    // Delegation
    // =========================================================================

    delegate! {
        to self.access_control {
            fn has_role(&self, role: &Role, address: &Address) -> bool;
            fn get_role_admin(&self, role: &Role) -> Role;
            fn grant_role(&mut self, role: &Role, address: &Address);
            fn revoke_role(&mut self, role: &Role, address: &Address);
            fn renounce_role(&mut self, role: &Role, address: &Address);
        }
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

    pub fn get_transfer_error(
        &self,
        property_id: U256,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Option<Error> {
        if amount.is_zero() {
            return Some(Error::ZeroAmount);
        }

        if !self.property_registry.is_property_active(property_id) {
            return Some(Error::PropertyNotActive);
        }

        if !self.get_compliance_config(property_id).transfers_enabled {
            return Some(Error::TransfersDisabled);
        }

        if !self.is_transfer_exempt(from) && !self.investor_registry.is_verified(from) {
            return Some(Error::SenderNotVerified);
        }

        if !self.is_transfer_exempt(to) && !self.investor_registry.is_verified(to) {
            return Some(Error::RecipientNotVerified);
        }

        None
    }
}
