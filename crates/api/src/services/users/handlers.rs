//! HTTP request handlers for user-profile endpoints.

use std::sync::Arc;

use axum::{Json, extract::State, http::StatusCode};

use crate::{
    common::{ApiError, ApiResult, AppState, EmailMessage, UserInfo},
    services::{
        auth::AuthUser,
        users::{
            db,
            models::{EmailChangeConfirmRequest, EmailChangeRequest, UpdateProfileRequest},
            tokens,
        },
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

// `POST /api/v1/users/me/email`
//
/// Initiates an email change for the authenticated user.
///
/// Two-step flow: this endpoint emails a single-use 24h token to the
/// candidate `new_email`; the user then posts that token to
/// `/me/email/confirm` to actually rewrite the column. The DB row is not
/// touched until the confirmation step succeeds, so a typo in the new
/// address never leaves the user with a broken email column.
///
/// Per-user rate limit: at most 3 requests per rolling 24h window. A
/// fresh request from the same user atomically overwrites the previous
/// pending slot, instantly invalidating the previously-emailed link.
///
/// Authorization: `AuthUser` (any logged-in user; verification not
/// required - users must be able to fix typos in their email before
/// completing other verifications).
///
/// # Errors
///
/// - 400 (`BadRequest`) for malformed `new_email`.
/// - 409 (`Conflict`) when the candidate email is already in use by
///   another active user.
/// - 429 (`TooManyRequests`) when the user has exceeded the rolling
///   rate-limit window.
/// - 500 for Redis/email-transport failures.
#[utoipa::path(
    post,
    path = "/me/email",
    tag = "Users",
    request_body = EmailChangeRequest,
    responses(
        (status = 202, description = "Confirmation email queued"),
        (status = 400, description = "Invalid email format"),
        (status = 401, description = "Unauthorized"),
        (status = 409, description = "Email already in use"),
        (status = 429, description = "Too many email-change requests"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn request_email_change(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<EmailChangeRequest>,
) -> ApiResult<StatusCode> {
    let user_id = auth_user.0.sub;
    let new_email = payload.into_validated()?;

    if state.redis.is_email_change_rate_limited(user_id).await? {
        return Err(ApiError::TooManyRequests(
            "Too many email-change requests".to_owned(),
        ));
    }

    if db::is_email_taken(&state.db, &new_email, user_id).await? {
        return Err(ApiError::Conflict("Email already in use".to_owned()));
    }

    let token = tokens::generate();

    state
        .redis
        .save_email_change_token(user_id, &token.hash, &new_email)
        .await?;
    state.redis.record_email_change_attempt(user_id).await?;

    // TODO: also send a "your email is being changed" notification to the
    // OLD email so the user can react to a misissued request even when
    // the new mailbox is not under their control. Deferred to a follow-up
    // commit to keep this one focused on the confirmation round-trip.
    let message = EmailMessage {
        to: new_email,
        subject: "Confirm your new email address".to_owned(),
        body: format!(
            "Use this token within 24 hours to confirm the email change: {}",
            token.plaintext,
        ),
    };
    if let Err(send_err) = state.mailer.send(message).await {
        // Roll back both side effects so a transient SMTP outage does
        // not (a) leave a 24h orphan token tying up the slot and (b)
        // burn one of the user's three daily attempts. Failures here
        // are best-effort - we log them but still surface the original
        // transport error so the operator sees the root cause.
        if let Err(redis_err) = state.redis.clear_email_change_token(user_id).await {
            tracing::warn!(
                error = %redis_err,
                user_id = %user_id,
                "failed to clear email-change token after mailer failure",
            );
        }
        if let Err(redis_err) = state.redis.decrement_email_change_attempt(user_id).await {
            tracing::warn!(
                error = %redis_err,
                user_id = %user_id,
                "failed to decrement email-change attempt counter after mailer failure",
            );
        }
        return Err(send_err.into());
    }

    Ok(StatusCode::ACCEPTED)
}

// `POST /api/v1/users/me/email/confirm`
//
/// Confirms a pending email change and applies it to the user record.
///
/// Looks up the pending request via atomic `GETDEL` keyed on `user_id`,
/// compares the SHA-256 of the presented token against the stored hash,
/// and on match rewrites `email = new_email, email_verified = TRUE` in a
/// single UPDATE. The `trg_users_profile_complete` trigger recomputes the
/// aggregate `verification_level` automatically.
///
/// Failure modes:
///
/// - **Missing/expired token slot**: `GETDEL` returned `None`. 401.
/// - **Hash mismatch**: token was tampered with or copy-pasted from a
///   stale email. The slot is already consumed by the `GETDEL`, so a
///   second attempt with the original valid token would also 401 - this
///   is intentional (one wrong attempt invalidates the link, forcing
///   re-issuance).
/// - **Email taken in race**: another concurrent change committed
///   first; surfaced as 409 by the existing
///   `From<sqlx::Error>` mapping for unique-violations.
///
/// # Errors
///
/// - 400 (`BadRequest`) for malformed token shape.
/// - 401 (`Unauthorized`) when the token does not match a pending
///   request (missing, expired, already consumed, or wrong).
/// - 404 (`NotFound`) if the user row was soft-deleted between request
///   and confirm.
/// - 409 (`Conflict`) when another user took the email between request
///   pre-check and confirm apply.
/// - 500 for Redis/DB failures.
#[utoipa::path(
    post,
    path = "/me/email/confirm",
    tag = "Users",
    request_body = EmailChangeConfirmRequest,
    responses(
        (status = 200, description = "Email change confirmed", body = UserInfo),
        (status = 400, description = "Invalid token format"),
        (status = 401, description = "Token invalid, expired, or already consumed"),
        (status = 404, description = "User no longer exists"),
        (status = 409, description = "Email taken in race"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn confirm_email_change(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<EmailChangeConfirmRequest>,
) -> ApiResult<Json<UserInfo>> {
    let user_id = auth_user.0.sub;
    let token = payload.into_validated()?;
    let presented_hash = tokens::hash_presented(&token);

    let Some((stored_hash, new_email)) = state.redis.take_email_change_token(user_id).await? else {
        return Err(ApiError::Unauthorized(
            "invalid_email_change_token".to_owned(),
        ));
    };

    if presented_hash != stored_hash {
        return Err(ApiError::Unauthorized(
            "invalid_email_change_token".to_owned(),
        ));
    }

    let profile = db::apply_email_change(&state.db, user_id, &new_email).await?;
    Ok(Json(UserInfo::from(profile)))
}
