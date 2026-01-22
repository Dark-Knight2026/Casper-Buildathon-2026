use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use uuid::Uuid;

// --- Type Aliases ---
pub type UserId = Uuid;
pub type PropertyId = Uuid;

// --- Enums ---

/// Defines the role of a user in the system.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, EnumString, Display)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum UserRole {
    Tenant,
    Landlord,
    Agent,
    Admin,
    #[serde(other)]
    Unknown,
}

// --- Shared Structures ---

/// JWT Claims structure used for token generation and validation.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// Subject: The User UUID.
    pub sub: UserId,
    /// The role assigned to the user.
    pub role: UserRole,
    /// Expiration time of the token (Unix timestamp).
    pub exp: usize,
}
