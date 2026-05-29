//! HTTP request handlers for user-profile endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Multipart, State, multipart::MultipartError},
    http::StatusCode,
};
use axum_extra::extract::CookieJar;
use chrono::Utc;

use crate::{
    common::{ApiError, ApiResult, AppState, UserInfo, tokens},
    providers::EmailMessage,
    services::{
        auth::{AuthUser, cookies},
        users::{
            db::{self, SoftDeleteOutcome},
            models::{
                AvatarUploadResponse, DeleteAccountRequest, EmailChangeConfirmRequest,
                EmailChangeRequest, UpdateProfileRequest, UpdateRoleRequest,
            },
        },
    },
};

/// Maximum accepted avatar payload size (5 MB).
///
/// Validated in-handler against the byte buffer collected from the
/// `multipart` field. The outer `RequestBodyLimitLayer` in
/// [`crate::server`] is sized to match: anything larger is rejected by the
/// transport layer before it reaches the handler.
const MAX_AVATAR_BYTES: usize = 5 * 1024 * 1024;

/// Minimum accepted avatar payload size.
///
/// No whitelisted image format can be valid below this threshold - even
/// the smallest 1x1 PNG/JPEG/WebP weighs in well above 100 bytes (the
/// minimal PNG runs ~67B, but a real-world 1x1 JPEG needs SOI + APP0 +
/// quantization/Huffman tables + SOS + EOI which adds up past 100). The
/// guard runs before the magic-byte sniff: without it, a 3-byte JPEG
/// SOI (`FF D8 FF`) passes the whitelist, passes the
/// `payload.len() >= JPEG_MAGIC.len()` sniff check, and reaches the
/// storage write as a "broken image" with a 200 response.
const MIN_AVATAR_BYTES: usize = 100;

/// Multipart field name expected for the avatar payload.
const AVATAR_FIELD_NAME: &str = "file";

/// Maximum age (in seconds) of the access token's `iat` claim that the
/// role-change handler accepts.
///
/// 5 minutes mirrors the standard "fresh-auth" window for sensitive
/// flows: after this point, the user must re-login (which mints a new
/// token with `iat = NOW()`) before the role change is admitted. This
/// blocks a long-lived stolen access cookie from being repurposed as
/// a privilege-flip primitive - by the time the attacker can replay
/// it, the iat is already past the window and the request is 403'd.
const ROLE_CHANGE_RECENT_AUTH_WINDOW_SECS: i64 = 5 * 60;

/// Maximum age (in seconds) of the access token's `iat` claim that the
/// self-deletion handler accepts.
///
/// Same window and rationale as
/// [`ROLE_CHANGE_RECENT_AUTH_WINDOW_SECS`]: account deletion is
/// destructive and must require a freshly-authenticated session so a
/// stolen, long-lived access cookie cannot be the only credential
/// behind a wipe. The two constants are intentionally separate so a
/// future tightening of one window (e.g. 60 seconds for deletion) does
/// not auto-tighten the other and surprise role-change clients.
const DELETE_ACCOUNT_RECENT_AUTH_WINDOW_SECS: i64 = 5 * 60;

/// Detected image format for an uploaded avatar.
///
/// Carries both the canonical MIME and the on-disk extension so the handler
/// does not duplicate the lookup table at the call site. [`AVATAR_EXTENSIONS`]
/// is derived from the `ext` field of each variant below, so adding a new
/// variant automatically lands in the sibling-sweep set.
#[derive(Debug, Clone, Copy)]
struct ImageKind {
    /// Canonical IANA MIME type, used both as the storage `Content-Type`
    /// metadata and the cross-check against the client-supplied
    /// `Content-Type` header.
    mime: &'static str,
    /// Storage-key extension (no leading dot).
    ext: &'static str,
}

impl ImageKind {
    const PNG: Self = Self {
        mime: "image/png",
        ext: "png",
    };
    const JPEG: Self = Self {
        mime: "image/jpeg",
        ext: "jpg",
    };
    const WEBP: Self = Self {
        mime: "image/webp",
        ext: "webp",
    };
}

/// Extensions the avatar handler may have produced for a given user
/// historically. Used to delete stale objects under sibling extensions when
/// a user re-uploads with a different image format - without this sweep,
/// changing format leaves the previous blob orphaned in the bucket.
///
/// Derived from the [`ImageKind`] variants so the sweep set is always
/// the exact set of extensions the handler can write. A previous
/// hard-coded list also carried `"jpeg"` which the handler never writes
/// (the JPEG variant's `ext` is `"jpg"`) - that produced a spurious
/// `failed to sweep sibling avatar extension` warning on every
/// format-change upload.
const AVATAR_EXTENSIONS: &[&str] = &[ImageKind::PNG.ext, ImageKind::JPEG.ext, ImageKind::WEBP.ext];

/// Maps an `axum::extract::multipart::MultipartError` into an [`ApiError`]
/// preserving the size-vs-shape distinction.
///
/// `MultipartError::status()` returns 413 for `multer::ErrorKind::FieldSizeExceeded`
/// and `StreamSizeExceeded` (the body-limit overflow path) and 400 for every
/// shape/parser failure. The naive `.map_err(|err| ApiError::BadRequest(...))`
/// pattern collapses both into 400, masking a legitimate 413 - this helper
/// preserves the upstream classification so the avatar handler's documented
/// 413 contract holds even when axum's stream-limited body fires before the
/// outer `RequestBodyLimitLayer`'s eager Content-Length check.
fn multipart_err_to_api(err: &MultipartError) -> ApiError {
    if err.status() == StatusCode::PAYLOAD_TOO_LARGE {
        ApiError::PayloadTooLarge(format!(
            "Avatar payload exceeds {MAX_AVATAR_BYTES}-byte limit"
        ))
    } else {
        ApiError::BadRequest(format!("Failed to read file: {err}"))
    }
}

/// Sniffs the leading bytes of `payload` and returns the detected image
/// kind, or `None` if the payload does not match any whitelisted format.
///
/// The sniff is intentionally minimal:
///
/// - PNG: 8-byte signature `89 50 4E 47 0D 0A 1A 0A`.
/// - JPEG: 3-byte SOI `FF D8 FF` (covers JFIF, EXIF, and bare-JFIF
///   variants - the fourth byte distinguishes them but does not affect
///   acceptance).
/// - WEBP: 12-byte composite (`RIFF` + 4-byte size + `WEBP`). The 4-byte
///   `RIFF` prefix alone collides with AVI/WAV, so the second tag is what
///   actually pins the format.
///
/// Returning `None` is the only failure mode: the handler maps it to 415,
/// which means a payload with a valid MIME header but bytes that do not
/// match any whitelisted signature is rejected the same way as a payload
/// with a disallowed MIME header. This is deliberate - it blocks
/// MIME-spoofing where a client claims `image/png` but sends an executable.
fn sniff_image_kind(payload: &[u8]) -> Option<ImageKind> {
    const PNG_MAGIC: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const JPEG_MAGIC: [u8; 3] = [0xFF, 0xD8, 0xFF];

    if payload.len() >= PNG_MAGIC.len() && payload[..PNG_MAGIC.len()] == PNG_MAGIC {
        return Some(ImageKind::PNG);
    }
    if payload.len() >= JPEG_MAGIC.len() && payload[..JPEG_MAGIC.len()] == JPEG_MAGIC {
        return Some(ImageKind::JPEG);
    }
    if payload.len() >= 12 && &payload[0..4] == b"RIFF" && &payload[8..12] == b"WEBP" {
        return Some(ImageKind::WEBP);
    }
    None
}

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
/// Editable fields: `first_name`, `last_name`, `phone`, `bio`. Fields owned
/// by other flows (`email`, `role`, `status`, `verification_level`,
/// `avatar_url`) are not exposed and silently ignored if a client includes
/// them - serde drops unknown JSON keys by default. `avatar_url` in
/// particular is rewritten only via `POST /me/avatar`, which owns the
/// upload+storage round-trip; allowing it here would let a client parallel
/// race the two endpoints and clobber the URL the storage backend just
/// wrote.
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

// `DELETE /api/v1/users/me`
//
/// Soft-deletes the authenticated user's account.
///
/// Three gates run in strict order before any DB write; a regression
/// that re-orders them surfaces as a different status code:
///
/// 1. **Confirmation string** (400). The body must include
///    `confirm = "delete-my-account"` verbatim. The magic constant
///    blocks accidental zero-body retries from wiping the account; an
///    extra header would be invisible in the audit logs the operator
///    sees later.
/// 2. **Recent-auth check** (403, code `reauthentication_required`).
///    The token's `iat` must be no older than
///    [`DELETE_ACCOUNT_RECENT_AUTH_WINDOW_SECS`]. A stolen, long-lived
///    access cookie cannot be repurposed for an account wipe once the
///    window has elapsed - the attacker must produce a fresh login,
///    which requires the wallet's signing key.
/// 3. **Active-leases gate** (409, code `active_leases_blocking`).
///    A user bound to an active lease as `landlord_id` or
///    `primary_tenant_id` cannot self-delete: the contractual
///    counterparty would be left pointing at a soft-deleted user with
///    no clean way to renegotiate. Runs inside the
///    [`db::soft_delete_user`] transaction (after `SELECT ... FOR
///    UPDATE` on the user row), matching the [`patch_me_role`]
///    pattern - a lease created concurrently after the lock cannot
///    slip through.
///
/// On success [`db::soft_delete_user`] runs four statements in one
/// transaction:
///
/// - `wallet_connections` for the user are deleted (the
///   `trg_wallet_connections_sync_cache` trigger zeros out
///   `users.wallet_address` automatically).
/// - `users.deleted_at = NOW()`, `email = 'deleted-{uuid}@deleted.local'`,
///   and `jwt_invalidate_before = NOW()` are stamped together; the
///   middleware kills every outstanding access token from this point.
/// - All active refresh-token rows are revoked.
/// - One `audit_logs` row records `action = 'self_delete_user'`.
///
/// Both auth cookies are cleared in the response so the browser drops
/// them on receipt - the access token is also rejected by the
/// middleware via `jwt_invalidate_before`, but stamping
/// `Max-Age=0` short-circuits the rejection round-trip and avoids
/// confusing the user with a "logged in but everything 401's" state.
///
/// Authorization: `AuthUser` extractor (any logged-in user). Verified
/// status is intentionally NOT required - a partially-onboarded user
/// must be able to walk away from their account.
///
/// # Errors
///
/// - 400 (`BadRequest`) when `confirm` is missing or wrong.
/// - 401 (`Unauthorized`) when the access cookie is missing or invalid
///   (enforced upstream by `require_auth`).
/// - 403 (`Forbidden`, code `reauthentication_required`) when
///   `claims.iat` is older than [`DELETE_ACCOUNT_RECENT_AUTH_WINDOW_SECS`].
/// - 404 (`NotFound`) if the user row was already soft-deleted between
///   JWT issue and this call.
/// - 409 (`Conflict`, code `active_leases_blocking`) when active leases
///   gate the deletion.
/// - 500 for DB transport failures.
#[utoipa::path(
    delete,
    path = "/me",
    tag = "Users",
    request_body = DeleteAccountRequest,
    responses(
        (status = 204, description = "Account soft-deleted; cookies cleared"),
        (status = 400, description = "Missing or wrong confirmation string"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Re-authentication required"),
        (status = 404, description = "User no longer exists"),
        (status = 409, description = "Active leases block account deletion"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn delete_me(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<DeleteAccountRequest>,
) -> ApiResult<(CookieJar, StatusCode)> {
    let user_id = auth_user.0.sub;
    payload.into_validated()?;

    // Recent-auth gate. Same `i64::try_from` saturation pattern as the
    // role-change handler: a corrupt token with `iat` past i64::MAX
    // clamps to MAX so the subtraction underflows safely, and the gate
    // still admits the request only when `iat` is within the window.
    let now_secs = Utc::now().timestamp();
    let iat_secs = i64::try_from(auth_user.0.iat).unwrap_or(i64::MAX);
    if now_secs.saturating_sub(iat_secs) > DELETE_ACCOUNT_RECENT_AUTH_WINDOW_SECS {
        return Err(ApiError::Forbidden("reauthentication_required".to_owned()));
    }

    match db::soft_delete_user(&state.db, user_id).await? {
        SoftDeleteOutcome::Deleted => {}
        SoftDeleteOutcome::LeaseBlocking => {
            return Err(ApiError::Conflict("active_leases_blocking".to_owned()));
        }
    }

    let clear_access = cookies::build_expired_access_cookie(state.config.cookie_secure);
    let clear_refresh = cookies::build_expired_refresh_cookie(state.config.cookie_secure);
    let jar = CookieJar::new().add(clear_access).add(clear_refresh);

    Ok((jar, StatusCode::NO_CONTENT))
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
/// Per-user rate limit: configurable via `EMAIL_CHANGE_MAX_ATTEMPTS`
/// (default 3) per rolling 24h window. A fresh request from the same
/// user atomically overwrites the previous pending slot, instantly
/// invalidating the previously-emailed link.
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
    let link = format!(
        "{}/confirm-email-change?token={}",
        state.config.frontend_url.trim_end_matches('/'),
        token.plaintext,
    );
    let message = EmailMessage {
        to: new_email,
        subject: "Confirm your new email address".to_owned(),
        body: format!(
            "Click the link below to confirm your new email address. It expires in 24 hours.\n\n{link}\n",
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
/// single UPDATE. The `trg_users_sync_verification_level` trigger recomputes
/// the aggregate `verification_level` automatically.
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

// `POST /api/v1/users/me/avatar`
//
/// Stores a user-supplied avatar image and rewrites `users.avatar_url`.
///
/// Multipart form-data with a single field `file` carrying the image.
/// Validation runs in-handler before any storage I/O so a malformed payload
/// never reaches the backend:
///
/// 1. **Field present**: the multipart body must include a field named
///    `file`. A missing field is 400.
/// 2. **Size cap**: the buffered field bytes must not exceed
///    [`MAX_AVATAR_BYTES`]. Oversize payloads return 413.
/// 3. **Minimum-size guard**: the buffered field bytes must be at least
///    [`MIN_AVATAR_BYTES`]. Truncated payloads (e.g. a 3-byte JPEG SOI)
///    return 415 - they would otherwise satisfy the whitelist and the
///    magic-byte prefix check while being unrenderable.
/// 4. **MIME whitelist**: the field's `Content-Type` header must be one of
///    `image/png`, `image/jpeg`, `image/webp`. Anything else returns 415.
/// 5. **Magic-byte sniff**: the first 12 bytes must match the format the
///    `Content-Type` claims. Mismatches (e.g. `Content-Type: image/png`
///    with JPEG bytes, or `Content-Type: image/webp` with RIFF-header
///    bytes that lack the `WEBP` tag) return 415. This blocks
///    MIME-spoofing attacks where a client uploads an executable under an
///    image MIME header.
///
/// Per-user rate limit: at most 10 uploads per rolling 1h window. Mirrors
/// the email-change pattern so a stolen-cookie attacker cannot use the
/// endpoint as a write-amplification primitive against the storage
/// backend.
///
/// Storage layout: `avatars/{user_id}.{ext}`. Re-uploading with a
/// different extension first sweeps every other extension in
/// [`AVATAR_EXTENSIONS`] before writing the new key, so a format change
/// (PNG -> JPG) does not leave the previous blob orphaned. Sweep failures
/// are logged but not surfaced - the new upload still proceeds, because a
/// failed delete is a billing/observability concern, not a correctness
/// one.
///
/// On success, the storage backend's public URL is persisted to
/// `users.avatar_url` and echoed in the response. The full profile is
/// intentionally not echoed - clients that need the joined shape re-fetch
/// `GET /me`.
///
/// Authorization: `AuthUser` (any logged-in user). Verification is not
/// required - users must be able to set an avatar before completing other
/// onboarding steps.
///
/// # Errors
///
/// - 400 (`BadRequest`) when the `file` field is missing or the multipart
///   stream is malformed.
/// - 401 (`Unauthorized`) when the access cookie is missing or invalid
///   (enforced upstream by `require_auth`).
/// - 413 (`PayloadTooLarge`) when the buffered field exceeds
///   [`MAX_AVATAR_BYTES`].
/// - 415 (`UnsupportedMediaType`) for a disallowed MIME header or a
///   header/byte-content mismatch.
/// - 429 (`TooManyRequests`) when the user exceeds 10 uploads per hour.
/// - 500 for storage transport, Redis, or DB failures.
#[utoipa::path(
    post,
    path = "/me/avatar",
    tag = "Users",
    request_body(
        content = Vec<u8>,
        content_type = "multipart/form-data",
        description = "Multipart form with a single `file` field (PNG/JPEG/WebP, max 5 MB)",
    ),
    responses(
        (status = 200, description = "Avatar stored", body = AvatarUploadResponse),
        (status = 400, description = "Missing or malformed `file` field"),
        (status = 401, description = "Unauthorized"),
        (status = 413, description = "Payload too large (over 5 MB)"),
        (status = 415, description = "Unsupported media type"),
        (status = 429, description = "Too many avatar uploads"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn upload_avatar(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> ApiResult<Json<AvatarUploadResponse>> {
    let user_id = auth_user.0.sub;

    if state.redis.is_avatar_upload_rate_limited(user_id).await? {
        return Err(ApiError::TooManyRequests(
            "Too many avatar uploads".to_owned(),
        ));
    }

    let mut file_field = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|err| multipart_err_to_api(&err))?
    {
        // Only the first `file` field is honored. Extra fields (or a
        // duplicate `file`) are ignored rather than 400-rejected so a
        // future client that adds e.g. a `crop` field does not break this
        // endpoint at the schema layer.
        if field.name() == Some(AVATAR_FIELD_NAME) {
            let declared_mime = field
                .content_type()
                .map(str::to_ascii_lowercase)
                .ok_or_else(|| {
                    ApiError::BadRequest("file field is missing Content-Type".to_owned())
                })?;
            let bytes = field
                .bytes()
                .await
                .map_err(|err| multipart_err_to_api(&err))?
                .to_vec();
            file_field = Some((declared_mime, bytes));
            break;
        }
    }

    let (declared_mime, bytes) =
        file_field.ok_or_else(|| ApiError::BadRequest("Missing `file` field".to_owned()))?;

    if bytes.len() > MAX_AVATAR_BYTES {
        return Err(ApiError::PayloadTooLarge(format!(
            "Avatar payload exceeds {MAX_AVATAR_BYTES}-byte limit"
        )));
    }

    // Reject truncated payloads before the whitelist + sniff combo. A
    // 3-byte body `[0xFF, 0xD8, 0xFF]` would otherwise satisfy both the
    // `image/jpeg` whitelist and the SOI-prefix sniff while being
    // unrenderable - producing a 200 response and a broken object in
    // storage.
    if bytes.len() < MIN_AVATAR_BYTES {
        return Err(ApiError::UnsupportedMediaType(format!(
            "Avatar payload below {MIN_AVATAR_BYTES}-byte minimum"
        )));
    }

    // The whitelist gate runs BEFORE the magic-byte sniff so an obviously
    // wrong MIME header (e.g. `application/pdf`) is rejected without
    // touching the bytes. The sniff then catches the spoofing case where
    // the header is on the whitelist but the bytes do not match.
    //
    // RFC 2045 permits parameters on Content-Type (e.g.
    // `image/jpeg; charset=binary`) and some HTTP libraries append them
    // automatically, so the comparison strips everything from the first
    // `;` before matching. The same `mime_base` is reused for the
    // cross-check below; otherwise the cross-check would 415 the
    // payloads the whitelist just accepted.
    let mime_str = declared_mime.as_str();
    let mime_base = mime_str.split(';').next().unwrap_or("").trim();
    if mime_base != ImageKind::PNG.mime
        && mime_base != ImageKind::JPEG.mime
        && mime_base != ImageKind::WEBP.mime
    {
        return Err(ApiError::UnsupportedMediaType(format!(
            "Unsupported media type: {declared_mime}"
        )));
    }

    let detected = sniff_image_kind(&bytes).ok_or_else(|| {
        ApiError::UnsupportedMediaType(
            "File bytes do not match a supported image format".to_owned(),
        )
    })?;

    if detected.mime != mime_base {
        return Err(ApiError::UnsupportedMediaType(format!(
            "Content-Type {declared_mime} does not match detected image format {}",
            detected.mime,
        )));
    }

    // `user_id` is a `Uuid` rendered into the object key. UUIDs cannot
    // contain `/` or `..`, but the invariant is load-bearing for the
    // `avatars/{user_id}.{ext}` prefix: if a future type change ever
    // widens this to a free-form `String`, a slash in the value would
    // traverse out of the bucket prefix. Cheap debug_assert documents
    // and pins the constraint at the only place where it matters.
    debug_assert!(
        !user_id.to_string().contains('/'),
        "user_id must not contain path separators",
    );

    // Sweep stale blobs under sibling extensions BEFORE writing the new
    // key. Doing it after would leave a window where two objects exist for
    // the same user. Failures here are downgraded to a warning - the new
    // upload still proceeds, the orphan is a billing concern that a
    // janitor sweep can clean up offline.
    for old_ext in AVATAR_EXTENSIONS.iter().copied() {
        if old_ext == detected.ext {
            continue;
        }
        let old_key = format!("avatars/{user_id}.{old_ext}");
        if let Err(err) = state.media_storage.delete(&old_key).await {
            tracing::warn!(
                error = %err,
                user_id = %user_id,
                key = %old_key,
                "failed to sweep sibling avatar extension; orphan may persist",
            );
        }
    }

    let key = format!("avatars/{}.{}", user_id, detected.ext);
    let avatar_url = state
        .media_storage
        .put(&key, &bytes, detected.mime)
        .await
        .map_err(|err| {
            // Provider detail (bucket, endpoint, signed-URL fragments) goes
            // to logs via a structured `error` field; the `ApiError::Internal`
            // payload carries only a generic operator-facing message. The
            // `IntoResponse` impl already replaces any `Internal` payload
            // with a flat "An internal server error occurred" body, so
            // this is defence-in-depth against a future change that
            // accidentally echoes the payload to the client.
            tracing::error!(error = %err, "media storage put failed");
            ApiError::Internal("media storage operation failed".to_owned())
        })?;

    // DB write before the rate-limit bump: a `RowNotFound` (or any
    // other DB failure) here aborts before `record_avatar_upload_attempt`
    // runs, so the user does not lose a rate-limit slot for an upload
    // that the client never observed as successful. The storage blob
    // written above may linger as an orphan, but that is a billing
    // concern (already documented in the sweep section) and not a
    // correctness/UX issue.
    db::update_avatar_url(&state.db, user_id, &avatar_url).await?;

    state.redis.record_avatar_upload_attempt(user_id).await?;

    Ok(Json(AvatarUploadResponse { avatar_url }))
}

// `PATCH /api/v1/users/me/role`
//
/// Switches the authenticated user's role to `request.role` and force-revokes
/// every outstanding session.
///
/// Five gates run in strict order; a regression that re-orders any of them
/// would surface as a different status code for the same request:
///
/// 1. **Whitelist validation** (400). Only `tenant`, `landlord`, `agent` are
///    self-selectable. `admin` / `property_manager` and any unknown string
///    are rejected before any DB or Redis I/O. Reuses the same gate as
///    `LoginRequest.role` so the two surfaces cannot drift.
/// 2. **Recent-auth check** (403, code `reauthentication_required`). The
///    token's `iat` must be no older than [`ROLE_CHANGE_RECENT_AUTH_WINDOW_SECS`].
///    Privilege change is sensitive enough to require a freshly
///    authenticated session - a stolen access cookie cannot be
///    repurposed for it once the window has elapsed.
/// 3. **Idempotent shortcut**. The transaction's `SELECT ... FOR UPDATE`
///    locks the row; if `old_role == new_role` the function commits and
///    returns 200 WITHOUT touching Redis. This makes idempotent retries
///    (and the bidirectional flow `tenant -> landlord -> tenant` after
///    the rate-limit window) completely free in budget terms.
/// 4. **Rate-limit** (429, code `rate_limited`). Only consulted when the
///    role actually differs - so a noop never burns a slot. Threshold 1
///    per 24h; any prior committed change blocks the next within the
///    window. The error path explicitly `drop(tx)`s before returning so
///    the `FOR UPDATE` row lock is released eagerly rather than at
///    end-of-scope async-drop.
/// 5. **Active-leases pre-check** (409, code `active_leases_blocking`). A
///    user bound to an active lease as `landlord` or `primary_tenant`
///    cannot change role - the contractual counterparty would silently
///    flip type. Runs inside the transaction so a lease created
///    concurrently after our `FOR UPDATE` cannot slip through. The
///    blocking-leases error path uses the same explicit `drop(tx)`
///    pattern as the rate-limit branch.
///
/// On success:
///
/// - `users.role` is rewritten and `jwt_invalidate_before = NOW()` is
///   stamped, killing every outstanding access token (the auth middleware
///   compares `iat <= cutoff`).
/// - Every active refresh row is revoked.
/// - An `audit_logs` row records `old_role -> new_role` with
///   `status = 'success'`.
/// - `record_role_change_attempt` bumps the rate-limit counter.
/// - Both auth cookies are stamped expired in the response so the browser
///   drops them on receipt - clients MUST re-login to obtain a token
///   reflecting the new role.
///
/// The Redis bump runs AFTER `tx.commit()` succeeds. If Redis fails between
/// commit and bump, the worst case is that one extra change can squeeze
/// through before the limit kicks in - but the audit log already recorded
/// the change, so accountability is preserved. The alternative (bump
/// inside the transaction) would let a transient Redis hiccup roll back
/// an otherwise-successful UPDATE the user already saw confirmation for.
///
/// The idempotent-shortcut return path returns an empty `CookieJar`: a
/// noop change is not a logout event, no cookies need to be cleared,
/// and the user's existing access token is still valid (we did not bump
/// `jwt_invalidate_before` for them).
///
/// # Errors
///
/// - 400 (`BadRequest`) for non-whitelist roles.
/// - 401 (`Unauthorized`) when the access cookie is missing or invalid
///   (enforced upstream by `require_auth`).
/// - 403 (`Forbidden`, code `reauthentication_required`) when
///   `claims.iat` is older than [`ROLE_CHANGE_RECENT_AUTH_WINDOW_SECS`].
/// - 404 (`NotFound`) if the user row was soft-deleted between JWT
///   issue and this call.
/// - 409 (`Conflict`, code `active_leases_blocking`) when active leases
///   gate the change.
/// - 429 (`TooManyRequests`, code `rate_limited`) when the user has
///   already changed role within the rolling 24h window.
/// - 500 for Redis or DB transport failures.
#[utoipa::path(
    patch,
    path = "/me/role",
    tag = "Users",
    request_body = UpdateRoleRequest,
    responses(
        (status = 200, description = "Role changed; cookies cleared", body = UserInfo),
        (status = 400, description = "Invalid role"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Re-authentication required"),
        (status = 404, description = "User no longer exists"),
        (status = 409, description = "Active leases block role change"),
        (status = 429, description = "Too many role-change requests"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn patch_me_role(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<UpdateRoleRequest>,
) -> ApiResult<(CookieJar, Json<UserInfo>)> {
    let user_id = auth_user.0.sub;
    let new_role = payload.into_validated()?;

    // Recent-auth gate. Cast `iat` to i64 saturating-up so a corrupt token
    // with `iat` past i64::MAX does not pass: such a token would yield a
    // negative `now - iat` and skip the window check, but `i64::MAX` makes
    // the subtraction underflow safely (clamped via `saturating_sub`).
    let now_secs = Utc::now().timestamp();
    let iat_secs = i64::try_from(auth_user.0.iat).unwrap_or(i64::MAX);
    if now_secs.saturating_sub(iat_secs) > ROLE_CHANGE_RECENT_AUTH_WINDOW_SECS {
        return Err(ApiError::Forbidden("reauthentication_required".to_owned()));
    }

    let mut tx = state.db.begin().await?;

    let old_role = db::lock_user_role(tx.as_mut(), user_id).await?;

    // Idempotent shortcut: a noop must not burn rate-limit budget. The
    // commit here is intentional even though no rows changed - it
    // releases the `FOR UPDATE` lock immediately rather than waiting
    // for tx-drop, freeing concurrent reads on the row.
    if old_role == new_role {
        tx.commit().await?;
        let profile = db::fetch_user_profile(&state.db, user_id).await?;
        return Ok((CookieJar::new(), Json(UserInfo::from(profile))));
    }

    if state.redis.is_role_change_rate_limited(user_id).await? {
        // Release the `FOR UPDATE` lock eagerly rather than waiting for
        // the implicit tx-drop at end-of-scope - mirrors the explicit
        // `tx.commit()` in the idempotent shortcut above. Without this,
        // concurrent readers on the same user row would block on our
        // dropped-but-not-yet-rolled-back transaction for as long as the
        // async-drop rollback takes to complete.
        drop(tx);
        return Err(ApiError::TooManyRequests("rate_limited".to_owned()));
    }

    if db::has_blocking_leases(tx.as_mut(), user_id).await? {
        drop(tx);
        return Err(ApiError::Conflict("active_leases_blocking".to_owned()));
    }

    let old_role_str = old_role.to_string();
    let new_role_str = new_role.to_string();
    db::apply_user_role_change(tx.as_mut(), user_id, &old_role_str, &new_role_str).await?;
    tx.commit().await?;

    // See module-level rationale: bumping AFTER commit trades a tiny
    // liberal-on-Redis-fail window for never rolling back a UPDATE the
    // user already saw confirmed.
    state.redis.record_role_change_attempt(user_id).await?;

    let profile = db::fetch_user_profile(&state.db, user_id).await?;

    let clear_access = cookies::build_expired_access_cookie(state.config.cookie_secure);
    let clear_refresh = cookies::build_expired_refresh_cookie(state.config.cookie_secure);
    let jar = CookieJar::new().add(clear_access).add(clear_refresh);

    Ok((jar, Json(UserInfo::from(profile))))
}
