//! Common utilities shared across all feature modules.

/// Application configuration and state management.
pub mod config;
/// Cryptographic utilities for signature verification.
pub mod crypto;
/// Error types for the application.
pub mod errors;
/// Shared data models and type definitions.
pub mod models;
/// Reusable pagination primitives.
pub mod pagination;
/// Password hashing primitives and the account-password policy.
pub mod password;
/// Redis client wrapper.
pub mod redis;
/// Opaque single-use token generation shared across flows.
pub mod tokens;

// Re-exports
pub use config::{AppState, IcoFallback, S3Config, ServerConfig, TOTAL_SUPPLY};
pub use crypto::{
    CASPER_ED25519_PUBKEY_HEX_LEN, CASPER_MESSAGE_PREFIX, CASPER_SECP256K1_PUBKEY_HEX_LEN,
    CryptoError, verify_casper_signature,
};
pub use errors::{ApiError, ApiResult, ErrorResponse, ServerError};
pub use models::{
    Claims, JWT_AUDIENCE, JWT_ISSUER, PropertyId, TokenType, UserId, UserInfo, UserRole,
    UserStatus, VerificationLevel,
};
pub use pagination::{Pageable, PaginatedResponse, Pagination};
pub use password::{
    MAX_PASSWORD_LEN, MIN_PASSWORD_LEN, dummy_verify, hash_password, validate_password_policy,
    verify_password,
};
pub use redis::{RedisStore, SendReservation};

/// Validates and normalizes a Casper account hash (64 hex characters, no prefix).
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the address is not exactly 64 hex characters.
#[inline]
pub fn validate_account(account: &str) -> ApiResult<String> {
    let account = account.to_ascii_lowercase();
    if account.len() != 64 || !account.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApiError::BadRequest(
            "Address must be 64 hex characters (account hash without prefix)".to_owned(),
        ));
    }
    Ok(account)
}
