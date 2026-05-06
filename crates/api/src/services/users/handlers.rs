//! HTTP request handlers for user-profile endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Multipart, State},
    http::StatusCode,
};

use crate::{
    common::{ApiError, ApiResult, AppState, EmailMessage, StorageError, UserInfo},
    services::{
        auth::AuthUser,
        users::{
            db,
            models::{
                AvatarUploadResponse, EmailChangeConfirmRequest, EmailChangeRequest,
                UpdateProfileRequest,
            },
            tokens,
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

/// Multipart field name expected for the avatar payload.
const AVATAR_FIELD_NAME: &str = "file";

/// Extensions the avatar handler may have produced for a given user
/// historically. Used to delete stale objects under sibling extensions when
/// a user re-uploads with a different image format - without this sweep,
/// changing format leaves the previous blob orphaned in the bucket.
const AVATAR_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];

/// Detected image format for an uploaded avatar.
///
/// Carries both the canonical MIME and the on-disk extension so the handler
/// does not duplicate the lookup table at the call site. The extension is
/// kept in sync with `AVATAR_EXTENSIONS`: a new variant here MUST be
/// represented in the sweep set, otherwise the sibling cleanup will leave
/// the previous blob orphaned.
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
/// 3. **MIME whitelist**: the field's `Content-Type` header must be one of
///    `image/png`, `image/jpeg`, `image/webp`. Anything else returns 415.
/// 4. **Magic-byte sniff**: the first 12 bytes must match the format the
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
        .map_err(|err| ApiError::BadRequest(format!("Malformed multipart: {err}")))?
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
                .map_err(|err| ApiError::BadRequest(format!("Failed to read file: {err}")))?
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

    // The whitelist gate runs BEFORE the magic-byte sniff so an obviously
    // wrong MIME header (e.g. `application/pdf`) is rejected without
    // touching the bytes. The sniff then catches the spoofing case where
    // the header is on the whitelist but the bytes do not match.
    let mime_str = declared_mime.as_str();
    if mime_str != ImageKind::PNG.mime
        && mime_str != ImageKind::JPEG.mime
        && mime_str != ImageKind::WEBP.mime
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

    if detected.mime != mime_str {
        return Err(ApiError::UnsupportedMediaType(format!(
            "Content-Type {declared_mime} does not match detected image format {}",
            detected.mime,
        )));
    }

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
        .put(&key, bytes, detected.mime)
        .await
        .map_err(|err| match err {
            StorageError::Transport(detail) => ApiError::Internal(detail),
            StorageError::NotConfigured => {
                ApiError::Internal("media storage not configured".to_owned())
            }
        })?;

    state.redis.record_avatar_upload_attempt(user_id).await?;

    db::update_avatar_url(&state.db, user_id, &avatar_url).await?;

    Ok(Json(AvatarUploadResponse { avatar_url }))
}
