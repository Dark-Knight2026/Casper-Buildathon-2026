//! Request/response models for user-profile endpoints.
//!
//! Hosts the patch payload for `PATCH /me`. The cross-module profile shape
//! `UserInfo` (returned by `GET /me` and the wallet login response) lives in
//! [`crate::common::models`] because both `auth` and `users` produce it.

use serde::Deserialize;
use utoipa::ToSchema;

use crate::{
    common::{ApiError, ApiResult},
    services::users::db::ProfilePatch,
};

const MAX_NAME_LEN: usize = 100;
const MAX_PHONE_LEN: usize = 20;
const MAX_BIO_LEN: usize = 1024;
const MAX_AVATAR_URL_LEN: usize = 2048;

/// Patch payload for `PATCH /api/v1/users/me`.
///
/// Each field is optional; a missing field leaves the underlying column
/// unchanged (the SQL update uses `COALESCE($n, col)`). Only mutable profile
/// fields are exposed:
///
/// - `email` is owned by a dedicated email-change flow (separate endpoint)
///   where a verification round-trip guards uniqueness.
/// - `role`, `status`, and `verification_level` are admin-controlled and not
///   self-editable.
///
/// Unknown JSON keys are silently dropped by serde, so a client that posts
/// `{"role": "admin"}` together with valid fields is treated as if `role`
/// were absent rather than 400-rejected.
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateProfileRequest {
    /// First name (1-100 chars after trim, NOT NULL in schema).
    pub first_name: Option<String>,
    /// Last name (1-100 chars after trim, NOT NULL in schema).
    pub last_name: Option<String>,
    /// Phone number (1-20 chars after trim).
    pub phone: Option<String>,
    /// Free-form bio (up to 1024 chars after trim).
    pub bio: Option<String>,
    /// Avatar URL (up to 2048 chars after trim).
    pub avatar_url: Option<String>,
}

impl UpdateProfileRequest {
    /// Trims whitespace, validates lengths, and produces a `ProfilePatch`
    /// ready for the db layer.
    ///
    /// Validation lives at the request layer (not in `db.rs`) so bad input
    /// is rejected before any SQL is issued and the boundary stays at the
    /// HTTP edge.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when:
    /// - a NOT-NULL column (`first_name`, `last_name`) or `phone` arrives as
    ///   an all-whitespace string (the user cannot wipe a required column or
    ///   set a "verified-empty" phone number);
    /// - any field exceeds its length cap.
    #[inline]
    pub fn into_patch(self) -> ApiResult<ProfilePatch> {
        Ok(ProfilePatch {
            first_name: trim_required("first_name", self.first_name, MAX_NAME_LEN)?,
            last_name: trim_required("last_name", self.last_name, MAX_NAME_LEN)?,
            phone: trim_required("phone", self.phone, MAX_PHONE_LEN)?,
            bio: trim_optional("bio", self.bio, MAX_BIO_LEN)?,
            avatar_url: trim_optional("avatar_url", self.avatar_url, MAX_AVATAR_URL_LEN)?,
        })
    }
}

/// Normalizes input for a column where the stored value must not become
/// empty (`first_name`, `last_name`, `phone` after trim).
///
/// `None` (field omitted) -> `None`, leaves the column unchanged.
/// `Some("")` or whitespace-only -> `BadRequest`, blocks accidental wipes.
fn trim_required(
    field: &str,
    value: Option<String>,
    max_len: usize,
) -> ApiResult<Option<String>> {
    let Some(raw) = value else {
        return Ok(None);
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest(format!("{field} cannot be empty")));
    }
    if trimmed.chars().count() > max_len {
        return Err(ApiError::BadRequest(format!(
            "{field} must be at most {max_len} characters"
        )));
    }
    Ok(Some(trimmed.to_owned()))
}

/// Normalizes input for a column where empty input is acceptable
/// (`bio`, `avatar_url`).
///
/// Trimmed-empty is treated as "leave unchanged" rather than "clear column".
/// The current SQL uses `COALESCE($n, col)` and cannot distinguish "skip
/// field" from "set NULL"; clearing requires a follow-up endpoint or an
/// explicit sentinel and is not in scope for this patch.
fn trim_optional(
    field: &str,
    value: Option<String>,
    max_len: usize,
) -> ApiResult<Option<String>> {
    let Some(raw) = value else {
        return Ok(None);
    };
    let trimmed = raw.trim();
    if trimmed.chars().count() > max_len {
        return Err(ApiError::BadRequest(format!(
            "{field} must be at most {max_len} characters"
        )));
    }
    if trimmed.is_empty() {
        return Ok(None);
    }
    Ok(Some(trimmed.to_owned()))
}
