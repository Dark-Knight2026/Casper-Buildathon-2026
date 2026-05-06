//! Request/response models for authentication endpoints.
//!
//! Hosts the wallet-flow shapes (nonce challenge, login). Future password and
//! OAuth modules will add their own shapes here. The cross-module profile
//! shape `UserInfo` lives in [`crate::common::models`] because both `auth` and
//! `users` produce it.

use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

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
