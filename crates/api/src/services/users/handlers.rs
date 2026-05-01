//! HTTP request handlers for user-profile endpoints.

use std::sync::Arc;

use axum::{Json, extract::State};

use crate::{
    common::{ApiResult, AppState, UserInfo},
    services::{
        auth::AuthUser,
        users::{db, models::UpdateProfileRequest},
    },
};

// `GET /api/v1/users/me`
//
/// Returns the full profile of the authenticated user.
///
/// The user id is taken from the JWT subject (`auth_user.0.sub`) - the access
/// cookie has already been validated by the router-level `require_auth`
/// middleware, so the handler only has to load the profile.
///
/// # Arguments
///
/// * `state` - Application state (DB pool).
/// * `auth_user` - Authenticated user extracted from the access cookie.
///
/// # Returns
///
/// `Json<UserInfo>` - the profile shape shared with the login response.
///
/// # Errors
///
/// - [`crate::common::ApiError::NotFound`] if the user record was deleted
///   between issuing the access token and this call (the JWT outlives the
///   row by up to 15 minutes).
/// - [`crate::common::ApiError::Internal`] for DB failures or
///   `verification_level`/`status` decode errors.
#[utoipa::path(
    get,
    path = "/me",
    tag = "Users",
    responses(
        (status = 200, description = "Authenticated user's profile", body = UserInfo),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User no longer exists"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_me(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> ApiResult<Json<UserInfo>> {
    let profile = db::fetch_user_profile(&state.db, auth_user.0.sub).await?;
    Ok(Json(UserInfo::from(profile)))
}

// `PATCH /api/v1/users/me`
//
/// Patches the editable subset of the authenticated user's profile.
///
/// Editable fields: `first_name`, `last_name`, `phone`, `bio`, `avatar_url`.
/// Fields owned by other flows (`email`, `role`, `status`,
/// `verification_level`) are not exposed and silently ignored if a client
/// includes them - serde drops unknown JSON keys by default.
///
/// Side effect: changing `phone` to a value distinct from the stored one
/// resets `phone_verified` to `false` in the same UPDATE statement (atomic
/// with the column write). The user must re-verify the new number via the
/// SMS flow before any phone-gated functionality unlocks. A no-op patch
/// (re-sending the same number) preserves the verified flag.
///
/// Authorization: `AuthUser` (not `VerifiedUser`) - the user must be able
/// to fill in their profile before going through verification, otherwise
/// they get stuck in a chicken-and-egg loop.
///
/// # Arguments
///
/// * `state` - Application state (DB pool).
/// * `auth_user` - Authenticated user extracted from the access cookie.
/// * `payload` - Patch payload; missing fields leave the column unchanged.
///
/// # Returns
///
/// `Json<UserInfo>` - the freshly-loaded profile (same shape as `GET /me`).
///
/// # Errors
///
/// - [`crate::common::ApiError::BadRequest`] for empty required fields or
///   over-long values (validation runs before any SQL is issued).
/// - [`crate::common::ApiError::NotFound`] if the user record was deleted
///   between issuing the access token and this call.
/// - [`crate::common::ApiError::Internal`] for DB failures or column-decode
///   errors in the follow-up profile reload.
#[utoipa::path(
    patch,
    path = "/me",
    tag = "Users",
    request_body = UpdateProfileRequest,
    responses(
        (status = 200, description = "Updated profile", body = UserInfo),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User no longer exists"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn patch_me(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<UpdateProfileRequest>,
) -> ApiResult<Json<UserInfo>> {
    let patch = payload.into_patch()?;
    let profile = db::update_user_profile(&state.db, auth_user.0.sub, patch).await?;
    Ok(Json(UserInfo::from(profile)))
}
