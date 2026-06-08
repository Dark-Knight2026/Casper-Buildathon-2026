//! Refresh-token issuance and rotation.
//!
//! The refresh token is an opaque 32-byte secret returned to the client only
//! via `Set-Cookie` and persisted only as SHA-256 hash. SHA-256 (no salt)
//! is appropriate here because the input is high-entropy (32 random bytes,
//! 256 bits) - rainbow tables are not a threat at that entropy level. This is
//! distinct from password storage, which must use a slow KDF like argon2.

use std::sync::Arc;

use axum::{extract::State, http::StatusCode};
use axum_extra::extract::CookieJar;
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Duration, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, UserId},
    services::auth::{
        cookies::{self, REFRESH_TOKEN_COOKIE},
        db::{self, RefreshOutcome},
        jwt,
    },
};

/// Refresh-token TTL (sliding window).
///
/// 14 days matches industry-standard "active session" expectations: the
/// browser will re-authenticate via the refresh cookie up to 14 days after
/// the last successful refresh. A user logged out for more than 14 days
/// goes through full wallet re-signing.
pub const REFRESH_TOKEN_TTL: Duration = Duration::days(14);

/// Length in bytes of the random material backing a refresh token.
///
/// 32 bytes (256 bits) makes brute-forcing the token-hash space infeasible
/// even against an offline attacker who has stolen the DB but not the
/// plaintext.
const REFRESH_TOKEN_BYTES: usize = 32;

/// Freshly-generated refresh-token components, ready to be persisted and
/// returned to the client.
///
/// Shared by [`issue_login_refresh_token`] (login - DB generates the row id
/// via `uuid_generate_v4()`) and the rotation handler (which generates the
/// id up front so the predecessor's `replaced_by` can back-point to it).
/// The token id is intentionally NOT part of this struct, because that is
/// where the two callers genuinely differ.
struct GeneratedRefreshToken {
    /// Opaque plaintext returned to the client (base64url-no-pad encoded).
    plaintext: String,
    /// SHA-256 of the random bytes; what the DB persists.
    hash: [u8; 32],
    /// Absolute expiry timestamp = `now + REFRESH_TOKEN_TTL`.
    expires_at: DateTime<Utc>,
}

/// Generates 32 random bytes and derives the plaintext / hash / expiry from
/// them. Centralizes the (a) RNG choice, (b) base64 alphabet, (c) hash
/// algorithm, and (d) TTL so the login and rotation paths can never drift
/// apart on any of those four parameters.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] if `now + REFRESH_TOKEN_TTL` overflows
/// the `DateTime<Utc>` range - in practice unreachable, but propagating
/// the error keeps the helper composable with `?`.
fn generate_refresh_token() -> ApiResult<GeneratedRefreshToken> {
    let mut bytes = [0u8; REFRESH_TOKEN_BYTES];
    rand::rng().fill_bytes(&mut bytes);

    // Hash the base64-encoded plaintext (the exact form that lands in
    // the cookie), not the raw 32 random bytes. The rotation handler
    // hashes `cookie.value().as_bytes()` on lookup, so the two forms
    // must agree byte-for-byte or `WHERE token_hash = $1` never matches.
    let plaintext = URL_SAFE_NO_PAD.encode(bytes);
    let hash: [u8; 32] = Sha256::digest(plaintext.as_bytes()).into();

    let expires_at = Utc::now()
        .checked_add_signed(REFRESH_TOKEN_TTL)
        .ok_or_else(|| {
            ApiError::Internal("Timestamp overflow calculating refresh-token expiry".to_owned())
        })?;

    Ok(GeneratedRefreshToken {
        plaintext,
        hash,
        expires_at,
    })
}

/// Output of [`issue_login_refresh_token`].
///
/// The caller wires `plaintext` into the `Set-Cookie` header and discards
/// the in-memory copy after the response is built; the DB row holds only
/// the hash, so the plaintext must travel to the client in this struct or
/// not at all.
#[derive(Debug)]
pub struct IssuedRefreshToken {
    /// Opaque token returned to the client (base64url-no-pad encoded).
    pub plaintext: String,
    /// Family identifier, shared by all future rotations of this login.
    pub family_id: Uuid,
}

/// Issues a brand-new refresh token tied to a fresh family.
///
/// Used on login. Subsequent refreshes go through [`rotate`], which inherits
/// the predecessor's `family_id` and links the rows via `replaced_by`.
///
/// Side effect: revokes every still-active refresh-token row for
/// `user_id` before inserting the new family. This enforces a
/// single-device session model - a fresh login on any device
/// immediately invalidates whatever session was active before, so a
/// stolen `refresh_token` cookie cannot outlive the user's next
/// legitimate login. See
/// [`db::revoke_all_active_refresh_tokens_for_user`] for the trade-off.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] if the underlying DB calls fail or the
/// expiration timestamp arithmetic overflows.
#[inline]
pub async fn issue_login_refresh_token(
    pool: &PgPool,
    user_id: UserId,
) -> ApiResult<IssuedRefreshToken> {
    let token = generate_refresh_token()?;
    let family_id = Uuid::new_v4();

    // Revoke + insert run in one transaction so a transient INSERT failure (FK
    // violation, partial-unique collision, connection drop) rolls back the
    // revoke and the user keeps their previously-active session. Without this
    // atomicity guarantee a flaky DB at login time would leave the account with
    // zero live refresh tokens: prior family dead, new family never persisted,
    // and the only path back is a fresh nonce + re-sign.
    let mut tx = pool.begin().await?;

    db::revoke_all_active_refresh_tokens_for_user(tx.as_mut(), user_id).await?;

    // `?` -> `From<sqlx::Error> for ApiError`: row-not-found becomes 404,
    // unique-violation (vanishingly unlikely SHA-256 collision on the active
    // index) becomes 409, every other DB failure becomes 500. Keeping the
    // mapping uniform across the codebase avoids drift between handlers.
    db::insert_refresh_token(
        tx.as_mut(),
        user_id,
        family_id,
        token.hash.as_slice(),
        token.expires_at,
    )
    .await?;

    tx.commit().await?;

    Ok(IssuedRefreshToken {
        plaintext: token.plaintext,
        family_id,
    })
}

// `POST /api/v1/auth/refresh`
//
/// Rotates the refresh token and issues a fresh access token.
///
/// 1. Reads the `refresh_token` cookie; absence is 401 `missing_refresh_token`.
/// 2. Hashes the presented plaintext and looks up the predecessor row under
///    a `SELECT ... FOR UPDATE` lock so concurrent rotations serialize.
/// 3. On reuse-detection (predecessor already revoked) the entire family is
///    revoked and 401 `invalid_refresh_token` is returned.
/// 4. On success the predecessor is marked revoked, a successor row sharing
///    the same `family_id` is inserted, and a new access JWT plus rotated
///    refresh cookie are returned via `Set-Cookie`. The body is empty.
///
/// # Arguments
///
/// * `state` - Application state (DB pool, JWT secret, cookie config).
/// * `jar` - Incoming `CookieJar`; only `refresh_token` is consulted.
///
/// # Returns
///
/// `(CookieJar, StatusCode::NO_CONTENT)` - jar carries the rotated
/// `access_token` (Path=/, Max-Age=15m) and `refresh_token`
/// (Path=/api/v1/auth, Max-Age=14d) cookies.
///
/// # Errors
///
/// Returns:
/// - `ApiError::Unauthorized` when the refresh cookie is missing, expired,
///   unknown, or already revoked (reuse).
/// - `ApiError::Internal` for DB failures or timestamp arithmetic overflow.
#[utoipa::path(
    post,
    path = "/refresh",
    tag = "Auth",
    responses(
        (status = 204, description = "Refresh successful; tokens rotated via Set-Cookie"),
        (status = 401, description = "Refresh token missing, expired, or revoked"),
        (status = 500, description = "Internal server error"),
    )
)]
#[inline]
pub async fn rotate(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
) -> ApiResult<(CookieJar, StatusCode)> {
    let Some(cookie) = jar.get(REFRESH_TOKEN_COOKIE) else {
        tracing::warn!(
            event = "refresh_failed",
            reason = "missing_refresh_token",
            "Refresh cookie missing"
        );
        return Err(ApiError::Unauthorized("missing_refresh_token".to_owned()));
    };
    let presented_hash = Sha256::digest(cookie.value().as_bytes());

    // Generate the successor up front so its UUID can flow into the single
    // transaction that revokes the predecessor and inserts the successor;
    // doing it inside the SQL with `RETURNING id` would force a second
    // round-trip for the `replaced_by` back-pointer.
    let new_token = generate_refresh_token()?;
    let new_token_id = Uuid::new_v4();

    let outcome = db::rotate_refresh_token(
        &state.db,
        presented_hash.as_slice(),
        new_token_id,
        new_token.hash.as_slice(),
        new_token.expires_at,
    )
    .await?;

    let rotated = match outcome {
        RefreshOutcome::Rotated(rotated) => rotated,
        RefreshOutcome::Reused { user_id, family_id } => {
            tracing::warn!(
                event = "refresh_failed",
                reason = "reuse_detected",
                user_id = %user_id,
                family_id = %family_id,
                "Refresh token reuse detected; family revoked"
            );
            return Err(ApiError::Unauthorized("invalid_refresh_token".to_owned()));
        }
        RefreshOutcome::Expired => {
            tracing::warn!(
                event = "refresh_failed",
                reason = "expired",
                "Refresh token expired"
            );
            return Err(ApiError::Unauthorized("invalid_refresh_token".to_owned()));
        }
        RefreshOutcome::NotFound => {
            tracing::warn!(
                event = "refresh_failed",
                reason = "not_found",
                "Refresh token not recognized"
            );
            return Err(ApiError::Unauthorized("invalid_refresh_token".to_owned()));
        }
    };

    let encoded = jwt::encode_access_token(
        rotated.user_id,
        rotated.role,
        rotated.verification_level,
        &state.config.jwt_secret,
    )?;

    let jar = cookies::build_session_cookies(
        encoded.token,
        new_token.plaintext,
        state.config.cookie_secure,
    );

    tracing::info!(
        event = "refresh_rotated",
        user_id = %rotated.user_id,
        family_id = %rotated.family_id,
        "Refresh token rotated"
    );

    Ok((jar, StatusCode::NO_CONTENT))
}
