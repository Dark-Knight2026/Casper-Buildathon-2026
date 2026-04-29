//! Authentication feature module.
//!
//! Provides nonce generation, login with signature verification,
//! and JWT-based authentication middleware.

/// Auth-cookie names and builders shared by login/refresh/logout.
pub mod cookies;
/// Database operations for authentication.
pub mod db;
/// JWT encoding/decoding primitives.
pub mod jwt;
/// Authentication middleware and extractors.
pub mod middleware;
/// Shared response models for authentication endpoints.
pub mod models;
/// Refresh-token issuance helpers.
pub mod refresh;
/// Router configuration for authentication endpoints.
pub mod routes;
/// Wallet-based authentication: nonce + signature login.
pub mod wallet;

// Re-exports
pub use cookies::{
    ACCESS_TOKEN_COOKIE, REFRESH_COOKIE_PATH, REFRESH_TOKEN_COOKIE, build_access_cookie,
    build_refresh_cookie,
};
pub use db::{UserProfileRecord, fetch_user_profile, insert_refresh_token, upsert_user_by_wallet};
pub use jwt::{ACCESS_TOKEN_TTL, EncodedAccessToken, decode_token, encode_access_token};
pub use middleware::{AuthError, AuthUser};
pub use models::UserInfo;
pub use refresh::{IssuedRefreshToken, REFRESH_TOKEN_TTL, issue_login_refresh_token, rotate};
pub use routes::router;
pub use wallet::{LoginRequest, LoginResponse, NonceRequest, NonceResponse, get_nonce, login};
