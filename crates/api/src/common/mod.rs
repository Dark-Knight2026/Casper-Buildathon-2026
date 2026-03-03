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
pub use config::{AppState, IcoConfig, ServerConfig};
pub use crypto::{
    CASPER_ED25519_PUBKEY_HEX_LEN, CASPER_SECP256K1_PUBKEY_HEX_LEN, CryptoError,
    verify_casper_signature,
};
pub use errors::{ApiError, ApiResult, ErrorResponse, ServerError};
pub use models::{Claims, PropertyId, UserId, UserRole};
pub use pagination::{Pageable, PaginatedResponse, Pagination};
pub use redis::RedisStore;
