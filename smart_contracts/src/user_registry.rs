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
