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
use chrono::{Duration, Utc};
use secrecy::ExposeSecret;
use uuid::Uuid;

use crate::{
    common::{
        ApiError, ApiResult, AppState, ErrorResponse, SendReservation, UserInfo, UserStatus,
        password, tokens,
    },
    providers::{EmailError, EmailMessage},
    services::{
        auth::{
            cookies,
            db::{self, RegisterOutcome},
            jwt,
            models::{
                ForgotPasswordRequest, ForgotPasswordResponse, LoginResponse, PasswordLoginRequest,
                RegisterRequest, ResetPasswordRequest,
            },
            refresh,
            verify::RequestAudit,
        },
        users,
    },
    workers::email_retry,
};

/// The single generic error every password-login authentication failure
/// collapses to.
///
/// Unknown email, wrong password, and wallet-only account (NULL hash) all
/// return this identical `401`, so the response never reveals which check
/// failed - the anti-enumeration guarantee for the login path.
fn invalid_credentials() -> ApiError {
    ApiError::Unauthorized("Invalid email or password".to_owned())
}

/// Per-IP registration rate-limit gate.
///
/// Fails open like the wallet-login limiter: a Redis outage degrades to "no
/// extra limit" - the global `GovernorLayer` still applies - rather than taking
/// registration down. A missing peer IP (no `ConnectInfo`, only off the real
/// HTTP transport) skips the per-IP counter since there is nothing to key on.
/// Invoked only after the payload validates, so malformed bodies the validator
/// rejects never reach this gate and cannot burn an IP's registration budget.
async fn enforce_register_rate_limit(state: &AppState, ip: Option<&str>) -> ApiResult<()> {
    let Some(ip) = ip else {
        return Ok(());
    };
    if state
        .redis
        .is_register_rate_limited(ip)
        .await
        .unwrap_or(false)
    {
        tracing::warn!(
            event = "register_rate_limited",
            %ip,
            "Too many registration attempts from this client"
        );
        return Err(ApiError::TooManyRequests("rate_limited".to_owned()));
    }
    if let Err(err) = state.redis.record_register_attempt(ip).await {
        tracing::warn!(error = %err, %ip, "failed to record registration attempt");
    }
    Ok(())
}

/// Records one failed password-login against the per-email limiter, best-effort.
///
/// A Redis error is logged, never propagated: the user-facing result is the 401
/// credential failure, which must not become a 500 just because the counter
/// could not be bumped - that would both mask the real outcome and leak Redis
/// state as an enumeration side-channel. The email is deliberately kept out of
/// the log line. Mirrors the warn-on-failure shape of [`enforce_register_rate_limit`].
async fn note_login_failure(state: &AppState, email: &str) {
    if let Err(err) = state.redis.record_password_login_failure(email).await {
        tracing::warn!(error = %err, "failed to record password-login failure");
    }
}

// `POST /api/v1/auth/register`
//
/// Registers a new email + password user and logs them in.
///
/// The payload is first normalized and validated (email syntax, password
/// policy, role whitelist, non-empty names), then the password is
/// Argon2id-hashed. A `users` row is inserted with
/// `primary_auth_method = 'password'`, `status = 'pending_verification'`,
/// `verification_level = 'none'`, and no wallet; a duplicate email yields 409.
/// Finally the new user is auto-logged-in: an access JWT and refresh token are
/// minted and returned via `Set-Cookie`, with the profile in the body - the
/// same shape as wallet login.
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
        (status = 429, description = "Too many registration attempts from this client", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn register(
    State(state): State<Arc<AppState>>,
    audit: RequestAudit,
    Json(payload): Json<RegisterRequest>,
) -> ApiResult<(CookieJar, Json<LoginResponse>)> {
    // Validate first so a flood of malformed bodies cannot consume the per-IP
    // registration budget; only well-formed requests reach the rate-limit gate.
    let validated = payload.into_validated()?;

    enforce_register_rate_limit(&state, audit.ip.as_deref()).await?;

    let password_hash = password::hash_password(validated.password.expose_secret())?;

    let user_record = match db::create_password_user(
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
    let profile = users::db::fetch_user_profile(&state.db, user_record.id).await?;

    let jar = cookies::build_session_cookies(
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
/// The email is normalized and the account looked up, then the presented
/// password is verified against the stored Argon2id hash in constant time - a
/// missing account or a wallet-only row (NULL hash) runs a dummy verify so the
/// failure path matches the success path in timing. The `status` is then gated:
/// `active` and `pending_verification` may log in, while `suspended` /
/// `inactive` are rejected with 403. On success a fresh access JWT + refresh
/// token are issued (the refresh issuance revokes any prior session) and both
/// returned via `Set-Cookie`.
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
        (status = 429, description = "Too many failed login attempts for this email", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn login_password(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<PasswordLoginRequest>,
) -> ApiResult<(CookieJar, Json<LoginResponse>)> {
    let email = payload.email.trim().to_ascii_lowercase();

    // Per-email brute-force gate (fails open on a Redis error, mirroring the
    // wallet limiter). The 429 leaks nothing: it is returned for any email,
    // registered or not, so the anti-enumeration guarantee still holds.
    if state
        .redis
        .is_password_login_rate_limited(&email)
        .await
        .unwrap_or(false)
    {
        tracing::warn!(
            event = "login_rate_limited",
            "Password login rejected: too many recent failures for this email"
        );
        return Err(ApiError::TooManyRequests("rate_limited".to_owned()));
    }

    // Anti-enumeration: an unknown email and a wallet-only account (NULL hash)
    // must be indistinguishable from a wrong password. Both branches burn a
    // dummy Argon2 verify so the response time matches the real path, record the
    // failure against the per-email limiter, then return the same generic 401.
    let Some(record) = db::find_password_login_by_email(&state.db, &email).await? else {
        password::dummy_verify(payload.password.expose_secret());
        note_login_failure(&state, &email).await;
        return Err(invalid_credentials());
    };
    let Some(password_hash) = record.password_hash.as_deref() else {
        password::dummy_verify(payload.password.expose_secret());
        note_login_failure(&state, &email).await;
        return Err(invalid_credentials());
    };

    if !password::verify_password(payload.password.expose_secret(), password_hash) {
        tracing::info!(
            event = "login_failed",
            reason = "bad_password",
            "Password login rejected: credentials did not match"
        );
        note_login_failure(&state, &email).await;
        return Err(invalid_credentials());
    }

    // Status gate: a suspended or inactive account has valid credentials, so
    // enumeration is moot - return an explicit 403 rather than the generic
    // 401. `pending_verification` is allowed in: a freshly-registered user
    // must be able to log in; protected resources are gated separately by the
    // `VerifiedUser<_>` extractor.
    if !matches!(
        record.status,
        Some(UserStatus::Active | UserStatus::PendingVerification)
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
    db::update_last_login_at(&state.db, record.id).await?;
    let profile = users::db::fetch_user_profile(&state.db, record.id).await?;

    let jar = cookies::build_session_cookies(
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

// `POST /api/v1/auth/password/forgot`
//
/// Starts the forgotten-password flow by emailing a reset link.
///
/// Anti-enumeration is the whole design: the response is always
/// `200 { status: "sent" }`. A real reset token is minted and mailed *only*
/// when the normalized email maps to a live account that actually has a
/// password (`password_hash IS NOT NULL`). An unknown email, a wallet-only
/// account, or a throttled send all produce the same `sent` answer with no
/// token, so an attacker cannot use this endpoint to discover which addresses
/// are registered or which use password auth.
///
/// Unauthenticated (mounted on the public router): a user who forgot their
/// password by definition cannot present a session.
///
/// # Errors
///
/// - `ApiError::Internal` for an underlying Redis or database failure. These
///   are systemic (identical for every input) so they leak nothing; a mailer
///   failure, by contrast, is swallowed into the `sent` response.
#[utoipa::path(
    post,
    path = "/password/forgot",
    tag = "Auth",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "If the email maps to a reset-eligible account, a reset link was sent", body = ForgotPasswordResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn forgot_password(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> ApiResult<Json<ForgotPasswordResponse>> {
    let email = payload.email.trim().to_ascii_lowercase();

    // Every branch returns the same `sent` body; only this first one does any
    // real work, and only for an account that has a password to reset.
    if let Some(record) = db::find_password_login_by_email(&state.db, &email).await? {
        if record.password_hash.is_some() {
            issue_reset_token(&state, record.id, &email).await?;
        } else {
            tracing::info!(
                event = "password_forgot_noop",
                reason = "wallet_only",
                "Forgot-password request for an account with no password; no link sent"
            );
        }
    } else {
        tracing::info!(
            event = "password_forgot_noop",
            reason = "unknown_email",
            "Forgot-password request for an unknown email; no link sent"
        );
    }

    // Always the same `sent` body, regardless of which branch ran above -
    // the anti-enumeration guarantee.
    Ok(Json(ForgotPasswordResponse {
        status: "sent".to_owned(),
    }))
}

/// Reserves a reset slot and mails the link, rolling back on a permanent
/// mailer failure.
///
/// Mirrors `send_or_resend_verify_email` but with one deliberate divergence:
/// a *permanent* mailer failure is swallowed into `Ok(())` rather than
/// surfaced as `500 email_send_failed`. The verify-email path can report the
/// failure because the caller is authenticated and the email is known to be
/// theirs; here a distinct error for a permanent bounce would let an attacker
/// tell a deliverable address from an undeliverable one, breaking
/// anti-enumeration. The slot and counter are still rolled back so the bounce
/// does not strand the user behind the rate limit.
///
/// A *transient* failure queues the mail for background retry (counters stay
/// bumped, the retry will deliver), matching the verify-email behaviour.
///
/// Returns `Err` only for a systemic Redis or database failure, which is
/// input-independent and therefore not an enumeration signal.
async fn issue_reset_token(state: &Arc<AppState>, user_id: Uuid, email: &str) -> ApiResult<()> {
    let token = tokens::generate();

    // Atomic reserve: rate-limit check + slot write + counter bumps in one Lua
    // step. A throttled caller writes nothing and still gets `sent`.
    match state
        .redis
        .reserve_password_reset_send(user_id, &token.hash)
        .await?
    {
        SendReservation::RateLimited => {
            tracing::info!(
                event = "password_forgot_throttled",
                %user_id,
                "Forgot-password send rate-limited; no link sent"
            );
            return Ok(());
        }
        SendReservation::Reserved => {}
    }

    let message = reset_password_email(email, &state.config.frontend_url, &token.plaintext);
    match state.mailer.send(message.clone()).await {
        Ok(()) => Ok(()),
        // Transient: the queue will deliver. Counters stay bumped - the mail
        // WILL go out, so it should count against the limit.
        Err(EmailError::Transient(reason)) => {
            tracing::warn!(
                %reason,
                %user_id,
                "password-reset transient send failure - queuing for retry",
            );
            email_retry::db::insert_retry(&state.db, &message).await?;
            Ok(())
        }
        // Permanent: roll the slot + counters back, but still answer `sent` so
        // a hard bounce is indistinguishable from a delivered link.
        Err(EmailError::Permanent(reason)) => {
            tracing::error!(
                %reason,
                %user_id,
                "password-reset permanent send failure",
            );
            if let Err(err) = state.redis.clear_password_reset_token(&token.hash).await {
                tracing::warn!(
                    error = %err,
                    %user_id,
                    "failed to clear password-reset token after permanent failure",
                );
            }
            if let Err(err) = state
                .redis
                .decrement_password_reset_send_attempt(user_id)
                .await
            {
                tracing::warn!(
                    error = %err,
                    %user_id,
                    "failed to decrement password-reset counter after permanent failure",
                );
            }
            Ok(())
        }
    }
}

/// Builds the plain-text password-reset email.
///
/// Mirrors `verification_email`: plain-text only for MVP, the token travels in
/// the URL query, and `frontend_url` is trimmed of a trailing slash so the
/// link never doubles up `//`. The 30-minute expiry copy matches
/// `PASSWORD_RESET_TTL`.
fn reset_password_email(to: &str, frontend_url: &str, token: &str) -> EmailMessage {
    let link = format!(
        "{}/reset-password?token={token}",
        frontend_url.trim_end_matches('/'),
    );
    EmailMessage {
        to: to.to_owned(),
        subject: "Reset your password".to_owned(),
        body: format!(
            "Click the link below to reset your password. It expires in 30 minutes.\n\n{link}\n",
        ),
    }
}

// `POST /api/v1/auth/password/reset`
//
/// Completes the forgotten-password flow: redeems the reset token, sets the new
/// password, and re-logs the user in.
///
/// The new password is checked against the policy before Redis is touched, so a
/// weak password is rejected without burning the one-shot token, and the token
/// is shape-checked for length before it is hashed. Redeeming the token is a
/// `GETDEL` on the slot keyed by the token hash: it is single-use, and the
/// stored value is the `user_id` the token was minted for; a miss is the
/// generic invalid-token `400`. The new password is then Argon2id-hashed and,
/// in one transaction, the stored hash is rewritten, the access cutoff is
/// stamped, and every refresh family is revoked - a forgotten password is
/// treated as compromised, so all sessions die, which is stronger than a
/// password change that keeps the current device. Finally the user is
/// auto-logged-in with a fresh pair whose access token is stamped `iat = cutoff
/// + 1s` on the application clock, so it survives the cutoff it just set - the
/// same invariant as change-password.
///
/// Unauthenticated: possession of the emailed token is the only credential.
///
/// # Errors
///
/// - `ApiError::BadRequest` for a malformed/expired/consumed token or a weak
///   new password.
/// - `ApiError::NotFound` if the account was soft-deleted between forgot and
///   reset.
/// - `ApiError::Internal` for hashing, Redis, or database failures.
#[utoipa::path(
    post,
    path = "/password/reset",
    tag = "Auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Password reset; all sessions invalidated, user re-logged in", body = LoginResponse),
        (status = 400, description = "Invalid or expired token, or weak password", body = ErrorResponse),
        (status = 404, description = "Account no longer exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn reset_password(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ResetPasswordRequest>,
) -> ApiResult<(CookieJar, Json<LoginResponse>)> {
    // Policy check first: rejecting a weak password here means a user who fat-
    // fingers the new password keeps their token live for another try.
    let validated = payload.into_validated()?;

    // Length-only shape check before Redis: SHA-256 is defined over arbitrary
    // bytes, so a truncated token would otherwise hash to a guaranteed miss.
    if validated.token.len() != tokens::TOKEN_STR_LEN {
        return Err(invalid_reset_token());
    }

    // GETDEL by token hash: single-use, and the value is the owner's user_id.
    let presented_hash = tokens::hash_presented(&validated.token);
    let Some(user_id) = state
        .redis
        .take_password_reset_token(&presented_hash)
        .await?
    else {
        return Err(invalid_reset_token());
    };

    let new_password_hash = password::hash_password(validated.new_password.expose_secret())?;

    // One app-clock reading drives both the cutoff and the re-issue: the cutoff
    // kills every outstanding access token by `iat`, and the new token is
    // stamped one second later so `iat > cutoff` holds regardless of app/db
    // clock skew. The DB call revokes every refresh family in the same
    // transaction as the cutoff stamp (no "other sessions" to keep - the user
    // is not authenticated during a reset, so this invalidates all of them).
    let now = Utc::now();
    let reissue_at = now + Duration::seconds(1);
    let identity = users::db::update_password_invalidate_other_sessions(
        &state.db,
        user_id,
        &new_password_hash,
        now,
    )
    .await?;
    let encoded = jwt::encode_access_token_at(
        user_id,
        identity.role,
        identity.verification_level,
        &state.config.jwt_secret,
        reissue_at,
    )?;
    let issued_refresh = refresh::issue_login_refresh_token(&state.db, user_id).await?;
    let profile = users::db::fetch_user_profile(&state.db, user_id).await?;

    let jar = cookies::build_session_cookies(
        encoded.token,
        issued_refresh.plaintext,
        state.config.cookie_secure,
    );

    tracing::info!(
        event = "password_reset",
        %user_id,
        refresh_family = %issued_refresh.family_id,
        "Password reset; all sessions invalidated and user re-logged in"
    );

    Ok((
        jar,
        Json(LoginResponse {
            user: UserInfo::from(profile),
        }),
    ))
}

/// The single generic error every reset-token failure collapses to.
///
/// A malformed token, an unknown/expired/already-consumed token all return
/// this identical `400`, so the response never reveals which check failed.
fn invalid_reset_token() -> ApiError {
    ApiError::BadRequest("invalid_or_expired_token".to_owned())
}
