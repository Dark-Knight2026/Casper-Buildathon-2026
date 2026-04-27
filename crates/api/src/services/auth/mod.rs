//! Authentication feature module.
//!
//! Provides nonce generation, login with signature verification,
//! and JWT-based authentication middleware.

/// Database operations for authentication.
pub mod db;
/// JWT encoding/decoding primitives.
pub mod jwt;
/// Authentication middleware and extractors.
pub mod middleware;
/// Shared response models for authentication endpoints.
pub mod models;
/// Router configuration for authentication endpoints.
pub mod routes;
/// Wallet-based authentication: nonce + signature login.
pub mod wallet;

// Re-exports
pub use db::{UserProfileRecord, fetch_user_profile, upsert_user_by_wallet};
pub use jwt::{ACCESS_TOKEN_TTL, EncodedAccessToken, decode_token, encode_access_token};
pub use middleware::{AuthError, AuthUser};
pub use models::UserInfo;
pub use routes::router;
pub use wallet::{LoginRequest, LoginResponse, NonceRequest, NonceResponse, get_nonce, login};
