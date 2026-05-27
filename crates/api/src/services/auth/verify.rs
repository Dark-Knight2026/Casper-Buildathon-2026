//! Email-verification endpoints.
//!
//! `POST /auth/verify/email/send` issues a one-time verification link to the
//! authenticated user's stored email; `POST /auth/verify/email/resend` is an
//! alias onto the same handler so the front-end can present "send" and
//! "resend" as distinct affordances while sharing one rate-limit slot.
//! `POST /auth/verify/email/confirm` redeems the link, flips `email_verified`,
//! and re-issues the token pair so the bumped `verification_level` reaches the
//! access claim immediately.
//!
//! Authorization mirrors the rest of the auth service: the routes are mounted
//! under the public router but guarded per-handler by the [`AuthUser`]
//! extractor, which performs the same JWT validation as `require_auth`.

use core::convert::Infallible;
use core::net::SocketAddr;
use core::str::FromStr;
use std::sync::Arc;

use axum::{
    Json,
    extract::{ConnectInfo, FromRequestParts, State},
    http::{header::USER_AGENT, request::Parts},
};
use axum_extra::extract::CookieJar;
use serde::{Deserialize, Serialize};
use subtle::ConstantTimeEq;
use time::Duration as CookieDuration;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, UserInfo, UserRole, tokens},
    providers::{EmailError, EmailMessage},
    services::{
        auth::{AuthUser, cookies, db, jwt, refresh},
        users::db as users_db,
    },
    workers::email_retry,
};

/// Response body for a successful verify-email send.
///
/// `status` is always `"sent"`. A transient mailer failure still yields
/// `"sent"` because the message is queued for background retry - the user
/// has nothing to act on differently, so the status code carries no extra
/// signal.
#[derive(Debug, Serialize, ToSchema)]
pub struct VerifySendResponse {
    /// Always `"sent"`.
    pub status: String,

    /// WARN: DEV/MVP ESCAPE HATCH - present only while email delivery is
    /// unconfigured (no Postmark token, so the mailer is the logging stub).
    ///
    /// TODO: (email-postmark) remove this field together with its population in
    /// `send_or_resend_verify_email` once Postmark delivery is wired up. It
    /// must never be returned in production - handing the token back over HTTP
    /// defeats the email round-trip that proves address ownership.
    ///
    /// The verification token normally travels only inside the email; with no
    /// real mailer there is no inbox to read it from, so the plaintext is
    /// surfaced here to keep the confirm step exercisable during development.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dev_verification_token: Option<String>,
}

impl VerifySendResponse {
    fn sent(dev_verification_token: Option<String>) -> Json<Self> {
        Json(Self {
            status: "sent".to_owned(),
            dev_verification_token,
        })
    }
}

// `POST /api/v1/auth/verify/email/send`
//
/// Issues a verification link to the authenticated user's stored email.
///
/// Thin wrapper over [`send_or_resend_verify_email`]; see there for the flow
/// and ordering guarantees. `/send` and `/resend` run the same logic - the
/// split exists only so the front-end can present "send" (first request) and
/// "resend" (try again) as distinct affordances.
///
/// # Errors
///
/// - `429 rate_limited` when the per-minute or hourly send limit is exceeded.
/// - `400 email_not_set` when the user has no email on file.
/// - `500 email_send_failed` on a permanent mailer failure; the token and
///   rate-limit slot are rolled back first so the user is not blocked.
/// - `500` on an underlying Redis or database failure.
#[utoipa::path(
    post,
    path = "/verify/email/send",
    tag = "Auth",
    responses(
        (status = 200, description = "Verification email sent or queued for retry", body = VerifySendResponse),
        (status = 400, description = "email_not_set - user has no email to verify", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 429, description = "rate_limited", body = ErrorResponse),
        (status = 500, description = "email_send_failed", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn send_verify_email(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> ApiResult<Json<VerifySendResponse>> {
    send_or_resend_verify_email(&state, auth_user.0.sub).await
}

// `POST /api/v1/auth/verify/email/resend`
//
/// Re-issues a verification link - identical behaviour to
/// [`send_verify_email`], sharing the same rate-limit counter and token slot.
///
/// A separate route (rather than reusing `/send`) lets the client express the
/// "resend" intent without the back-end tracking whether a previous send
/// happened; the rate limiter already enforces the once-per-window cap across
/// both paths.
///
/// # Errors
///
/// Identical to [`send_verify_email`].
#[utoipa::path(
    post,
    path = "/verify/email/resend",
    tag = "Auth",
    responses(
        (status = 200, description = "Verification email sent or queued for retry", body = VerifySendResponse),
        (status = 400, description = "email_not_set - user has no email to verify", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 429, description = "rate_limited", body = ErrorResponse),
        (status = 500, description = "email_send_failed", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn resend_verify_email(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> ApiResult<Json<VerifySendResponse>> {
    send_or_resend_verify_email(&state, auth_user.0.sub).await
}

/// Shared send/resend implementation.
///
/// The order is deliberate: the read-only rate-limit check and the
/// `email IS NULL` guard both run *before* the counter is incremented, so a
/// wallet-only user who taps the button never burns their hourly slot.
async fn send_or_resend_verify_email(
    state: &Arc<AppState>,
    user_id: Uuid,
) -> ApiResult<Json<VerifySendResponse>> {
    // Read-only rate-limit check - does NOT increment.
    if state
        .redis
        .is_verify_email_send_rate_limited(user_id)
        .await?
    {
        return Err(ApiError::TooManyRequests("rate_limited".to_owned()));
    }

    // Email fetch + NOT NULL guard. Counter still untouched here, so a
    // wallet-only account that hits this path does not lose a slot.
    let email = db::fetch_user_email_for_verify(&state.db, user_id)
        .await?
        .ok_or_else(|| ApiError::BadRequest("email_not_set".to_owned()))?;

    // Increment both counters now that the request is genuinely actionable.
    state
        .redis
        .record_verify_email_send_attempt(user_id)
        .await?;

    // Generate the opaque token and persist only its hash (24h TTL).
    let token = tokens::generate();
    state
        .redis
        .save_verify_email_token(user_id, &token.hash)
        .await?;

    // WARN: (DEV/MVP ESCAPE HATCH): with no Postmark token the mailer is the
    // logging stub, so the token never reaches a real inbox. Hand the plaintext
    // back in the response so the confirm step stays reachable during
    // development. TODO(email-postmark): delete this once Postmark delivery is
    // configured - returning the token over HTTP bypasses the email-ownership
    // proof.
    let dev_token = state
        .config
        .postmark
        .is_none()
        .then(|| token.plaintext.clone());

    // Build and attempt delivery.
    let message = verification_email(&email, &state.config.frontend_url, &token.plaintext);
    match state.mailer.send(message.clone()).await {
        Ok(()) => Ok(VerifySendResponse::sent(dev_token)),
        // Transient: the user is told it is on the way; the retry queue
        // delivers in the background. Counter stays bumped - the mail WILL
        // be sent, so the rate limit should account for it.
        Err(EmailError::Transient(reason)) => {
            tracing::warn!(
                %reason,
                %user_id,
                "verify-email transient send failure - queuing for retry",
            );
            email_retry::db::insert_retry(&state.db, &message).await?;
            Ok(VerifySendResponse::sent(dev_token))
        }
        // Permanent: nothing the queue can fix. Roll back so the user is not
        // blocked - the token is now useless and the slot is freed.
        Err(EmailError::Permanent(reason)) => {
            tracing::error!(
                %reason,
                %user_id,
                "verify-email permanent send failure",
            );
            if let Err(err) = state.redis.clear_verify_email_token(user_id).await {
                tracing::warn!(
                    error = %err,
                    %user_id,
                    "failed to clear verify-email token after permanent failure",
                );
            }
            if let Err(err) = state
                .redis
                .decrement_verify_email_send_attempt(user_id)
                .await
            {
                tracing::warn!(
                    error = %err,
                    %user_id,
                    "failed to decrement verify-email counter after permanent failure",
                );
            }
            Err(ApiError::Internal("email_send_failed".to_owned()))
        }
    }
}

/// Builds the plain-text verification email.
///
/// Plain-text only for MVP: an HTML alternative is a documented follow-up. The
/// token travels in the URL query; only its SHA-256 hash is stored server-side.
/// `frontend_url` is trimmed of a trailing slash so the link never doubles up
/// `//`.
fn verification_email(to: &str, frontend_url: &str, token: &str) -> EmailMessage {
    let link = format!(
        "{}/verify-email?token={token}",
        frontend_url.trim_end_matches('/'),
    );
    EmailMessage {
        to: to.to_owned(),
        subject: "Verify your email address".to_owned(),
        body: format!(
            "Click the link below to verify your email address. It expires in 24 hours.\n\n{link}\n",
        ),
    }
}

/// Client metadata captured for the audit trail.
///
/// Wrapping `ConnectInfo` and the `User-Agent` header in one extractor keeps
/// them out of the handler signature, where `#[utoipa::path]`'s `axum_extras`
/// parameter inference mis-reads `ConnectInfo(addr): ConnectInfo<SocketAddr>`
/// (it has the same `Name(x): Name<T>` shape as `Path`/`Query`) and fails to
/// expand. A plain named extractor is ignored by that inference. The IP is read
/// from request extensions rather than via the `ConnectInfo` extractor
/// directly, so a missing connect-info (e.g. tests) yields `None` instead of a
/// 500.
#[derive(Debug)]
pub struct RequestAudit {
    /// Peer IP rendered as a string, or `None` when connect-info is absent.
    pub ip: Option<String>,
    /// `User-Agent` header value, or `None` when absent or non-UTF-8.
    pub user_agent: Option<String>,
}

impl<S> FromRequestParts<S> for RequestAudit
where
    S: Send + Sync,
{
    type Rejection = Infallible;

    #[inline]
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let ip = parts
            .extensions
            .get::<ConnectInfo<SocketAddr>>()
            .map(|connect_info| connect_info.0.ip().to_string());
        let user_agent = parts
            .headers
            .get(USER_AGENT)
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned);
        Ok(Self { ip, user_agent })
    }
}

/// Request body for the verify-email confirm step.
///
/// Carries only the opaque token from the verification link. The user id is
/// taken from the access cookie via [`AuthUser`], never from the body, so a
/// forged payload cannot confirm someone else's email.
#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyConfirmRequest {
    /// The 43-char base64url token delivered in the verification email.
    pub token: String,
}

// `POST /api/v1/auth/verify/email/confirm`
//
/// Redeems a verification token and marks the caller's email verified.
///
/// Flow (token slot is consumed by the `GETDEL` regardless of the
/// subsequent compare, so a single wrong attempt invalidates the link and
/// forces a fresh send - this is the brute-force backstop):
///
/// 1. Length-only token check (`TOKEN_STR_LEN`); SHA-256 is stable over
///    arbitrary bytes, so a malformed token fails fast as `400` instead of
///    burning the slot.
/// 2. `GETDEL` the stored hash; a miss (`None`) is `404` - expired,
///    never-issued, or already consumed.
/// 3. Constant-time compare of the presented hash against the stored one;
///    a mismatch is `401`.
/// 4. `confirm_email_verification` flips `email_verified` and writes the
///    audit row in one transaction. On the `AlreadyVerified` race the
///    handler returns the current profile **without** re-issuing tokens, so
///    an idempotent double-tap never logs the user out of other devices.
/// 5. On the genuine transition, a fresh refresh family and access JWT
///    (carrying the bumped `verification_level`) are minted and returned via
///    `Set-Cookie`, alongside the updated [`UserInfo`] in the body.
///
/// # Errors
///
/// - `400 bad_token_format` when the token is not exactly `TOKEN_STR_LEN`
///   chars.
/// - `401 invalid_or_expired_token` when the presented hash does not match.
/// - `404 invalid_or_expired_token` when no token slot exists, or the user
///   row was soft-deleted between send and confirm.
/// - `500` on an underlying Redis or database failure.
#[utoipa::path(
    post,
    path = "/verify/email/confirm",
    tag = "Auth",
    request_body = VerifyConfirmRequest,
    responses(
        (status = 200, description = "Email verified; tokens rotated via Set-Cookie", body = UserInfo),
        (status = 400, description = "bad_token_format", body = ErrorResponse),
        (status = 401, description = "invalid_or_expired_token", body = ErrorResponse),
        (status = 404, description = "invalid_or_expired_token", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn confirm_verify_email(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    audit: RequestAudit,
    Json(payload): Json<VerifyConfirmRequest>,
) -> ApiResult<(CookieJar, Json<UserInfo>)> {
    let user_id = auth_user.0.sub;

    // Length-only shape check: reject before touching Redis.
    let token = payload.token.trim();
    if token.len() != tokens::TOKEN_STR_LEN {
        return Err(ApiError::BadRequest("bad_token_format".to_owned()));
    }

    // GETDEL the stored hash - the slot is consumed even on a later mismatch,
    // which closes the brute-force window.
    let Some(stored_hash) = state.redis.take_verify_email_token(user_id).await? else {
        return Err(ApiError::NotFound("invalid_or_expired_token".to_owned()));
    };

    // Constant-time compare (defence-in-depth; SHA-256 hashes are not
    // secret-dependent in timing, but CT keeps the path uniform).
    let presented_hash = tokens::hash_presented(token);
    if presented_hash[..].ct_eq(&stored_hash[..]).unwrap_u8() != 1 {
        return Err(ApiError::Unauthorized(
            "invalid_or_expired_token".to_owned(),
        ));
    }

    // Apply + audit in one transaction. Audit fields come from the request so
    // the trail is forensically useful.
    let outcome = db::confirm_email_verification(
        &state.db,
        user_id,
        audit.ip.as_deref(),
        audit.user_agent.as_deref(),
    )
    .await?;

    // The profile is needed for the response body in both branches; a
    // soft-deleted user surfaces here as `404` via the `RowNotFound` mapping.
    let profile = users_db::fetch_user_profile(&state.db, user_id).await?;
    let role = UserRole::from_str(&profile.role).unwrap_or(UserRole::Unknown);
    let verification_level = profile.verification_level;
    let user_info = UserInfo::from(profile);

    match outcome {
        // Already verified by another path. No re-issue, no Set-Cookie -
        // revoking the active refresh family for a no-op would sign the user
        // out of their other devices. The claim catches up within one
        // refresh cycle.
        db::VerifyConfirmOutcome::AlreadyVerified => Ok((CookieJar::new(), Json(user_info))),
        // Genuine transition: mint a fresh family so the new
        // `verification_level` lands in the access claim now.
        db::VerifyConfirmOutcome::Verified => {
            let issued = refresh::issue_login_refresh_token(&state.db, user_id).await?;
            let encoded = jwt::encode_access_token(
                user_id,
                role,
                verification_level,
                &state.config.jwt_secret,
            )?;

            let access_cookie = cookies::build_access_cookie(
                encoded.token,
                CookieDuration::seconds(jwt::ACCESS_TOKEN_TTL.num_seconds()),
                state.config.cookie_secure,
            );
            let refresh_cookie = cookies::build_refresh_cookie(
                issued.plaintext,
                CookieDuration::seconds(refresh::REFRESH_TOKEN_TTL.num_seconds()),
                state.config.cookie_secure,
            );

            tracing::info!(
                event = "verify_email_confirmed",
                %user_id,
                "email verified; tokens re-issued",
            );

            Ok((
                CookieJar::new().add(access_cookie).add(refresh_cookie),
                Json(user_info),
            ))
        }
    }
}
