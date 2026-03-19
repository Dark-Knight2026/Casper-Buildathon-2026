//! Shared data models and type definitions.

use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use utoipa::ToSchema;
use uuid::Uuid;

/// Unique identifier for a user.
pub type UserId = Uuid;
/// Unique identifier for a property.
pub type PropertyId = Uuid;

/// Defines the role of a user in the system.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, EnumString, Display, ToSchema)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum UserRole {
    /// A tenant renting a property.
    Tenant,
    /// A landlord owning properties.
    Landlord,
    /// A real estate agent.
    Agent,
    /// System administrator.
    Admin,
    /// Unknown or unrecognized role.
    #[serde(other)]
    Unknown,
}

/// JWT issuer claim value. Only tokens issued by our API are accepted.
pub const JWT_ISSUER: &str = "leasefi-api";
/// JWT audience claim value. Only tokens intended for our users are accepted.
pub const JWT_AUDIENCE: &str = "leasefi-users";

/// JWT Claims structure used for token generation and validation.
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Claims {
    /// Subject: The User UUID.
    #[schema(value_type = Uuid)]
    pub sub: UserId,
    /// The role assigned to the user.
    pub role: UserRole,
    /// Expiration time of the token (Unix timestamp).
    pub exp: usize,
    /// Issuer of the token.
    pub iss: String,
    /// Intended audience of the token.
    pub aud: String,
}
