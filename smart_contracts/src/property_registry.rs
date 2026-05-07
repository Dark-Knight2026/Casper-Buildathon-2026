use odra::{casper_types::U256, prelude::*};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::common;

use crate::property_registry::{
    errors::Error,
    events::{
        PropertyCreated, PropertyMetadataSet, PropertyStatusSet, PropertyTokenSet,
        RevenueDistributorSet,
    },
    types::{CreatePropertyParams, PropertyRecord, PropertyStatus},
};

// =============================================================================
// Roles
// =============================================================================

pub const ROLE_PROPERTY_MANAGER: &str = "PROPERTY_MANAGER";

// =============================================================================
// Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    #[odra::odra_type]
    #[derive(Copy)]
    pub enum PropertyStatus {
        Draft,
        Active,
        Paused,
        Sold,
        Liquidating,
        Closed,
    }

    #[odra::odra_type]
    pub struct CreatePropertyParams {
        pub issuer: Address,
        pub total_supply: U256,
        pub metadata_uri: String,
    }

    #[odra::odra_type]
    pub struct PropertyRecord {
        pub issuer: Address,
        pub token: Option<Address>,
        pub revenue_distributor: Option<Address>,
        pub total_supply: U256,
        pub metadata_uri: String,
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
        pub issuer: Address,
        pub total_supply: U256,
    }

    #[odra::event]
    pub struct PropertyTokenSet {
        pub property_id: U256,
        pub token: Address,
    }

    #[odra::event]
    pub struct RevenueDistributorSet {
        pub property_id: U256,
        pub revenue_distributor: Address,
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
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        NotAuthorized = 900,
        InvalidPropertyId = 901,
        ZeroTotalSupply = 902,
        EmptyMetadataUri = 903,
        PropertyNotDraft = 904,
        MissingPropertyToken = 905,
        MissingRevenueDistributor = 906,
        InvalidStatusTransition = 907,
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
    RevenueDistributorSet
])]
pub struct PropertyRegistry {
    access_control: SubModule<AccessControl>,
    properties: Mapping<U256, PropertyRecord>,
    properties_count: Var<U256>,
}

#[odra::module]
impl PropertyRegistry {
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

    /// Sets the property ownership token address.
    /// Restricted to `PROPERTY_MANAGER`.
    /// @dev The property must still be in `Draft` status. Once active, the token address is
    ///      treated as part of the property identity.
    pub fn set_property_token(&mut self, property_id: U256, token: Address) {
        self.assert_role(ROLE_PROPERTY_MANAGER);

        let mut property = self.get_property(property_id);
        self.assert_draft(&property);

        property.token = Some(token);
        self.properties.set(&property_id, property);

        self.env()
            .emit_event(PropertyTokenSet { property_id, token });
    }

    /// Sets the property revenue distributor address.
    /// Restricted to `PROPERTY_MANAGER`.
    /// @dev The property must still be in `Draft` status.
    pub fn set_revenue_distributor(&mut self, property_id: U256, revenue_distributor: Address) {
        self.assert_role(ROLE_PROPERTY_MANAGER);

        let mut property = self.get_property(property_id);
        self.assert_draft(&property);

        property.revenue_distributor = Some(revenue_distributor);
        self.properties.set(&property_id, property);

        self.env().emit_event(RevenueDistributorSet {
            property_id,
            revenue_distributor,
        });
    }

    /// Updates the metadata URI or content hash for a draft property.
    /// Restricted to `PROPERTY_MANAGER`.
    /// @dev Metadata must not contain private investor data.
    pub fn set_metadata_uri(&mut self, property_id: U256, metadata_uri: String) {
        self.assert_role(ROLE_PROPERTY_MANAGER);

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
        self.assert_role(ROLE_PROPERTY_MANAGER);

        let mut property = self.get_property(property_id);

        // Prevent demoting a property back to Draft status.
        // Draft status allows modification of immutable-once-active fields (like the token address);
        // allowing this transition would enable silent token replacement on live properties.
        if !matches!(property.status, PropertyStatus::Draft)
            && matches!(status, PropertyStatus::Draft)
        {
            self.env().revert(Error::InvalidStatusTransition);
        }

        if let PropertyStatus::Active = status {
            if property.token.is_none() {
                self.env().revert(Error::MissingPropertyToken);
            }
            if property.revenue_distributor.is_none() {
                self.env().revert(Error::MissingRevenueDistributor);
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

    /// Returns the number of property records created.
    pub fn get_properties_count(&self) -> U256 {
        self.properties_count.get_or_default()
    }

    /// Returns the property token address
    pub fn get_property_token(&self, property_id: U256) -> Address {
        self.get_property(property_id)
            .token
            .unwrap_or_revert_with(&self.env(), Error::MissingPropertyToken)
    }

    /// Returns the property revenue distributor address
    pub fn get_revenue_distributor(&self, property_id: U256) -> Address {
        self.get_property(property_id)
            .revenue_distributor
            .unwrap_or_revert_with(&self.env(), Error::MissingRevenueDistributor)
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
    /// @dev Token and revenue distributor addresses are intentionally set later so deployment can be done in small, verifiable steps.
    pub fn create_property(&mut self, params: CreatePropertyParams) -> U256 {
        self.assert_role(ROLE_PROPERTY_MANAGER);

        if params.total_supply.is_zero() {
            self.env().revert(Error::ZeroTotalSupply);
        }
        if params.metadata_uri.is_empty() {
            self.env().revert(Error::EmptyMetadataUri);
        }

        let property_id = self.get_properties_count();
        let issuer = params.issuer;
        let total_supply = params.total_supply;

        self.properties.set(
            &property_id,
            PropertyRecord {
                issuer,
                token: None,
                revenue_distributor: None,
                total_supply,
                metadata_uri: params.metadata_uri,
                status: PropertyStatus::Draft,
            },
        );

        self.properties_count.set(property_id + 1);

        self.env().emit_event(PropertyCreated {
            property_id,
            issuer,
            total_supply,
        });

        property_id
    }

    // =========================================================================
    // Role Getters
    // =========================================================================

    /// Returns the role hash for accounts allowed to manage property records.
    pub fn property_manager_role(&self) -> Role {
        common::hash_role(ROLE_PROPERTY_MANAGER)
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
    fn assert_role(&self, role_name: &str) {
        let role = common::hash_role(role_name);

        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::NotAuthorized);
        }
    }

    fn assert_draft(&self, property: &PropertyRecord) {
        if let PropertyStatus::Draft = property.status {
            return;
        }

        self.env().revert(Error::PropertyNotDraft);
    }
}
