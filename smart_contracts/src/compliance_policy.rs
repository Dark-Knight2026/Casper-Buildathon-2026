use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::{
    common,
    compliance_policy::{
        errors::Error,
        events::{
            ComplianceConfigSet, InvestorRegistrySet, LeaseSet, PropertyRegistrySet,
            TransferExemptSet,
        },
        types::ComplianceConfig,
    },
    investor_registry::InvestorRegistryContractRef,
    lease::LeaseContractRef,
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
        /// Enables normal transfers for this property.
        /// @dev The property must still be active in `PropertyRegistry`.
        pub transfers_enabled: bool,
        /// Requires issuer/landlord/protocol equity distributions to go only to tenants
        /// with an equity-option lease for this property.
        /// @dev When enabled, any transfer from a transfer-exempt sender to a non-exempt
        ///      recipient is treated as an equity distribution and requires lease eligibility.
        ///      Other exempt-to-non-exempt transfers (treasury refunds, vesting payouts, etc.)
        ///      on the same token will be incorrectly blocked if the recipient has no equity lease.
        ///      Secondary investor-to-investor transfers still use normal KYC/compliance checks.
        pub equity_distribution_requires_lease_option: bool,
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
        pub equity_distribution_requires_lease_option: bool,
    }

    #[odra::event]
    pub struct TransferExemptSet {
        pub account: Address,
        pub exempt: bool,
    }

    #[odra::event]
    pub struct LeaseSet {
        pub lease: Address,
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
        InvalidPropertyToken = 1006,
        RecipientNotEquityEligible = 1007,
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
  LeaseSet,
])]
pub struct CompliancePolicy {
    access_control: SubModule<AccessControl>,
    investor_registry: External<InvestorRegistryContractRef>,
    property_registry: External<PropertyRegistryContractRef>,
    lease: External<LeaseContractRef>,
    configs: Mapping<U256, ComplianceConfig>,
    transfer_exempt_accounts: Mapping<Address, bool>,
}

#[odra::module]
impl CompliancePolicy {
    // =============================================================================
    // Initialization
    // =============================================================================

    pub fn init(
        &mut self,
        owner: Address,
        investor_registry: Address,
        property_registry: Address,
        lease: Address,
    ) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &owner);
        self.investor_registry.set(investor_registry);
        self.property_registry.set(property_registry);
        self.lease.set(lease);
    }

    // =============================================================================
    // Admin Configuration
    // =============================================================================

    /// Sets the investor registry used for wallet verifications checks
    /// @dev Restricted to `DEFAULT_ADMIN_ROLE`. No zero-address guard is applied
    ///      per the project's `odra.rulebook.md` (Security: Address Handling),
    ///      as Odra addresses have no default/zero value.
    pub fn set_investor_registry(&mut self, investor_registry: Address) {
        if !self
            .access_control
            .has_role(&DEFAULT_ADMIN_ROLE, &self.env().caller())
        {
            self.env().revert(Error::NotAuthorized);
        }

        self.investor_registry.set(investor_registry);

        self.env()
            .emit_event(InvestorRegistrySet { investor_registry });
    }

    /// Sets the property registry used for property lifecycle checks
    /// @dev Restricted to `DEFAULT_ADMIN_ROLE`. No zero-address guard is applied
    ///      per the project's `odra.rulebook.md` (Security: Address Handling),
    ///      as Odra addresses have no default/zero value.
    pub fn set_property_registry(&mut self, property_registry: Address) {
        if !self
            .access_control
            .has_role(&DEFAULT_ADMIN_ROLE, &self.env().caller())
        {
            self.env().revert(Error::NotAuthorized);
        }

        self.property_registry.set(property_registry);

        self.env()
            .emit_event(PropertyRegistrySet { property_registry });
    }

    /// Sets the lease contract used for equity-option eligibility checks.
    /// @dev Restricted to `DEFAULT_ADMIN_ROLE`. No zero-address guard is applied
    ///      per the project's `odra.rulebook.md` (Security: Address Handling),
    ///      as Odra addresses have no default/zero value.
    pub fn set_lease(&mut self, lease: Address) {
        if !self
            .access_control
            .has_role(&DEFAULT_ADMIN_ROLE, &self.env().caller())
        {
            self.env().revert(Error::NotAuthorized);
        }

        self.lease.set(lease);

        self.env().emit_event(LeaseSet { lease });
    }

    /// Sets the transfer configuration for a property
    /// Restricted to the `COMPLIANCE_MANAGER`.
    /// @dev Transfers are disabled by default. A property must also be active in `PropertyRegistry`
    ///      before normal transfers can pass.
    pub fn set_compliance_config(&mut self, property_id: U256, config: ComplianceConfig) {
        self.assert_role(ROLE_COMPLIANCE_MANAGER);

        let transfers_enabled = config.transfers_enabled;
        let equity_distribution_requires_lease_option =
            config.equity_distribution_requires_lease_option;

        self.configs.set(&property_id, config);

        self.env().emit_event(ComplianceConfigSet {
            property_id,
            transfers_enabled,
            equity_distribution_requires_lease_option,
        });
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

    /// Returns the lease contract address.
    pub fn get_lease_contract(&self) -> Address {
        *self.lease.address()
    }

    /// Returns the compliance config for a property
    pub fn get_compliance_config(&self, property_id: U256) -> ComplianceConfig {
        self.configs.get(&property_id).unwrap_or(ComplianceConfig {
            transfers_enabled: false,
            equity_distribution_requires_lease_option: false,
        })
    }

    /// Returns `true` if `account` is exempt from investor verification checks, `false` otherwise.
    pub fn is_transfer_exempt(&self, account: Address) -> bool {
        self.transfer_exempt_accounts.get(&account).unwrap_or(false)
    }

    // =========================================================================
    // Compliance Checks
    // =========================================================================

    #[odra(non_reentrant)]
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

    #[odra(non_reentrant)]
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

    fn get_transfer_error(
        &self,
        property_id: U256,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Option<Error> {
        if amount.is_zero() {
            return Some(Error::ZeroAmount);
        }

        // Only the registered token for a property can receive a passing transfer approval for that property.
        if self
            .property_registry
            .get_property_id_by_token(self.env().caller())
            != Some(property_id)
        {
            return Some(Error::InvalidPropertyToken);
        }

        if !self.property_registry.is_property_active(property_id) {
            return Some(Error::PropertyNotActive);
        }

        let config = self.get_compliance_config(property_id);

        if !config.transfers_enabled {
            return Some(Error::TransfersDisabled);
        }

        let from_exempt = self.is_transfer_exempt(from);
        let to_exempt = self.is_transfer_exempt(to);

        if !from_exempt && !self.investor_registry.is_verified(from) {
            return Some(Error::SenderNotVerified);
        }

        if !to_exempt && !self.investor_registry.is_verified(to) {
            return Some(Error::RecipientNotVerified);
        }

        let is_equity_distribution = from_exempt && !to_exempt;

        if is_equity_distribution
            && config.equity_distribution_requires_lease_option
            && !self.lease.is_equity_eligible(property_id, to)
        {
            return Some(Error::RecipientNotEquityEligible);
        }

        None
    }
}
