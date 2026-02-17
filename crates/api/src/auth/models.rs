//! Request and response models for authentication endpoints.

use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::common::{UserId, UserRole};

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
}

/// Response returned upon successful login.
#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResponse {
    /// Use this JSON Web Token (JWT) for authenticating subsequent requests.
    pub token: String,
    /// Basic information about the authenticated user.
    pub user: UserInfo,
}

/// Basic user information.
#[derive(Debug, Serialize, ToSchema)]
pub struct UserInfo {
    /// The unique identifier of the user in the database.
    #[schema(value_type = uuid::Uuid)]
    pub id: UserId,
    /// The user's role (e.g., "tenant", "landlord").
    pub role: UserRole,
}
