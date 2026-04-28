//! Shared response models for authentication endpoints.
//!
//! Method-specific request/response models live next to their handlers in
//! [`super::wallet`] (and future `password`/`oauth` modules). `UserInfo` is
//! shared across login methods and the future `/profile` endpoint, so it lives
//! here.

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;

use crate::common::{UserId, UserRole, UserStatus};

/// User profile returned by login endpoints and (future) `/profile` endpoint.
///
/// Field nullability mirrors the `users` schema: `first_name`/`last_name` and
/// timestamps are `NOT NULL` in the DB and therefore required here, while
/// `wallet_address`/`email`/`phone`/etc. are nullable (wallet-only and
/// password/OAuth-only users will not have all of them).
#[derive(Debug, Serialize, ToSchema)]
pub struct UserInfo {
    /// The unique identifier of the user in the database.
    #[schema(value_type = uuid::Uuid)]
    pub id: UserId,
    /// The user's role.
    pub role: UserRole,
    /// Primary wallet address (cached on `users.wallet_address` from the
    /// primary `wallet_connections` row via trigger). `None` for password/OAuth
    /// users who have not connected a wallet.
    pub wallet_address: Option<String>,
    /// Account status. `None` only if the underlying column ever becomes
    /// nullable (currently has `DEFAULT 'active'`).
    pub status: Option<UserStatus>,
    /// Email address. `None` for wallet-only users until they complete profile.
    pub email: Option<String>,
    /// First name.
    pub first_name: String,
    /// Last name.
    pub last_name: String,
    /// Phone number.
    pub phone: Option<String>,
    /// Avatar URL.
    pub avatar_url: Option<String>,
    /// Free-form bio.
    pub bio: Option<String>,
    /// `true` once email, `first_name`, `last_name` and phone are all populated
    /// (maintained by `trg_users_profile_complete`).
    pub is_profile_complete: bool,
    /// Number of currently `active` leases where the user is involved as
    /// primary tenant, listed tenant, landlord, or agent.
    pub active_leases_count: i64,
    /// Account creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last profile update timestamp.
    pub updated_at: DateTime<Utc>,
}
