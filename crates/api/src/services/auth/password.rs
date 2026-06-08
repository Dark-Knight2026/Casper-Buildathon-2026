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
            models::{LoginResponse, PasswordLoginRequest, RegisterRequest},
            refresh,
        },
        users,
    },
};

/// Assembles the access + refresh cookies into one `CookieJar`.
///
/// Shared by [`register`] and [`login_password`] so both emit byte-identical
/// cookie attributes (TTL, `Secure`, paths) from the builders in [`cookies`] -
/// the same pair `refresh::rotate` and the wallet login produce.
fn build_session_cookies(
    access_token: String,
    refresh_plaintext: String,
    cookie_secure: bool,
) -> CookieJar {
    let access_cookie = cookies::build_access_cookie(
        access_token,
        CookieDuration::seconds(jwt::ACCESS_TOKEN_TTL.num_seconds()),
        cookie_secure,
    );
    let refresh_cookie = cookies::build_refresh_cookie(
        refresh_plaintext,
        CookieDuration::seconds(refresh::REFRESH_TOKEN_TTL.num_seconds()),
        cookie_secure,
    );
    CookieJar::new().add(access_cookie).add(refresh_cookie)
}

/// The single generic error every password-login authentication failure
/// collapses to.
///
/// Unknown email, wrong password, and wallet-only account (NULL hash) all
/// return this identical `401`, so the response never reveals which check
/// failed - the anti-enumeration guarantee for the login path.
fn invalid_credentials() -> ApiError {
    ApiError::Unauthorized("Invalid email or password".to_owned())
}

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

    // Auto-login: mint the access + refresh pair and hand both back as
    // cookies, the same session shape `login_password` issues.
    let encoded = jwt::encode_access_token(
        user_record.id,
        validated.role,
        user_record.verification_level,
        &state.config.jwt_secret,
    )?;
    let issued_refresh = refresh::issue_login_refresh_token(&state.db, user_record.id).await?;
    let profile = users::fetch_user_profile(&state.db, user_record.id).await?;

    let jar = build_session_cookies(
        encoded.token,
        issued_refresh.plaintext,
        state.config.cookie_secure,
    );

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

// `POST /api/v1/auth/login/password`
//
/// Authenticates an email + password user and logs them in.
///
/// 1. Normalizes the email and looks up the account.
/// 2. Verifies the presented password against the stored Argon2id hash in
///    constant time. A missing account or a wallet-only row (NULL hash) runs a
///    dummy verify so the failure path matches the success path in timing.
/// 3. Gates on `status`: `active` and `pending_verification` may log in;
///    `suspended` / `inactive` are rejected with 403.
/// 4. Issues a fresh access JWT + refresh token (the refresh issuance revokes
///    any prior session) and returns both via `Set-Cookie`.
///
/// # Arguments
///
/// * `state` - Application state (DB pool, JWT secret, cookie config).
/// * `payload` - JSON login body (email + password).
///
/// # Returns
///
/// `(CookieJar, Json<LoginResponse>)` - jar carries `access_token` and
/// `refresh_token`; body has the user profile only.
///
/// # Errors
///
/// Returns:
/// - `ApiError::Unauthorized` for any authentication failure (unknown email,
///   wrong password, or wallet-only account) - one generic 401, never
///   distinguishing the cases (anti-enumeration)
/// - `ApiError::Forbidden` if the account is suspended or inactive
/// - `ApiError::Internal` for DB failures or token-issuance errors
#[utoipa::path(
    post,
    path = "/login/password",
    tag = "Auth",
    request_body = PasswordLoginRequest,
    responses(
        (status = 200, description = "Login successful; user logged in", body = LoginResponse),
        (status = 401, description = "Invalid email or password", body = ErrorResponse),
        (status = 403, description = "Account is suspended or inactive", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn login_password(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PasswordLoginRequest>,
) -> ApiResult<(CookieJar, Json<LoginResponse>)> {
    let email = payload.email.trim().to_ascii_lowercase();

    // Anti-enumeration: an unknown email and a wallet-only account (NULL hash)
    // must be indistinguishable from a wrong password. Both branches burn a
    // dummy Argon2 verify so the response time matches the real path, then
    // return the same generic 401.
    let Some(record) = auth::find_password_login_by_email(&state.db, &email).await? else {
        common::dummy_verify(payload.password.expose_secret());
        return Err(invalid_credentials());
    };
    let Some(password_hash) = record.password_hash.as_deref() else {
        common::dummy_verify(payload.password.expose_secret());
        return Err(invalid_credentials());
    };

    if !common::verify_password(payload.password.expose_secret(), password_hash) {
        tracing::info!(
            event = "login_failed",
            reason = "bad_password",
            "Password login rejected: credentials did not match"
        );
        return Err(invalid_credentials());
    }

    // Status gate: a suspended or inactive account has valid credentials, so
    // enumeration is moot - return an explicit 403 rather than the generic
    // 401. `pending_verification` is allowed in: a freshly-registered user
    // must be able to log in; protected resources are gated separately by the
    // `VerifiedUser<_>` extractor.
    if !matches!(
        record.status.as_deref(),
        Some("active" | "pending_verification")
    ) {
        tracing::warn!(
            event = "login_failed",
            reason = "status_not_loginable",
            user_id = %record.id,
            "Account exists but its status does not permit login"
        );
        return Err(ApiError::Forbidden("Account is not active".to_owned()));
    }

    let encoded = jwt::encode_access_token(
        record.id,
        record.role,
        record.verification_level,
        &state.config.jwt_secret,
    )?;
    let issued_refresh = refresh::issue_login_refresh_token(&state.db, record.id).await?;
    auth::update_last_login_at(&state.db, record.id).await?;
    let profile = users::fetch_user_profile(&state.db, record.id).await?;

    let jar = build_session_cookies(
        encoded.token,
        issued_refresh.plaintext,
        state.config.cookie_secure,
    );

    tracing::info!(
        event = "user_login",
        user_id = %record.id,
        method = "password",
        refresh_family = %issued_refresh.family_id,
        "User logged in via email + password"
    );

    Ok((
        jar,
        Json(LoginResponse {
            user: UserInfo::from(profile),
        }),
    ))
}
