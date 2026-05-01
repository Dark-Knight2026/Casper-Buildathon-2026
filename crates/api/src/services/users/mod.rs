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

// Re-exports
pub use db::{ProfilePatch, UserProfileRecord, fetch_user_profile, update_user_profile};
pub use handlers::{get_me, patch_me};
pub use models::UpdateProfileRequest;
pub use routes::router;
