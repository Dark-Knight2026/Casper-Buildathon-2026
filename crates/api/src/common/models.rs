//! Shared data models and type definitions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use utoipa::ToSchema;
use uuid::Uuid;

/// Unique identifier for a user.
pub type UserId = Uuid;
/// Unique identifier for a property.
pub type PropertyId = Uuid;

/// Defines the role of a user in the system.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, EnumString, Display, ToSchema)]
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

impl UserRole {
    /// Returns `true` if this role can be selected by a user during
    /// self-registration (wallet login, password register, OAuth signup).
    ///
    /// Privileged roles (`admin`, `property_manager`) are explicitly excluded
    /// and may only be assigned via the bootstrap-seed binary or the
    /// `grant_admin.sh` operations script. `Unknown` (the serde fallback for
    /// unrecognized strings) is also rejected so that bogus role values fail
    /// fast with a 400 instead of reaching a CHECK-constraint at the DB.
    #[inline]
    #[must_use]
    pub const fn is_self_registerable(&self) -> bool {
        matches!(self, Self::Tenant | Self::Landlord | Self::Agent)
    }
}

/// JWT issuer claim value. Only tokens issued by our API are accepted.
pub const JWT_ISSUER: &str = "leasefi-api";
/// JWT audience claim value. Only tokens intended for our users are accepted.
pub const JWT_AUDIENCE: &str = "leasefi-users";

/// JWT token category - used to prevent access tokens from being accepted as
/// refresh tokens and vice versa.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, EnumString, Display, ToSchema,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum TokenType {
    /// Short-lived token used for API authentication.
    Access,
    /// Long-lived token used to obtain a new access token.
    Refresh,
}

/// Account status. Mirrors the `users.status` column CHECK constraint
/// (`'active' | 'inactive' | 'suspended' | 'pending_verification'`).
///
/// Unlike [`UserRole`], no `Unknown` fallback variant is provided: `status` is
/// only ever written by trusted internal code (admin actions, triggers), so an
/// unparseable value indicates a missing migration rather than malicious input
/// and should fail loudly via `sqlx::Error::ColumnDecode`.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, EnumString, Display, ToSchema,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum UserStatus {
    /// Account is active and may sign in.
    Active,
    /// Account is inactive (self-deactivated or never activated).
    Inactive,
    /// Account is suspended by an administrator.
    Suspended,
    /// Account awaits verification (email, KYC, etc.) before full access.
    PendingVerification,
}

/// User verification level. Mirrors the `users.verification_level` column
/// (`'none' | 'email' | 'identity' | 'full'`) introduced by the
/// `extend user status and add verification_level` migration.
///
/// Encoded into access-token claims so authorization extractors can gate
/// endpoints by verification without re-querying the database on every request.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, EnumString, Display, ToSchema,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum VerificationLevel {
    /// Default for newly registered users; no verification performed.
    None,
    /// Email address has been verified.
    Email,
    /// Basic identity (KYC) has been verified.
    Identity,
    /// Both email and identity have been verified.
    Full,
}

/// JWT Claims structure used for token generation and validation.
///
/// `token_type` and `verification_level` are wrapped in `Option` with
/// `#[serde(default)]` so JWTs issued before this rollout (without these
/// fields) still decode successfully. Once the longest legacy access-token
/// TTL has elapsed in production, a follow-up commit can drop the `Option`.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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
    /// Token category (access vs. refresh). Optional for backward compatibility
    /// during transition from pre-typed tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_type: Option<TokenType>,
    /// User verification level at the moment of issuance. Optional for
    /// backward compatibility during transition.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub verification_level: Option<VerificationLevel>,
    /// JWT ID - unique per access token, used for the logout blocklist.
    #[schema(value_type = Uuid)]
    pub jti: Uuid,
    /// Issued-at timestamp (Unix seconds). Compared against
    /// `users.jwt_invalidate_before` by the auth middleware so force-revoke
    /// flows (role change, revoke-all, self-delete) can kill outstanding
    /// access tokens before their natural `exp`.
    ///
    /// `#[serde(default)]` is required for backward compatibility with JWTs
    /// issued before this field was added: those tokens deserialize with
    /// `iat = 0`, which is `<= NOW()` for any non-NULL cutoff, so a
    /// force-revoke event correctly invalidates them too. Newly issued
    /// tokens always populate this field with a real timestamp.
    #[serde(default)]
    pub iat: usize,
}

/// Public user-profile shape returned by login responses and the
/// `GET /users/me` endpoint.
///
/// Lives in `common::models` (not in any feature module) because both `auth`
/// and `users` produce it: any module that wants to expose "the current user"
/// reuses this shape rather than redefining it.
///
/// Field nullability mirrors the `users` schema: `first_name`/`last_name` and
/// timestamps are `NOT NULL` in the DB and therefore required here, while
/// `wallet_address`/`email`/`phone`/etc. are nullable (wallet-only and
/// password/OAuth-only users will not have all of them).
#[derive(Debug, Serialize, ToSchema)]
pub struct UserInfo {
    /// The unique identifier of the user in the database.
    #[schema(value_type = Uuid)]
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
