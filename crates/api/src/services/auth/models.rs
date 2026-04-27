//! Shared response models for authentication endpoints.
//!
//! Method-specific request/response models live next to their handlers in
//! [`super::wallet`] (and future `password`/`oauth` modules). `UserInfo` is
//! shared across login methods and the future `/profile` endpoint, so it lives
//! here.

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

use crate::common::{UserId, UserRole};

/// User profile returned by login endpoints and (future) `/profile` endpoint.
///
/// Most fields are `Option<...>`: until the wallet-login handler is switched
/// over to `auth::db::fetch_user_profile` (Phase 3.2), it only populates
/// `id` and `role`, and the remaining fields are serialized as absent
/// (`#[serde(skip_serializing_if = "Option::is_none")]`). After Phase 3.2 they
/// become populated for every login response and may be promoted to required.
#[derive(Debug, Serialize, ToSchema)]
pub struct UserInfo {
    /// The unique identifier of the user in the database.
    #[schema(value_type = uuid::Uuid)]
    pub id: UserId,
    /// The user's role (e.g., "tenant", "landlord").
    pub role: UserRole,
    /// Primary wallet address (cached on `users.wallet_address` from the
    /// primary `wallet_connections` row via trigger).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wallet_address: Option<String>,
    /// Account status: `active`, `inactive`, `suspended`, `pending_verification`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    /// Email address. `None` for wallet-only users until they complete profile.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// First name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_name: Option<String>,
    /// Last name.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_name: Option<String>,
    /// Phone number.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    /// Avatar URL.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    /// Free-form bio.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
    /// `true` once email, `first_name`, `last_name` and phone are all populated
    /// (maintained by `trg_users_profile_complete`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_profile_complete: Option<bool>,
    /// Number of currently `active` leases where the user is involved as
    /// primary tenant, listed tenant, landlord, or agent.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub active_leases_count: Option<i64>,
    /// Account creation timestamp.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    /// Last profile update timestamp.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}
