//! Shared response models for authentication endpoints.
//!
//! Method-specific request/response models live next to their handlers in
//! [`super::wallet`] (and future `password`/`oauth` modules). `UserInfo` is
//! shared across login methods and the future `/profile` endpoint, so it lives
//! here.

use serde::Serialize;
use utoipa::ToSchema;

use crate::common::{UserId, UserRole};

/// Basic user information.
#[derive(Debug, Serialize, ToSchema)]
pub struct UserInfo {
    /// The unique identifier of the user in the database.
    #[schema(value_type = uuid::Uuid)]
    pub id: UserId,
    /// The user's role (e.g., "tenant", "landlord").
    pub role: UserRole,
}
