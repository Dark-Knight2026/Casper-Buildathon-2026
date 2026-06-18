//! Common utilities shared across all feature modules.

/// Application configuration and state management.
pub mod config;
/// Cryptographic utilities for signature verification.
pub mod crypto;
/// Error types for the application.
pub mod errors;
/// Raster-image format sniffing shared across upload handlers.
pub mod image;
/// Shared data models and type definitions.
pub mod models;
/// Reusable pagination primitives.
pub mod pagination;
/// Password hashing primitives and the account-password policy.
pub mod password;
/// Composable filter pushing for runtime `QueryBuilder` searches.
pub mod query;
/// Redis client wrapper.
pub mod redis;
/// Opaque single-use token generation shared across flows.
pub mod tokens;
/// Shared input-validation helpers for Casper addresses.
pub mod validation;

// Re-exports
pub use config::{AppState, IcoFallback, S3Config, ServerConfig, TOTAL_SUPPLY};
pub use crypto::{
    CASPER_ED25519_PUBKEY_HEX_LEN, CASPER_MESSAGE_PREFIX, CASPER_SECP256K1_PUBKEY_HEX_LEN,
    CryptoError,
};
pub use errors::{ApiError, ApiResult, ErrorResponse, ServerError};
pub use models::{
    Claims, JWT_AUDIENCE, JWT_ISSUER, LeaseType, PropertyId, TokenType, UserId, UserInfo, UserRole,
    UserStatus, VerificationLevel,
};
pub use pagination::{Pageable, PaginatedResponse, Pagination};
pub use password::{MAX_PASSWORD_LEN, MIN_PASSWORD_LEN};
pub use query::{AppendFilters, AppendOrder, QueryBuilderExt};
pub use redis::{RedisStore, SendReservation};
