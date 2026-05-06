//! User profile feature module.
//!
//! Provides authenticated read/update endpoints for the current user's
//! profile. Login/logout/refresh flows live in [`super::auth`].

/// Database operations for user profiles.
pub mod db;
/// HTTP request handlers for user-profile endpoints.
pub mod handlers;
/// Request/response models for user-profile endpoints.
pub mod models;
/// Router configuration for user-profile endpoints.
pub mod routes;
/// Email-change opaque-token generation and verification.
pub mod tokens;

// Re-exports
pub use db::{
    ProfilePatch, UserProfileRecord, apply_email_change, fetch_user_profile, is_email_taken,
    update_user_profile,
};
pub use handlers::{confirm_email_change, get_me, patch_me, request_email_change};
pub use models::{EmailChangeConfirmRequest, EmailChangeRequest, UpdateProfileRequest};
pub use routes::router;
