//! HTTP request handlers for user-profile endpoints.

use core::str::FromStr;
use std::sync::Arc;

use axum::{Json, extract::State};

use crate::{
    common::{ApiResult, AppState, UserRole},
    services::{
        auth::{AuthUser, models::UserInfo},
        users::db,
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

    // Fallback to `Unknown` mirrors the wallet-login path so a stray DB value
    // can never 500 the profile read.
    let role = UserRole::from_str(&profile.role).unwrap_or(UserRole::Unknown);

    Ok(Json(UserInfo {
        id: profile.id,
        role,
        wallet_address: profile.wallet_address,
        status: profile.status,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_profile_complete: profile.is_profile_complete,
        active_leases_count: profile.active_leases_count,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    }))
}
