//! Authentication feature module.
//!
//! Provides nonce generation, login with signature verification,
//! and JWT-based authentication middleware.

/// HTTP request handlers for authentication.
pub mod handlers;
/// Authentication middleware and extractors.
pub mod middleware;
/// Request and response models for authentication endpoints.
pub mod models;
/// Router configuration for authentication endpoints.
pub mod routes;

pub use handlers::{get_nonce, login};
pub use middleware::{AuthError, AuthUser};
pub use models::{LoginRequest, LoginResponse, NonceRequest, NonceResponse, UserInfo};
pub use routes::router;
