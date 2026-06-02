use odra::{casper_types::U256, prelude::*};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::common;
use crate::user_registry::errors::Error;
use crate::user_registry::types::{UserRecord, WalletStatus};

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

#[odra::module(errors = Error, events = [])]
pub struct UserRegistry {
    /// Access control for identity and role managers.
    access_control: SubModule<AccessControl>,
    /// User records keyed by stable user ID.
    users: Mapping<U256, UserRecord>,
    /// Reverse lookup from identity hash to user ID.
    identity_to_user_id: Mapping<Address, Option<U256>>,
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
}
