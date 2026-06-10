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
pub use db::{ProfilePatch, ReissueIdentity, SoftDeleteOutcome, UserProfileRecord};
pub use models::{
    ACCOUNT_DELETE_CONFIRMATION, AvatarUploadResponse, ChangePasswordRequest, DeleteAccountRequest,
    EmailChangeConfirmRequest, EmailChangeRequest, LinkWalletRequest, OnchainRegistrationResponse,
    UpdateProfileRequest, UpdateRoleRequest,
};
