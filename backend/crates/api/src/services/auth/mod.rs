//! Authentication feature module.
//!
//! Provides nonce generation, login with signature verification,
//! and JWT-based authentication middleware.

/// Auth-cookie names and builders shared by login/refresh/logout.
pub mod cookies;
/// Database operations for authentication.
pub mod db;
/// Verification- and role-gating extractors (`VerifiedUser`, `RoleUser`).
pub mod extractors;
/// JWT encoding/decoding primitives.
pub mod jwt;
/// Logout handler: clears auth cookies and revokes refresh-family + jti blocklist.
pub mod logout;
/// Authentication middleware and extractors.
pub mod middleware;
/// Request/response models for authentication endpoints.
pub mod models;
/// Email + password authentication handlers.
pub mod password;
/// Refresh-token issuance helpers.
pub mod refresh;
/// Router configuration for authentication endpoints.
pub mod routes;
/// Session-management handlers: list and revoke active refresh tokens.
pub mod sessions;
/// Email-verification handlers: send/confirm/resend verification links.
pub mod verify;
/// Wallet-based authentication: nonce + signature login.
pub mod wallet;

// Re-exports
pub use cookies::{ACCESS_TOKEN_COOKIE, REFRESH_COOKIE_PATH, REFRESH_TOKEN_COOKIE};
pub use db::{
    ActiveSession, LinkWalletOutcome, PasswordLoginRecord, RegisterOutcome, UpsertOutcome,
};
pub use extractors::{
    AdminRole, AgentRole, AuthGateError, EmailVerified, IdentityVerified, LandlordRole, RoleMarker,
    RoleUser, TenantRole, VerificationMarker, VerifiedUser,
};
pub use jwt::{ACCESS_TOKEN_TTL, EncodedAccessToken};
pub use middleware::{AuthError, AuthUser};
pub use models::{
    LoginRequest, LoginResponse, NonceRequest, NonceResponse, RegisterRequest,
    RevokeAllSessionsRequest, RevokeAllSessionsResponse, RoleRequiredResponse, SessionResponse,
    VerificationRequiredResponse, VerifyConfirmRequest, VerifySendResponse,
};
pub use refresh::{IssuedRefreshToken, REFRESH_TOKEN_TTL};
