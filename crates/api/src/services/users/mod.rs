//! User profile feature module.
//!
//! Provides authenticated read/update endpoints for the current user's
//! profile. Login/logout/refresh flows live in [`super::auth`].

/// Database operations for user profiles.
pub mod db;
/// HTTP request handlers for user-profile endpoints.
pub mod handlers;
/// Router configuration for user-profile endpoints.
pub mod routes;

// Re-exports
pub use db::{UserProfileRecord, fetch_user_profile};
pub use handlers::get_me;
pub use routes::router;
