//! Email-verification endpoints.
//!
//! `POST /auth/verify/email/send` issues a one-time verification link to the
//! authenticated user's stored email. The confirm/resend halves of the flow
//! land in follow-up commits; this module starts with `send`.
//!
//! Authorization mirrors the rest of the auth service: the route is mounted
//! under the public router but guarded per-handler by the [`AuthUser`]
//! extractor, which performs the same JWT validation as `require_auth`.

use std::sync::Arc;

use axum::{Json, extract::State};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{
    common::{ApiError, ApiResult, AppState, tokens},
    providers::{EmailError, EmailMessage},
    services::auth::{AuthUser, db},
    workers::email_retry,
};

/// Response body for a successful verify-email send.
///
/// `status` is always `"sent"`. A transient mailer failure still yields
/// `"sent"` because the message is queued for background retry - the user
/// has nothing to act on differently, so the status code carries no extra
/// signal (A6).
#[derive(Debug, Serialize, ToSchema)]
pub struct VerifySendResponse {
    /// Always `"sent"`.
    pub status: String,
}

impl VerifySendResponse {
    fn sent() -> Json<Self> {
        Json(Self {
            status: "sent".to_owned(),
        })
    }
}

// `POST /api/v1/auth/verify/email/send`
//
/// Issues a verification link to the authenticated user's stored email.
///
/// Operation order follows A3: the read-only rate-limit check and the
/// `email IS NULL` guard both run *before* the counter is incremented, so a
/// wallet-only user who taps the button never burns their hourly slot.
///
/// # Errors
///
/// - `429 rate_limited` when the per-minute or hourly send limit is exceeded.
/// - `400 email_not_set` when the user has no email on file (A7).
/// - `500 email_send_failed` on a permanent mailer failure; the token and
///   rate-limit slot are rolled back first so the user is not blocked.
/// - `500` on an underlying Redis or database failure.
#[utoipa::path(
    post,
    path = "/verify/email/send",
    tag = "Auth",
    responses(
        (status = 200, description = "Verification email sent or queued for retry", body = VerifySendResponse),
        (status = 400, description = "email_not_set - user has no email to verify"),
        (status = 401, description = "Unauthorized"),
        (status = 429, description = "rate_limited"),
        (status = 500, description = "email_send_failed"),
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
    let user_id = auth_user.0.sub;

    // Read-only rate-limit check - does NOT increment (A3).
    if state
        .redis
        .is_verify_email_send_rate_limited(user_id)
        .await?
    {
        return Err(ApiError::TooManyRequests("rate_limited".to_owned()));
    }

    // Email fetch + NOT NULL guard (A7). Counter still untouched here, so
    //    a wallet-only account that hits this path does not lose a slot.
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

    // Build and attempt delivery.
    let message = verification_email(&email, &state.config.frontend_url, &token.plaintext);
    match state.mailer.send(message.clone()).await {
        Ok(()) => Ok(VerifySendResponse::sent()),
        // Transient: the user is told it is on the way; the retry queue
        // delivers in the background. Counter stays bumped - the mail WILL
        // be sent, so the rate limit should account for it (A3/A6).
        Err(EmailError::Transient(reason)) => {
            tracing::warn!(
                %reason,
                %user_id,
                "verify-email transient send failure - queuing for retry",
            );
            email_retry::db::insert_retry(&state.db, &message).await?;
            Ok(VerifySendResponse::sent())
        }
        // Permanent: nothing the queue can fix. Roll back so the user is not
        // blocked - the token is now useless and the slot is freed (A3).
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
