//! Request/response models for authentication endpoints.
//!
//! Hosts the wallet-flow shapes (nonce challenge, login) and the
//! session-management shapes (list, revoke-all). Future password and
//! OAuth modules will add their own shapes here. The cross-module profile
//! shape `UserInfo` lives in [`crate::common::models`] because both `auth` and
//! `users` produce it.

use chrono::{DateTime, Utc};
use email_address::EmailAddress;
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::common::{self, ApiError, ApiResult, UserInfo, UserRole, VerificationLevel};

/// RFC 5321 hard limit on the full email address length.
///
/// Enforced explicitly because `EmailAddress::is_valid` accepts addresses
/// past this size when individual labels are shorter than their RFC limits.
const MAX_EMAIL_LEN: usize = 254;

/// Maximum length of a name field (`first_name` / `last_name`), matching the
/// `VARCHAR(100)` columns in the `users` schema.
const MAX_NAME_LEN: usize = 100;

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

// Password --------------------------------------------------------------------

/// Role applied when a registration request omits `role`.
///
/// Named so the default lives on the field via `#[serde(default = ...)]`
/// rather than as a magic literal inside `into_validated`.
fn default_registration_role() -> UserRole {
    UserRole::Tenant
}

/// Request payload for email + password registration.
#[derive(Debug, Deserialize, ToSchema)]
pub struct RegisterRequest {
    /// Email address. Normalized (trim + lowercase) and RFC-validated before
    /// any DB lookup, so `John@X.com` and `john@x.com` resolve to one account.
    pub email: String,
    /// Plaintext password (transported only over HTTPS). Checked against the
    /// account-password policy, then Argon2id-hashed before storage - the
    /// plaintext never leaves this request.
    #[schema(value_type = String)]
    pub password: SecretString,
    /// Role chosen at signup. Restricted to self-registerable roles
    /// (`tenant`, `landlord`, `agent`); defaults to `tenant` when omitted.
    #[serde(default = "default_registration_role")]
    pub role: UserRole,
    /// First name (NOT NULL in `users`); must be non-empty after trim.
    pub first_name: String,
    /// Last name (NOT NULL in `users`); must be non-empty after trim.
    pub last_name: String,
}

/// A [`RegisterRequest`] whose fields have passed every request-layer check.
///
/// Produced by [`RegisterRequest::into_validated`] so the handler receives
/// normalized, policy-checked values and never re-validates. `password` is
/// still plaintext here - hashing is a CPU-heavy side effect the handler owns,
/// kept out of the request layer.
#[derive(Debug)]
pub struct ValidatedRegistration {
    /// Normalized (trim + lowercase) email address.
    pub email: String,
    /// Plaintext password, policy-checked but not yet hashed.
    pub password: SecretString,
    /// Resolved role (defaulted to `tenant`, guaranteed self-registerable).
    pub role: UserRole,
    /// Trimmed first name.
    pub first_name: String,
    /// Trimmed last name.
    pub last_name: String,
}

impl RegisterRequest {
    /// Normalizes and validates the registration payload.
    ///
    /// Runs at the HTTP boundary so malformed input is rejected before any
    /// hashing or SQL happens: email is trimmed/lowercased and RFC-checked,
    /// the password is run through [`common::validate_password_policy`], the
    /// role defaults to `tenant` and must be self-registerable, and the names
    /// are trimmed and required to be non-empty.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when the email exceeds [`MAX_EMAIL_LEN`]
    /// or is syntactically invalid, the password fails the policy, the role is
    /// not self-registerable, or a name is empty / over [`MAX_NAME_LEN`].
    #[inline]
    pub fn into_validated(self) -> ApiResult<ValidatedRegistration> {
        let email = self.email.trim().to_ascii_lowercase();
        if email.len() > MAX_EMAIL_LEN {
            return Err(ApiError::BadRequest(format!(
                "email must be at most {MAX_EMAIL_LEN} characters"
            )));
        }
        if !EmailAddress::is_valid(&email) {
            return Err(ApiError::BadRequest(
                "email is not a valid email address".to_owned(),
            ));
        }

        common::validate_password_policy(self.password.expose_secret())?;

        if !self.role.is_self_registerable() {
            return Err(ApiError::BadRequest(
                "Role not allowed for self-registration".to_owned(),
            ));
        }

        Ok(ValidatedRegistration {
            email,
            password: self.password,
            role: self.role,
            first_name: validate_name("first_name", &self.first_name)?,
            last_name: validate_name("last_name", &self.last_name)?,
        })
    }
}

/// Trims a required name field and enforces non-empty / max-length.
///
/// `first_name` and `last_name` are `NOT NULL` in the schema, so an
/// all-whitespace value is rejected rather than stored as a blank name.
fn validate_name(field: &str, value: &str) -> ApiResult<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest(format!("{field} cannot be empty")));
    }
    if trimmed.chars().count() > MAX_NAME_LEN {
        return Err(ApiError::BadRequest(format!(
            "{field} must be at most {MAX_NAME_LEN} characters"
        )));
    }
    Ok(trimmed.to_owned())
}

/// Request payload for email + password login.
///
/// Deliberately has no `into_validated` counterpart: the login path must NOT
/// surface field-level validation errors. An "email is not valid" message
/// would itself leak that the address is unknown, so the handler normalizes
/// the email and folds every failure - bad format, unknown email, wrong
/// password, wallet-only account - into one generic `401`.
#[derive(Debug, Deserialize, ToSchema)]
pub struct PasswordLoginRequest {
    /// Email address. Normalized (trim + lowercase) in the handler before the
    /// lookup so it matches the stored, normalized value.
    pub email: String,
    /// Plaintext password (transported only over HTTPS). Verified against the
    /// stored Argon2id hash in constant time; never logged or echoed back.
    #[schema(value_type = String)]
    pub password: SecretString,
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

// Email verification ----------------------------------------------------------

/// Response body for a successful verify-email send.
///
/// `status` is always `"sent"`. A transient mailer failure still yields
/// `"sent"` because the message is queued for background retry - the user
/// has nothing to act on differently, so the status code carries no extra
/// signal. The build helper lives next to the handler in
/// [`crate::services::auth::verify`].
#[derive(Debug, Serialize, ToSchema)]
pub struct VerifySendResponse {
    /// Always `"sent"`.
    pub status: String,
}

/// Request body for the verify-email confirm step.
///
/// Carries only the opaque token from the verification link. The user id is
/// taken from the access cookie via `AuthUser`, never from the body, so a
/// forged payload cannot confirm someone else's email.
#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyConfirmRequest {
    /// The 43-char base64url token delivered in the verification email.
    pub token: String,
}

// Authorization gating --------------------------------------------------------

/// 403 body returned when an endpoint requires a higher verification level.
///
/// Produced by the `VerifiedUser<V>` extractor; the build site is its
/// `IntoResponse` impl in [`crate::services::auth::extractors`].
#[derive(Debug, Serialize, ToSchema)]
pub struct VerificationRequiredResponse {
    /// Stable client code; always `"verification_required"`.
    #[schema(example = "verification_required")]
    pub error: String,
    /// The minimum level the caller must reach to access the endpoint.
    pub required_level: VerificationLevel,
}

/// 403 body returned when an endpoint requires a specific role.
///
/// Produced by the `RoleUser<R>` extractor; see its `IntoResponse` impl in
/// [`crate::services::auth::extractors`].
#[derive(Debug, Serialize, ToSchema)]
pub struct RoleRequiredResponse {
    /// Stable client code; always `"role_required"`.
    #[schema(example = "role_required")]
    pub error: String,
    /// The role the caller must have to access the endpoint.
    pub required_role: UserRole,
}
