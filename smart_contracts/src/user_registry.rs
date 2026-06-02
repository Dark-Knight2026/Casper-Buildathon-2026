use odra::{casper_types::U256, prelude::*};
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::common;
use crate::user_registry::errors::Error;

// =============================================================================
// Roles
// =============================================================================

pub const ROLE_IDENTITY_MANAGER: &str = "IDENTITY_MANAGER";
pub const ROLE_USER_ROLE_MANAGER: &str = "USER_ROLE_MANAGER";

pub const ROLE_FLAG_TENANT: u32 = 1;
pub const ROLE_FLAG_LANDLORD: u32 = 1 << 1;
pub const ROLE_FLAG_PROPERTY_MANAGER: u32 = 1 << 2;

// =============================================================================
// User Registry Types
// =============================================================================

pub mod types {
    use odra::prelude::*;

    #[odra::odra_type]
    #[derive(Copy)]
    pub enum UserStatus {
        Active,
        Suspended,
    }

    #[odra::odra_type]
    #[derive(Copy)]
    pub enum WalletStatus {
        Active,
        Revoked,
    }

    #[odra::odra_type]
    pub struct UserRecord {
        pub identity_hash: [u8; 32],
        pub active_wallet: Address,
        pub role_flags: u32,
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
    access_control: SubModule<AccessControl>,
}
