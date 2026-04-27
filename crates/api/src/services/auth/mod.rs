//! Authentication feature module.
//!
//! Provides nonce generation, login with signature verification,
//! and JWT-based authentication middleware.

/// Database operations for authentication.
pub mod db;
/// HTTP request handlers for authentication.
pub mod handlers;
/// JWT encoding/decoding primitives.
pub mod jwt;
/// Authentication middleware and extractors.
pub mod middleware;
/// Request and response models for authentication endpoints.
pub mod models;
/// Router configuration for authentication endpoints.
pub mod routes;

// Re-exports
pub use db::upsert_user_by_wallet;
pub use handlers::{get_nonce, login};
pub use jwt::{ACCESS_TOKEN_TTL, EncodedAccessToken, decode_token, encode_access_token};
pub use middleware::{AuthError, AuthUser};
pub use models::{LoginRequest, LoginResponse, NonceRequest, NonceResponse, UserInfo};
pub use routes::router;
