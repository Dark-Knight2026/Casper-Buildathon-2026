//! Request/response models for authentication endpoints.
//!
//! Hosts the wallet-flow shapes (nonce challenge, login) and the
//! session-management shapes (list, revoke-all). Future password and
//! OAuth modules will add their own shapes here. The cross-module profile
//! shape `UserInfo` lives in [`crate::common::models`] because both `auth` and
//! `users` produce it.

use chrono::{DateTime, Utc};
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::common::{UserInfo, UserRole};

// Wallet ----------------------------------------------------------------------

/// Request payload for generating a login nonce.
#[derive(Debug, Deserialize, ToSchema)]
pub struct NonceRequest {
    /// The wallet address (public key).
    pub wallet_address: String,
}

/// Response containing the generated nonce.
#[derive(Debug, Serialize, ToSchema)]
pub struct NonceResponse {
    /// A randomly generated string used to prevent replay attacks.
    pub nonce: String,
    /// The full message string that the user must sign with their wallet.
    /// Format: `"Sign this message to log in to LeaseFi. Nonce: <nonce>"`
    pub message: String,
}

/// Request payload for verifying a login signature.
#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    /// The wallet address (public key) of the user.
    pub wallet_address: String,
    /// The cryptographic signature of the nonce message.
    #[schema(value_type = String)]
    pub signature: SecretString,
    /// Optional role chosen by the user at first login. Honored only when
    /// creating a new user record; ignored on subsequent logins. Allowed
    /// values: `tenant`, `landlord`, `agent`. Defaults to `tenant`.
    #[serde(default)]
    pub role: Option<UserRole>,
}

/// Response body returned upon successful login.
///
/// Tokens are NOT in this body - they are delivered via `Set-Cookie`
/// headers (`access_token` and `refresh_token`, both `HttpOnly`). The
/// frontend never reads token material from JS; the browser attaches the
/// cookies automatically on subsequent requests. This closes the XSS
/// exfiltration vector that a body-returned JWT would have.
#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResponse {
    /// Profile of the authenticated user.
    pub user: UserInfo,
}

// Sessions --------------------------------------------------------------------

/// One row of the response from `GET /api/v1/auth/sessions`.
///
/// `family_id` is intentionally NOT exposed: rotations within a family
/// are an implementation detail of the refresh flow, and surfacing the
/// id would tempt clients to build their own rotation UI on top of it.
/// `token_hash` is also not exposed - the handler computes `is_current`
/// against the request cookie and discards the hash before serializing.
#[derive(Debug, Serialize, ToSchema)]
pub struct SessionResponse {
    /// Stable identifier for the session row. Pass back to
    /// `DELETE /api/v1/auth/sessions/{id}` to terminate this session.
    pub id: Uuid,
    /// Wall-clock timestamp the session was issued (login time, or the
    /// time of the last refresh-rotation that produced this row).
    pub issued_at: DateTime<Utc>,
    /// Absolute expiration timestamp; rows whose `expires_at` is past
    /// `NOW()` are filtered out at the db layer, so this value is
    /// always strictly in the future at response time.
    pub expires_at: DateTime<Utc>,
    /// `true` if the row's `token_hash` matches `sha256(request_cookie)`,
    /// i.e. the session that issued the access cookie used to load this
    /// list. Clients use it to render a "this device" pill and to gate
    /// the "log out other sessions" button without picking the row that
    /// would log the current user out.
    pub is_current: bool,
}

/// Body of `POST /api/v1/auth/sessions/revoke-all`.
///
/// All fields default so the client can send `{}` to get the safe "log
/// out other devices" behavior without spelling the flag out. Sending a
/// non-empty body is still required because the underlying `Json`
/// extractor refuses empty bodies; that is fine for an explicit
/// destructive action - clients should opt in deliberately.
#[derive(Debug, Deserialize, ToSchema)]
pub struct RevokeAllSessionsRequest {
    /// When `true` (default), preserves the refresh-token row whose hash
    /// matches the request's `refresh_token` cookie and leaves
    /// `users.jwt_invalidate_before` untouched - the caller stays signed
    /// in, every OTHER device is signed out. When `false`, every refresh
    /// row for the user is revoked AND the access cutoff is stamped, so
    /// the auth middleware also rejects the caller's own access token on
    /// its next use. The handler clears both auth cookies in the `false`
    /// case so the browser drops them on receipt.
    ///
    /// Behavior on a request that has `keep_current = true` but no
    /// refresh cookie: the "row to keep" cannot be located, so every
    /// row is revoked anyway; the cutoff is still NOT stamped, because
    /// the user explicitly asked to preserve their access. This is the
    /// safe interpretation for a request that legitimately lost its
    /// refresh cookie between login and revoke (e.g. clear-storage hit
    /// the refresh-cookie path before the revoke arrived).
    #[serde(default = "default_keep_current")]
    pub keep_current: bool,
}

/// Default value for [`RevokeAllSessionsRequest::keep_current`]: the safe
/// "log out other devices" mode is what the UI button primarily exposes,
/// so an unspecified field must not silently log the caller out too.
#[inline]
fn default_keep_current() -> bool {
    true
}

/// Body of the response from `POST /api/v1/auth/sessions/revoke-all`.
///
/// `revoked` is the count of refresh-token rows actually transitioned
/// from active to revoked by this call - already-revoked rows in the
/// user's account are not counted. The UI uses it to render
/// "n other devices signed out" without a follow-up list call.
#[derive(Debug, Serialize, ToSchema)]
pub struct RevokeAllSessionsResponse {
    /// Number of refresh-token rows actually revoked by this call.
    pub revoked: u64,
}
