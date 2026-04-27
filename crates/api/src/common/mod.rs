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
/// Redis client wrapper.
pub mod redis;

// Re-exports
pub use config::{AppState, IcoFallback, ServerConfig, TOTAL_SUPPLY};
pub use crypto::{
    CASPER_ED25519_PUBKEY_HEX_LEN, CASPER_MESSAGE_PREFIX, CASPER_SECP256K1_PUBKEY_HEX_LEN,
    CryptoError, verify_casper_signature,
};
pub use errors::{ApiError, ApiResult, ErrorResponse, ServerError};
pub use models::{
    Claims, JWT_AUDIENCE, JWT_ISSUER, PropertyId, TokenType, UserId, UserRole, VerificationLevel,
};
pub use pagination::{Pageable, PaginatedResponse, Pagination};
pub use redis::RedisStore;

/// Validates and normalizes a Casper account hash (64 hex characters, no prefix).
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the address is not exactly 64 hex characters.
#[inline]
pub fn validate_account(account: &str) -> Result<String, errors::ApiError> {
    let account = account.to_ascii_lowercase();
    if account.len() != 64 || !account.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(errors::ApiError::BadRequest(
            "Address must be 64 hex characters (account hash without prefix)".to_owned(),
        ));
    }
    Ok(account)
}
