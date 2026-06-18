use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::{
    property_registry::{
        errors::Error,
        events::{
            PropertyCreated, PropertyMetadataSet, PropertyStatusSet, PropertyTokenSet,
            UserRegistrySet,
        },
        types::{CreatePropertyParams, PropertyRecord, PropertyStatus},
    },
    user_registry::UserRegistryContractRef,
};

// =============================================================================
// Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    #[odra::odra_type]
    #[derive(Copy)]
    pub enum PropertyStatus {
        /// Property can still be configured before activation.
        Draft,
        /// Property is live and can be used by lease/compliance flows.
        Active,
        /// Property is temporarily paused.
        Paused,
        /// Property has been sold.
        Sold,
        /// Property is in liquidation.
        Liquidating,
        /// Property lifecycle is complete.
        Closed,
    }

    #[odra::odra_type]
    pub struct CreatePropertyParams {
        /// User ID of the property issuer/landlord.
        pub issuer: U256,
        /// Total ownership token supply intended for the property.
        pub total_supply: U256,
        /// Metadata URI or content hash for the property.
        pub metadata_uri: String,
    }

    #[odra::odra_type]
    pub struct PropertyRecord {
        /// User ID of the property issuer/landlord.
        pub issuer: U256,
        /// Property ownership token address, set while Draft.
        pub token: Option<Address>,
        /// Total ownership token supply intended for the property.
        pub total_supply: U256,
        /// Metadata URI or content hash for the property.
        pub metadata_uri: String,
        /// Current property lifecycle status.
        pub status: PropertyStatus,
    }
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use crate::property_registry::types::PropertyStatus;
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct PropertyCreated {
        pub property_id: U256,
        pub issuer: U256,
        pub total_supply: U256,
        pub metadata_uri: String,
    }

    #[odra::event]
    pub struct PropertyTokenSet {
        pub property_id: U256,
        pub token: Address,
    }

    #[odra::event]
    pub struct PropertyStatusSet {
        pub property_id: U256,
        pub status: PropertyStatus,
    }

    #[odra::event]
    pub struct PropertyMetadataSet {
        pub property_id: U256,
    }

    #[odra::event]
    pub struct UserRegistrySet {
        pub user_registry: Address,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotPropertyManager = 900,
        InvalidPropertyId = 901,
        ZeroTotalSupply = 902,
        EmptyMetadataUri = 903,
        PropertyNotDraft = 904,
        MissingPropertyToken = 905,
        InvalidStatusTransition = 907,
        PropertyTokenAlreadyRegistered = 908,
        NotAuthorized = 909,
        InvalidIssuer = 910,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
    PropertyCreated,
    PropertyMetadataSet,
    PropertyStatusSet,
    PropertyTokenSet,
    UserRegistrySet
])]
pub struct PropertyRegistry {
    /// Access control for registry administration.
    access_control: SubModule<AccessControl>,
    /// User registry used for property-manager authorization and issuer user IDs.
    user_registry: External<UserRegistryContractRef>,
    /// Property records keyed by property ID.
    properties: Mapping<U256, PropertyRecord>,
    /// Number of properties created.
    properties_count: Sequence<U256>,
    /// Reverse lookup from property token address to property ID.
    token_to_property_id: Mapping<Address, Option<U256>>,
}

#[odra::module]
impl PropertyRegistry {
    // =============================================================================
    // Initialization
    // =============================================================================

    /// Initializes the registry and sets the UserRegistry dependency.
    pub fn init(&mut self, owner: Address, user_registry: Address) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &owner);
        self.user_registry.set(user_registry);
    }

    // =============================================================================
    // Admin Configuration
    // =============================================================================

    /// Sets the UserRegistry contract address.
    /// Restricted to `DEFAULT_ADMIN_ROLE`.
    pub fn set_user_registry(&mut self, user_registry: Address) {
        self.assert_admin();
        self.user_registry.set(user_registry);

        self.env().emit_event(UserRegistrySet { user_registry });
    }

    /// Sets the property ownership token address.
    /// Restricted to `PROPERTY_MANAGER`.
    /// @dev The property must still be in `Draft` status. Once active, the token address is
    ///      treated as part of the property identity.
    pub fn set_property_token(&mut self, property_id: U256, token: Address) {
        self.assert_property_manager();

        let mut property = self.get_property(property_id);
        self.assert_draft(&property);

        // Prevent the same token address from being assigned to two different properties.
        if let Some(existing_property_id) = self.get_property_id_by_token(token) {
            if existing_property_id != property_id {
                self.env().revert(Error::PropertyTokenAlreadyRegistered);
            }
        }

        // If this draft property already had a different token, clear the stale reverse lookup.
        if let Some(old_token) = property.token {
            if old_token != token {
                self.token_to_property_id.set(&old_token, None);
            }
        }

        property.token = Some(token);
        self.properties.set(&property_id, property);
        self.token_to_property_id.set(&token, Some(property_id));

        self.env()
            .emit_event(PropertyTokenSet { property_id, token });
    }

    /// Updates the metadata URI or content hash for a draft property.
    /// Restricted to `PROPERTY_MANAGER`.
    /// @dev Metadata must not contain private investor data.
    pub fn set_metadata_uri(&mut self, property_id: U256, metadata_uri: String) {
        self.assert_property_manager();

        if metadata_uri.is_empty() {
            self.env().revert(Error::EmptyMetadataUri);
        }

        let mut property = self.get_property(property_id);
        self.assert_draft(&property);

        property.metadata_uri = metadata_uri;
        self.properties.set(&property_id, property);

        self.env().emit_event(PropertyMetadataSet { property_id });
    }

    /// Updates the lifecycle status of a property.
    /// Restricted to `PROPERTY_MANAGER`.
    /// @dev Moving to `Active` requires both token and revenue distributor addresses to be set.
    pub fn set_property_status(&mut self, property_id: U256, status: PropertyStatus) {
        self.assert_property_manager();

        let mut property = self.get_property(property_id);

        // Prevent demoting a property back to Draft status.
        // Draft status allows modification of immutable-once-active fields (like the token address);
        // allowing this transition would enable silent token replacement on live properties.
        if !matches!(property.status, PropertyStatus::Draft)
            && matches!(status, PropertyStatus::Draft)
        {
            self.env().revert(Error::InvalidStatusTransition);
        }

        // Terminal state guards
        match property.status {
            PropertyStatus::Sold | PropertyStatus::Closed => {
                self.env().revert(Error::InvalidStatusTransition);
            }
            PropertyStatus::Liquidating => {
                if !matches!(status, PropertyStatus::Closed) {
                    self.env().revert(Error::InvalidStatusTransition);
                }
            }
            _ => {}
        }

        if let PropertyStatus::Active = status {
            if property.token.is_none() {
                self.env().revert(Error::MissingPropertyToken);
            }
        }

        property.status = status;
        self.properties.set(&property_id, property);

        self.env().emit_event(PropertyStatusSet {
            property_id,
            status,
        });
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    /// Returns the property record for `property_id`.
    pub fn get_property(&self, property_id: U256) -> PropertyRecord {
        self.properties
            .get(&property_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidPropertyId)
    }

    /// Returns the property token address
    pub fn get_property_token(&self, property_id: U256) -> Address {
        self.get_property(property_id)
            .token
            .unwrap_or_revert_with(&self.env(), Error::MissingPropertyToken)
    }

    /// Returns the property Id associated with the token address.
    pub fn get_property_id_by_token(&self, token: Address) -> Option<U256> {
        self.token_to_property_id.get(&token).unwrap_or(None)
    }

    /// Returns the UserRegistry contract address.
    pub fn get_user_registry_contract_address(&self) -> Address {
        *self.user_registry.address()
    }

    /// Returns true if the property exist and is active.
    pub fn is_property_active(&self, property_id: U256) -> bool {
        self.properties
            .get(&property_id)
            .is_some_and(|r| matches!(r.status, PropertyStatus::Active))
    }

    // =============================================================================
    // Property Creation
    // =============================================================================

    /// Creates a property record in `Draft` status.
    /// Restricted to `PROPERTY_MANAGER`.
    /// @dev Token address is intentionally set later so deployment can be done in small, verifiable steps.
    pub fn create_property(&mut self, params: CreatePropertyParams) -> U256 {
        self.assert_property_manager();

        if !self.user_registry.is_active_user(params.issuer)
            || !self.user_registry.has_landlord_role(params.issuer)
        {
            self.env().revert(Error::InvalidIssuer);
        }

        if params.metadata_uri.is_empty() {
            self.env().revert(Error::EmptyMetadataUri);
        }

        let property_id = self.properties_count.next_value();
        let issuer = params.issuer;
        let total_supply = params.total_supply;
        let metadata_uri = params.metadata_uri;

        self.properties.set(
            &property_id,
            PropertyRecord {
                issuer,
                token: None,
                total_supply,
                metadata_uri: metadata_uri.clone(),
                status: PropertyStatus::Draft,
            },
        );

        self.env().emit_event(PropertyCreated {
            property_id,
            issuer,
            total_supply,
            metadata_uri,
        });

        property_id
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

impl PropertyRegistry {
    fn assert_admin(&self) {
        if !self
            .access_control
            .has_role(&DEFAULT_ADMIN_ROLE, &self.env().caller())
        {
            self.env().revert(Error::NotAuthorized);
        }
    }

    fn assert_property_manager(&self) {
        let caller = self.env().caller();
        let Some(user_id) = self.user_registry.get_user_id_by_wallet(caller) else {
            self.env().revert(Error::CallerNotPropertyManager);
        };

        if !self.user_registry.is_active_user(user_id)
            || !self.user_registry.is_active_wallet(user_id, caller)
            || !self.user_registry.has_property_manager_role(user_id)
        {
            self.env().revert(Error::CallerNotPropertyManager);
        }
    }

    fn assert_draft(&self, property: &PropertyRecord) {
        if let PropertyStatus::Draft = property.status {
            return;
        }

        self.env().revert(Error::PropertyNotDraft);
    }
}
