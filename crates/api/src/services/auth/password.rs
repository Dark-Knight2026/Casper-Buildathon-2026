//! Email + password authentication handlers.
//!
//! Off-chain counterpart to the wallet flow in [`super::wallet`]: a user
//! registers with an email and password, gets auto-logged-in, and is issued
//! the same access + refresh cookie pair. Password hashing and the strength
//! policy live in [`crate::common::password`] so this module only orchestrates
//! HTTP -> validation -> DB -> session.

use std::sync::Arc;

use axum::{Json, extract::State};
use axum_extra::extract::CookieJar;
use secrecy::ExposeSecret;
use time::Duration as CookieDuration;

use crate::{
    common::{self, ApiError, ApiResult, AppState, ErrorResponse, UserInfo},
    services::{
        auth::{
            self, cookies,
            db::RegisterOutcome,
            jwt,
            models::{LoginResponse, RegisterRequest},
            refresh,
        },
        users,
    },
};

// `POST /api/v1/auth/register`
//
/// Registers a new email + password user and logs them in.
///
/// 1. Normalizes and validates the payload (email syntax, password policy,
///    role whitelist, non-empty names).
/// 2. Argon2id-hashes the password.
/// 3. Inserts a `users` row (`primary_auth_method = 'password'`,
///    `status = 'pending_verification'`, `verification_level = 'none'`, no
///    wallet). A duplicate email yields 409.
/// 4. Auto-logs the new user in: mints an access JWT and refresh token and
///    returns both via `Set-Cookie`, with the profile in the body - the same
///    shape as wallet login.
///
/// The verification email is intentionally NOT sent here; the user triggers it
/// separately via `POST /auth/verify/email/send`, so a fresh account starts at
/// `verification_level = none` and gains `email` only after confirming.
///
/// # Arguments
///
/// * `state` - Application state (DB pool, JWT secret, cookie config).
/// * `payload` - JSON registration body.
///
/// # Returns
///
/// `(CookieJar, Json<LoginResponse>)` - jar carries `access_token` and
/// `refresh_token`; body has the user profile only.
///
/// # Errors
///
/// Returns:
/// - `ApiError::BadRequest` for invalid email, weak password, disallowed role,
///   or empty name
/// - `ApiError::Conflict` if the email is already registered
/// - `ApiError::Internal` for DB failures or hashing/timestamp errors
#[utoipa::path(
    post,
    path = "/register",
    tag = "Auth",
    request_body = RegisterRequest,
    responses(
        (status = 200, description = "Registration successful; user auto-logged in", body = LoginResponse),
        (status = 400, description = "Invalid email, weak password, disallowed role, or empty name", body = ErrorResponse),
        (status = 409, description = "Email already registered", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> ApiResult<(CookieJar, Json<LoginResponse>)> {
    let validated = payload.into_validated()?;
    let password_hash = common::hash_password(validated.password.expose_secret())?;

    let user_record = match auth::create_password_user(
        &state.db,
        &validated.email,
        &password_hash,
        &validated.role,
        &validated.first_name,
        &validated.last_name,
    )
    .await?
    {
        RegisterOutcome::Created(record) => record,
        RegisterOutcome::EmailTaken => {
            tracing::info!(
                event = "register_failed",
                reason = "email_taken",
                "Registration rejected: email already in use"
            );
            return Err(ApiError::Conflict("Email already registered".to_owned()));
        }
    };

    // Auto-login. Cookies are assembled inline from the shared builders -
    // the same pattern `refresh::rotate` uses - rather than through a
    // wallet-specific helper.
    let encoded = jwt::encode_access_token(
        user_record.id,
        validated.role,
        user_record.verification_level,
        &state.config.jwt_secret,
    )?;
    let issued_refresh = refresh::issue_login_refresh_token(&state.db, user_record.id).await?;
    let profile = users::fetch_user_profile(&state.db, user_record.id).await?;

    let access_cookie = cookies::build_access_cookie(
        encoded.token,
        CookieDuration::seconds(jwt::ACCESS_TOKEN_TTL.num_seconds()),
        state.config.cookie_secure,
    );
    let refresh_cookie = cookies::build_refresh_cookie(
        issued_refresh.plaintext,
        CookieDuration::seconds(refresh::REFRESH_TOKEN_TTL.num_seconds()),
        state.config.cookie_secure,
    );
    let jar = CookieJar::new().add(access_cookie).add(refresh_cookie);

    tracing::info!(
        event = "user_register",
        user_id = %user_record.id,
        refresh_family = %issued_refresh.family_id,
        "User registered via email + password"
    );

    Ok((
        jar,
        Json(LoginResponse {
            user: UserInfo::from(profile),
        }),
    ))
}
