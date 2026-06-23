use odra::{casper_types::U256, prelude::*};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::common;
use crate::user_registry::types::UserStatus;
use crate::user_registry::{
    errors::Error,
    events::{ActiveWalletReplaced, UserCreated, UserRoleFlagsSet, UserStatusSet},
    types::UserRecord,
};

// =============================================================================
// Roles
// =============================================================================

/// Role allowed to create users and replace active wallets after off-chain identity checks.
pub const ROLE_IDENTITY_MANAGER: &str = "IDENTITY_MANAGER";
/// Role allowed to update additive user capability flags, i.e. tenant and/or landlord.
pub const ROLE_USER_ROLE_MANAGER: &str = "USER_ROLE_MANAGER";

/// User can act as a tenant.
pub const ROLE_FLAG_TENANT: u32 = 1;
/// User can act as a landlord.
pub const ROLE_FLAG_LANDLORD: u32 = 1 << 1;
/// User can act as a property manager.
pub const ROLE_FLAG_PROPERTY_MANAGER: u32 = 1 << 2;

// =============================================================================
// User Registry Types
// =============================================================================

pub mod types {
    use odra::prelude::*;

    #[odra::odra_type]
    #[derive(Copy)]
    pub enum UserStatus {
        /// User can participate in protocol flows.
        Active,
        /// User remains registered but should not be treated as active.
        Suspended,
    }

    #[odra::odra_type]
    pub struct UserRecord {
        /// Backend generated identity hash; must not contain raw PII.
        pub identity_hash: [u8; 32],
        /// Wallet currently authorized to act for the user.
        pub active_wallet: Address,
        /// Additive capability flags such as tenant, landlord and/or property manager.
        pub role_flags: u32,
        /// Current user lifecycle status.
        pub status: UserStatus,
    }
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use crate::user_registry::types::UserStatus;
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct UserCreated {
        pub user_id: U256,
        pub active_wallet: Address,
        pub role_flags: u32,
    }

    #[odra::event]
    pub struct ActiveWalletReplaced {
        pub user_id: U256,
        pub old_wallet: Address,
        pub new_wallet: Address,
    }

    #[odra::event]
    pub struct UserStatusSet {
        pub user_id: U256,
        pub status: UserStatus,
    }

    #[odra::event]
    pub struct UserRoleFlagsSet {
        pub user_id: U256,
        pub role_flags: u32,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        NotAuthorized = 1200,
        MissingIdentityHash = 1201,
        IdentityAlreadyRegistered = 1202,
        InvalidUserId = 1203,
        WalletAlreadyLinked = 1204,
        WalletAlreadyActive = 1205,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
  ActiveWalletReplaced,
  UserCreated,
  UserStatusSet,
  UserRoleFlagsSet,
])]
pub struct UserRegistry {
    /// Access control for identity and role managers.
    access_control: SubModule<AccessControl>,
    /// User records keyed by stable user ID.
    users: Mapping<U256, UserRecord>,
    /// All wallets linked to each user keyed by user ID.
    user_wallets: Mapping<U256, Vec<Address>>,
    /// Permanent lookup from any linked wallet to its user ID.
    wallet_to_user_id: Mapping<Address, Option<U256>>,
    /// Reverse lookup from identity hash to user ID.
    identity_to_user_id: Mapping<[u8; 32], Option<U256>>,
    /// Number of users created.
    users_count: Var<U256>,
}

#[odra::module]
impl UserRegistry {
    // =========================================================================
    // Initialization
    // =========================================================================

    pub fn init(&mut self, owner: Address) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &owner);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /// Returns the user record for `user_id`
    pub fn get_user(&self, user_id: U256) -> UserRecord {
        self.users
            .get(&user_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidUserId)
    }

    /// Returns the number of users created through this registry.
    pub fn get_users_count(&self) -> U256 {
        self.users_count.get_or_default()
    }

    /// Returns the user ID for `identity_hash`, if registered.
    pub fn get_user_id_by_identity_hash(&self, identity_hash: [u8; 32]) -> Option<U256> {
        self.identity_to_user_id.get(&identity_hash).unwrap_or(None)
    }

    /// Returns the user ID for `wallet`, if the wallet has ever been linked.
    pub fn get_user_id_by_wallet(&self, wallet: Address) -> Option<U256> {
        self.wallet_to_user_id.get(&wallet).unwrap_or(None)
    }

    /// Returns every wallet linked to `user_id`.
    pub fn get_user_wallets(&self, user_id: U256) -> Vec<Address> {
        // Validate the user exists
        self.get_user(user_id);

        self.user_wallets.get_or_default(&user_id)
    }

    /// Returns the user's current active wallet.
    pub fn get_active_wallet(&self, user_id: U256) -> Address {
        self.get_user(user_id).active_wallet
    }

    /// Returns true if the wallet is linked to user.
    pub fn is_linked_wallet(&self, user_id: U256, wallet: Address) -> bool {
        self.get_user_id_by_wallet(wallet) == Some(user_id)
    }

    /// Returns true when `wallet` is the user's current active wallet.
    pub fn is_active_wallet(&self, user_id: U256, wallet: Address) -> bool {
        self.get_active_wallet(user_id) == wallet && self.is_linked_wallet(user_id, wallet)
    }

    /// Returns true when the user exists and is active.
    pub fn is_active_user(&self, user_id: U256) -> bool {
        matches!(self.get_user(user_id).status, UserStatus::Active)
    }

    /// Returns true when `user_id` has every bit in `role_flag`.
    pub fn has_role_flag(&self, user_id: U256, role_flag: u32) -> bool {
        let record = self.get_user(user_id);
        role_flag != 0 && record.role_flags & role_flag == role_flag
    }

    /// Returns true if the user has tenant capability.
    pub fn has_tenant_role(&self, user_id: U256) -> bool {
        self.has_role_flag(user_id, ROLE_FLAG_TENANT)
    }

    /// Returns true if the user has the landlord capability.
    pub fn has_landlord_role(&self, user_id: U256) -> bool {
        self.has_role_flag(user_id, ROLE_FLAG_LANDLORD)
    }

    /// Returns true if the user has the property manager capability.
    pub fn has_property_manager_role(&self, user_id: U256) -> bool {
        self.has_role_flag(user_id, ROLE_FLAG_PROPERTY_MANAGER)
    }

    /// Returns the tenant capability flag value.
    pub fn tenant_role_flag(&self) -> u32 {
        ROLE_FLAG_TENANT
    }

    /// Returns the landlord capability flag value.
    pub fn landlord_role_flag(&self) -> u32 {
        ROLE_FLAG_LANDLORD
    }

    /// Returns the property manager capability flag value.
    pub fn property_manager_role_flag(&self) -> u32 {
        ROLE_FLAG_PROPERTY_MANAGER
    }

    // =========================================================================
    // Identity Management
    // =========================================================================

    /// Creates a user record linked to one active wallet.
    /// (TEMPORARY: role restriction removed for testnet; was Restricted to `IDENTITY_MANAGER`.)
    /// @dev `identity_hash` must be an opaque backend-generated identifier.
    pub fn create_user(
        &mut self,
        identity_hash: [u8; 32],
        initial_wallet: Address,
        role_flags: u32,
    ) -> U256 {
        // TEMPORARY (testnet/hackathon): role gate removed; frontend calls from user wallets.
        // Restore: self.assert_role(ROLE_IDENTITY_MANAGER);
        self.assert_valid_identity_hash(identity_hash);
        self.assert_identity_available(identity_hash);
        self.assert_wallet_never_linked(initial_wallet);

        let user_id = self.get_users_count();

        self.users.set(
            &user_id,
            UserRecord {
                identity_hash,
                active_wallet: initial_wallet,
                role_flags,
                status: UserStatus::Active,
            },
        );

        self.identity_to_user_id.set(&identity_hash, Some(user_id));
        self.link_wallet_to_user(user_id, initial_wallet);

        self.users_count.set(user_id + 1);

        self.env().emit_event(UserCreated {
            user_id,
            active_wallet: initial_wallet,
            role_flags,
        });

        user_id
    }

    /// Replaces the user's active wallet.
    /// @dev `new_wallet` may be new or already linked to the same user.
    /// Restricted to `IDENTITY_MANAGER`.
    pub fn replace_active_wallet(&mut self, user_id: U256, new_wallet: Address) {
        self.assert_role(ROLE_IDENTITY_MANAGER);

        let mut record = self.get_user(user_id);
        let old_wallet = record.active_wallet;

        self.assert_wallet_not_already_active(old_wallet, new_wallet);
        self.assert_wallet_not_linked_to_other_user(user_id, new_wallet);

        if self.get_user_id_by_wallet(new_wallet).is_none() {
            self.link_wallet_to_user(user_id, new_wallet);
        }

        record.active_wallet = new_wallet;
        self.users.set(&user_id, record);

        self.env().emit_event(ActiveWalletReplaced {
            user_id,
            old_wallet,
            new_wallet,
        });
    }

    /// Sets whether user is active or suspended.
    /// Restricted to `IDENTITY_MANAGER`.
    pub fn set_user_status(&mut self, user_id: U256, status: UserStatus) {
        self.assert_role(ROLE_IDENTITY_MANAGER);

        let mut record = self.get_user(user_id);
        record.status = status;
        self.users.set(&user_id, record);

        self.env().emit_event(UserStatusSet { user_id, status });
    }

    /// Sets additive capability flags for a user.
    /// Restricted to `USER_ROLE_MANAGER`.
    pub fn set_user_role_flags(&mut self, user_id: U256, role_flags: u32) {
        self.assert_role(ROLE_USER_ROLE_MANAGER);

        let mut record = self.get_user(user_id);
        record.role_flags = role_flags;
        self.users.set(&user_id, record);

        self.env().emit_event(UserRoleFlagsSet {
            user_id,
            role_flags,
        });
    }

    // =========================================================================
    // Role Getters
    // =========================================================================

    /// Returns the role hash for accounts allowed to create users and replace wallets.
    pub fn identity_manager_role(&self) -> Role {
        common::hash_role(ROLE_IDENTITY_MANAGER)
    }

    /// Returns the role hash for accounts allowed to update user role flags.
    pub fn user_role_manager_role(&self) -> Role {
        common::hash_role(ROLE_USER_ROLE_MANAGER)
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
// Internal Helpers
// =============================================================================

impl UserRegistry {
    #[inline]
    fn assert_role(&self, role_name: &str) {
        let role = common::hash_role(role_name);

        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::NotAuthorized);
        }
    }

    #[inline]
    fn assert_valid_identity_hash(&self, identity_hash: [u8; 32]) {
        if identity_hash == [0u8; 32] {
            self.env().revert(Error::MissingIdentityHash);
        }
    }

    #[inline]
    fn assert_identity_available(&self, identity_hash: [u8; 32]) {
        if self
            .identity_to_user_id
            .get(&identity_hash)
            .unwrap_or(None)
            .is_some()
        {
            self.env().revert(Error::IdentityAlreadyRegistered);
        }
    }

    #[inline]
    fn assert_wallet_never_linked(&self, wallet: Address) {
        if self.get_user_id_by_wallet(wallet).is_some() {
            self.env().revert(Error::WalletAlreadyLinked);
        }
    }

    #[inline]
    fn assert_wallet_not_already_active(&self, active_wallet: Address, wallet: Address) {
        if active_wallet == wallet {
            self.env().revert(Error::WalletAlreadyActive);
        }
    }

    #[inline]
    fn assert_wallet_not_linked_to_other_user(&self, user_id: U256, wallet: Address) {
        if let Some(linked_user_id) = self.get_user_id_by_wallet(wallet) {
            if linked_user_id != user_id {
                self.env().revert(Error::WalletAlreadyLinked);
            }
        }
    }

    #[inline]
    fn link_wallet_to_user(&mut self, user_id: U256, wallet: Address) {
        self.wallet_to_user_id.set(&wallet, Some(user_id));

        let mut wallets = self.user_wallets.get_or_default(&user_id);
        if !wallets.contains(&wallet) {
            wallets.push(wallet);
            self.user_wallets.set(&user_id, wallets);
        }
    }
}
