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
pub use db::{
    ProfilePatch, ReissueIdentity, SoftDeleteOutcome, UserProfileRecord, apply_email_change,
    apply_user_role_change, fetch_password_hash, fetch_user_profile, has_blocking_leases,
    is_email_taken, lock_user_role, soft_delete_user, update_avatar_url,
    update_password_invalidate_other_sessions, update_user_profile,
};
pub use handlers::{
    change_password, confirm_email_change, delete_me, get_me, patch_me, patch_me_role,
    request_email_change, upload_avatar,
};
pub use models::{
    ACCOUNT_DELETE_CONFIRMATION, AvatarUploadResponse, ChangePasswordRequest, DeleteAccountRequest,
    EmailChangeConfirmRequest, EmailChangeRequest, UpdateProfileRequest, UpdateRoleRequest,
};
pub use routes::router;
