use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{
    access::{AccessControl, Role, DEFAULT_ADMIN_ROLE},
    cep18_token::Cep18,
};

use crate::{
    common,
    compliance_policy::CompliancePolicyContractRef,
    constants::COMPLIANCE_POLICY_UPDATE_TIMELOCK,
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
        CompliancePolicyUpdateTimelockNotElapsed = 1105,
        NoPendingCompliancePolicy = 1106,
        AlreadyInitialized = 1107,
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
    pending_compliance_policy: Var<Option<Address>>,
    pending_compliance_policy_activation_time: Var<u64>,
    initialized: Var<bool>,
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
        if self.initialized.get_or_default() {
            self.env().revert(Error::AlreadyInitialized);
        }

        self.validate_init_params(&params);

        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &params.owner);

        self.property_id.set(params.property_id);
        self.compliance_policy.set(params.compliance_policy);
        self.pending_compliance_policy.set(None);
        self.pending_compliance_policy_activation_time.set(0);

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

        self.initialized.set(true);
    }

    // =============================================================================
    // Admin Configuration
    // =============================================================================

    /// Proposes an update to the compliance policy used by this property token.
    /// The change is subject to a timelock and must be applied later via `apply_compliance_policy`.
    /// Restricted to `TOKEN_MANAGER`.
    /// @dev This prevents instantaneous bypass of ERC-3643 KYC/compliance by swapping
    ///      to a no-op policy. The timelock gives time for reaction (e.g. by admins or monitoring).
    pub fn set_compliance_policy(&mut self, compliance_policy: Address) {
        self.assert_role(ROLE_TOKEN_MANAGER);

        let activation_time = self.env().get_block_time() + COMPLIANCE_POLICY_UPDATE_TIMELOCK;
        self.pending_compliance_policy.set(Some(compliance_policy));
        self.pending_compliance_policy_activation_time
            .set(activation_time);
        // Actual CompliancePolicySet event is emitted only upon successful apply (after timelock).
    }

    /// Applies a previously proposed compliance policy change, if the timelock has elapsed.
    /// Restricted to `TOKEN_MANAGER`.
    pub fn apply_compliance_policy(&mut self) {
        self.assert_role(ROLE_TOKEN_MANAGER);

        let activation_time = self
            .pending_compliance_policy_activation_time
            .get_or_default();
        if self.env().get_block_time() < activation_time {
            self.env()
                .revert(Error::CompliancePolicyUpdateTimelockNotElapsed);
        }

        let pending = self.pending_compliance_policy.get_or_default();
        let compliance_policy =
            pending.unwrap_or_revert_with(&self.env(), Error::NoPendingCompliancePolicy);

        self.compliance_policy.set(compliance_policy);
        self.pending_compliance_policy.set(None);
        self.pending_compliance_policy_activation_time.set(0);

        self.env()
            .emit_event(CompliancePolicySet { compliance_policy });
    }

    /// Cancels any pending compliance policy update.
    /// Restricted to `TOKEN_MANAGER`.
    pub fn cancel_pending_compliance_policy(&mut self) {
        self.assert_role(ROLE_TOKEN_MANAGER);
        self.pending_compliance_policy.set(None);
        self.pending_compliance_policy_activation_time.set(0);
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

    /// Returns the currently proposed (pending) compliance policy, if any.
    pub fn get_pending_compliance_policy(&self) -> Option<Address> {
        self.pending_compliance_policy.get_or_default()
    }

    /// Returns the timestamp after which the pending compliance policy can be applied.
    pub fn get_pending_compliance_policy_activation_time(&self) -> u64 {
        self.pending_compliance_policy_activation_time
            .get_or_default()
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
