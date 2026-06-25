use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{
    access::{AccessControl, Role, DEFAULT_ADMIN_ROLE},
    cep18_token::Cep18,
};

use crate::{
    common,
    compliance_policy::CompliancePolicyContractRef,
    property_fraction_token::{
        errors::Error,
        events::{CompliancePolicySet, PropertyFractionTokenInitialized},
        types::PropertyFractionTokenInitParams,
    },
};

// =============================================================================
// Roles
// =============================================================================

pub const ROLE_TOKEN_MANAGER: &str = "TOKEN_MANAGER";

// =============================================================================
// Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    #[odra::odra_type]
    pub struct PropertyFractionTokenInitParams {
        pub owner: Address,
        pub property_id: U256,
        pub compliance_policy: Address,
        pub symbol: String,
        pub name: String,
        pub decimals: u8,
        pub initial_supply: U256,
        pub initial_holder: Address,
    }
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct CompliancePolicySet {
        pub compliance_policy: Address,
    }

    #[odra::event]
    pub struct PropertyFractionTokenInitialized {
        pub property_id: U256,
        pub initial_holder: Address,
        pub initial_supply: U256,
        pub compliance_policy: Address,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        NotAuthorized = 1100,
        EmptyName = 1101,
        EmptySymbol = 1102,
        InvalidDecimals = 1103,
        ZeroInitialSupply = 1104,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [CompliancePolicySet, PropertyFractionTokenInitialized])]
pub struct PropertyFractionToken {
    access_control: SubModule<AccessControl>,
    token: SubModule<Cep18>,
    compliance_policy: External<CompliancePolicyContractRef>,
    property_id: Var<U256>,
}

#[odra::module]
impl PropertyFractionToken {
    // =============================================================================
    // Initialization
    // =============================================================================

    /// Initializes a fixed supply property ownership token.
    /// @dev The full initial supply is minted once to `initial_holder`. This should normally
    ///      be an issuer or issuance escrow account, not an end investor.
    /// @dev Minting intentionally bypasses `CompliancePolicy` during initialization because
    ///      the property registry may not be active until this token address is deployed and
    ///      registered.
    pub fn init(&mut self, params: PropertyFractionTokenInitParams) {
        self.validate_init_params(&params);

        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &params.owner);

        self.property_id.set(params.property_id);
        self.compliance_policy.set(params.compliance_policy);

        self.token
            .init(params.symbol, params.name, params.decimals, U256::zero());
        self.token
            .raw_mint(&params.initial_holder, &params.initial_supply);

        self.env().emit_event(CompliancePolicySet {
            compliance_policy: params.compliance_policy,
        });

        self.env().emit_event(PropertyFractionTokenInitialized {
            property_id: params.property_id,
            initial_holder: params.initial_holder,
            initial_supply: params.initial_supply,
            compliance_policy: params.compliance_policy,
        });
    }

    // =============================================================================
    // Admin Configuration
    // =============================================================================

    /// Sets the compliance policy contract address.
    /// Restricted to `TOKEN_MANAGER`.
    pub fn set_compliance_policy(&mut self, compliance_policy: Address) {
        self.assert_role(ROLE_TOKEN_MANAGER);

        self.compliance_policy.set(compliance_policy);

        self.env()
            .emit_event(CompliancePolicySet { compliance_policy });
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    /// Returns the property ID represented by this token.
    pub fn get_property_id(&self) -> U256 {
        self.property_id.get_or_default()
    }

    /// Returns the compliance policy contract address
    pub fn get_compliance_policy_contract(&self) -> Address {
        *self.compliance_policy.address()
    }

    /// Returns the role hash for accounts allowed to manage token configuration
    pub fn token_manager_role(&self) -> Role {
        common::hash_role(ROLE_TOKEN_MANAGER)
    }

    // =============================================================================
    // Compliance-Aware Token Operations
    // =============================================================================

    /// Transfers property ownership tokens from the caller to `recipient`.
    /// @dev The transfer must pass `CompliancePolicy` before balances move.
    #[odra(non_reentrant)]
    pub fn transfer(&mut self, recipient: &Address, amount: &U256) {
        let sender = self.env().caller();

        self.assert_transfer_allowed(sender, *recipient, *amount);
        self.token.transfer(recipient, amount);
    }

    /// Transfers property ownership tokens using the caller's allowance.
    /// @dev Compliance is checked between the beneficial sender `owner` and `recipient`.
    ///      The spender is authorized by CEP-18 allowance mechanics.
    #[odra(non_reentrant)]
    pub fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
        self.assert_transfer_allowed(*owner, *recipient, *amount);
        self.token.transfer_from(owner, recipient, amount);
    }

    pub fn can_transfer(&self, from: Address, to: Address, amount: U256) -> bool {
        self.compliance_policy
            .can_transfer(self.get_property_id(), from, to, amount)
    }

    // =============================================================================
    // CEP-18 Delegation
    // =============================================================================

    delegate! {
        to self.token {
            fn approve(&mut self, spender: &Address, amount: &U256);
            fn decrease_allowance(&mut self, spender: &Address, decr_by: &U256);
            fn increase_allowance(&mut self, spender: &Address, inc_by: &U256);
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn decimals(&self) -> u8;
            fn total_supply(&self) -> U256;
            fn balance_of(&self, address: &Address) -> U256;
            fn allowance(&self, owner: &Address, spender: &Address) -> U256;
        }

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
// Internal Helpers
// =============================================================================

impl PropertyFractionToken {
    fn validate_init_params(&self, params: &PropertyFractionTokenInitParams) {
        if params.name.is_empty() {
            self.env().revert(Error::EmptyName);
        }

        if params.symbol.is_empty() {
            self.env().revert(Error::EmptySymbol);
        }

        if params.decimals > 18 {
            self.env().revert(Error::InvalidDecimals);
        }

        if params.initial_supply.is_zero() {
            self.env().revert(Error::ZeroInitialSupply);
        }
    }

    fn assert_role(&self, role_name: &str) {
        let role = common::hash_role(role_name);

        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::NotAuthorized);
        }
    }

    fn assert_transfer_allowed(&self, from: Address, to: Address, amount: U256) {
        self.compliance_policy
            .assert_can_transfer(self.get_property_id(), from, to, amount);
    }
}
