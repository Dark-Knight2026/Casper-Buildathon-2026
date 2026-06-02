use odra::{casper_types::U256, prelude::*};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::common;
use crate::user_registry::{
    errors::Error,
    events::UserCreated,
    types::{UserRecord, WalletStatus},
};

// =============================================================================
// Roles
// =============================================================================

/// Role allowed to create users and replac active wallets after off-chain identity checks.
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
    #[derive(Copy)]
    pub enum WalletStatus {
        /// Wallet is the user's current wallet.
        Active,
        /// Wallet was previously linked but is no longer authorized.
        Revoked,
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
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {}
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [UserCreated])]
pub struct UserRegistry {
    /// Access control for identity and role managers.
    access_control: SubModule<AccessControl>,
    /// User records keyed by stable user ID.
    users: Mapping<U256, UserRecord>,
    /// Reverse lookup from identity hash to user ID.
    identity_to_user_id: Mapping<[u8; 32], Option<U256>>,
    /// Reverse lookup from currently active wallet to user ID.
    wallet_to_user_id: Mapping<Address, Option<U256>>,
    /// Historical wallet status keyed by wallet address.
    wallet_statuses: Mapping<Address, WalletStatus>,
    /// Ordered wallet history keyed by user ID.
    wallet_history: Mapping<U256, Vec<Address>>,
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
    // Identity Management
    // =========================================================================

    pub fn create_user(
        &mut self,
        identity_hash: [u8; 32],
        initial_wallet: Address,
        role_flags: u32,
    ) -> U256 {
        // TODO: Add asserts

        let user_id = self.get_users_count();

        self.users.set(
            &user_id,
            UserRecord {
                identity_hash,
                active_wallet: initial_wallet,
                role_flags,
                status: types::UserStatus::Active,
            },
        );

        self.identity_to_user_id.set(&identity_hash, Some(user_id));
        self.wallet_to_user_id.set(&initial_wallet, Some(user_id));

        self.wallet_statuses
            .set(&initial_wallet, WalletStatus::Active);
        self.wallet_history.set(&user_id, vec![initial_wallet]);

        self.users_count.set(user_id + 1);

        self.env().emit_event(UserCreated {
            user_id,
            active_wallet: initial_wallet,
            role_flags,
        });

        user_id
    }
}
