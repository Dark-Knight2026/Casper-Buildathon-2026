//! Session-management handlers exposed under `/api/v1/auth/sessions`.
//!
//! Lives in the auth module (not `users`) for two reasons that come up
//! together: (a) the underlying state IS the `refresh_tokens` table, which
//! every other consumer in this codebase reaches through `auth::db`; and
//! (b) the routes need to read the `refresh_token` cookie for the
//! `is_current` flag, and that cookie is scoped to `Path=/api/v1/auth`
//! (see `cookies::REFRESH_COOKIE_PATH`). Mounting under any other prefix
//! would silently drop the cookie and force `is_current = false` on every
//! row, which is worse than wrong - it is "wrong but plausible".

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use axum_extra::extract::CookieJar;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState},
    services::auth::{
        AuthUser,
        cookies::{self, REFRESH_TOKEN_COOKIE},
        db,
        models::{RevokeAllSessionsRequest, RevokeAllSessionsResponse, SessionResponse},
    },
};

// `GET /api/v1/auth/sessions`
//
/// Lists every currently-usable refresh-token row owned by the
/// authenticated user.
///
/// Filters at the db layer: `revoked_at IS NULL AND expires_at > NOW()`.
/// The handler then walks the result, computes
/// `sha256(request_cookie_value)` ONCE, and tags each row with
/// `is_current` by byte-equality against the row's stored `token_hash`.
/// The cookie is the plaintext, the row is the SHA-256 - so the
/// comparison only succeeds when the request was issued by the same
/// browser that holds the matching refresh cookie. A request without
/// a refresh cookie (e.g. a different domain or a manually-crafted
/// API call with only the access cookie) returns the list with
/// `is_current = false` everywhere, which is the correct fallback.
///
/// Authorization: `AuthUser` extractor performs the same validation
/// the protected router's `require_auth` middleware does (decode,
/// blocklist, `jwt_invalidate_before`). Because this handler lives on
/// the public-router auth nest (no router-level `require_auth`), the
/// extractor is the only thing standing between an anonymous request
/// and the result - keep it on every handler in this module.
///
/// # Errors
///
/// - 401 (`Unauthorized`) when the access cookie is missing or invalid
///   (enforced by the `AuthUser` extractor).
/// - 500 for DB transport failures.
#[utoipa::path(
    get,
    path = "/sessions",
    tag = "Auth",
    responses(
        (status = 200, description = "Active sessions for the authenticated user", body = Vec<SessionResponse>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_sessions(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    jar: CookieJar,
) -> ApiResult<Json<Vec<SessionResponse>>> {
    let user_id = auth_user.0.sub;

    // Compute the request's refresh-cookie hash exactly once. Absence is
    // not an error - `is_current` simply stays false for every row, which
    // is what the UI renders when it wants to flag the current device but
    // cannot identify it.
    let current_hash = jar
        .get(REFRESH_TOKEN_COOKIE)
        .map(|cookie| Sha256::digest(cookie.value().as_bytes()));

    let sessions = db::list_active_sessions(&state.db, user_id).await?;

    let response = sessions
        .into_iter()
        .map(|session| {
            let is_current = current_hash
                .as_ref()
                .is_some_and(|hash| hash.as_slice() == session.token_hash.as_slice());
            SessionResponse {
                id: session.id,
                issued_at: session.issued_at,
                expires_at: session.expires_at,
                is_current,
            }
        })
        .collect();

    Ok(Json(response))
}

// `DELETE /api/v1/auth/sessions/{id}`
//
/// Revokes one refresh-token row owned by the authenticated user.
///
/// Race-safety: the db function wraps the `UPDATE` in a transaction
/// that first takes `SELECT ... FOR UPDATE` on the row, so a concurrent
/// rotation of the same token (which itself holds `FOR UPDATE OF rt`
/// inside `rotate_refresh_token`) cannot slip past us. The owner gate
/// (`user_id` in the WHERE clause) means a forged `id` from a different
/// user simply does not match and surfaces as 404 - the response shape
/// is uniform across "id unknown" and "id belongs to someone else", so
/// no enumeration oracle is exposed.
///
/// Side-effects deliberately stop at the refresh-token row. We do NOT
/// stamp `users.jwt_invalidate_before` because that would also kill the
/// caller's CURRENT access token (and any other tabs sharing it) - and
/// killing one session must not log the entire user out. The access
/// token bound to the revoked refresh row will still work until its
/// natural 15-minute `exp`; that gap is acceptable because the access
/// token is bound to ONE device's local memory and the refresh leg has
/// already been cut.
///
/// Authorization: `AuthUser` extractor (see `get_sessions`).
///
/// # Errors
///
/// - 401 (`Unauthorized`) when the access cookie is missing or invalid.
/// - 404 (`NotFound`) when the session id is unknown, already revoked,
///   expired, or owned by a different user.
/// - 500 for DB transport failures.
#[utoipa::path(
    delete,
    path = "/sessions/{id}",
    tag = "Auth",
    params(
        ("id" = Uuid, Path, description = "Session id to revoke"),
    ),
    responses(
        (status = 204, description = "Session revoked"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Session not found or not owned by user"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn revoke_session(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(session_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    let user_id = auth_user.0.sub;
    let revoked = db::revoke_session_by_id(&state.db, user_id, session_id).await?;
    if !revoked {
        return Err(ApiError::NotFound("session not found".to_owned()));
    }
    Ok(StatusCode::NO_CONTENT)
}

// `POST /api/v1/auth/sessions/revoke-all`
//
/// Revokes every active refresh-token row for the authenticated user
/// and, optionally, kills every outstanding access token by stamping
/// `users.jwt_invalidate_before`.
///
/// Two operating modes selected by `request.keep_current`:
///
/// - **`keep_current = true`** (default - the "log out other devices"
///   button): the row whose `token_hash` matches `sha256(request_cookie)`
///   is preserved, and `jwt_invalidate_before` is NOT touched. The
///   caller's own session keeps working; every other refresh row is
///   stamped revoked. If the request arrived without a refresh cookie
///   (so the row to keep cannot be located), every row is revoked - we
///   do not silently no-op when the "keep" target is missing, because
///   the user already decided their other devices should go away.
/// - **`keep_current = false`** (the "panic logout" path): every refresh
///   row for the user is revoked AND `jwt_invalidate_before = NOW()` is
///   stamped, so the auth middleware kills every outstanding access
///   token (including the caller's own). The handler clears both auth
///   cookies in the response so the browser drops them on receipt.
///
/// All side effects run in one DB transaction (see
/// [`db::revoke_all_sessions_for_user`]) so an audit-log INSERT failure
/// cannot leave the user with revoked sessions but no audit trail.
///
/// Authorization: `AuthUser` extractor (same as the rest of this
/// module). The handler does not require recent-auth even though it is
/// destructive: a stolen-cookie attacker who has already signed the user
/// out everywhere has not gained anything (the user's data is unchanged),
/// while a legitimate user reacting to a "suspicious activity" alert
/// must be able to nuke their sessions without a re-login round-trip.
///
/// # Errors
///
/// - 400 (`BadRequest`) when the body is empty or malformed JSON.
/// - 401 (`Unauthorized`) when the access cookie is missing or invalid
///   (enforced by the `AuthUser` extractor).
/// - 500 for DB transport failures.
#[utoipa::path(
    post,
    path = "/sessions/revoke-all",
    tag = "Auth",
    request_body = RevokeAllSessionsRequest,
    responses(
        (status = 200, description = "Sessions revoked", body = RevokeAllSessionsResponse),
        (status = 400, description = "Malformed request body"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn revoke_all_sessions(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    jar: CookieJar,
    Json(payload): Json<RevokeAllSessionsRequest>,
) -> ApiResult<(CookieJar, Json<RevokeAllSessionsResponse>)> {
    let user_id = auth_user.0.sub;

    // The hash of the caller's refresh cookie identifies the row to
    // keep. In the `keep_current = false` branch the field is unused -
    // the db function gets `None` and revokes everything. In the
    // `keep_current = true` branch a missing cookie also yields `None`,
    // i.e. revoke everything; the cutoff bump is still skipped via
    // `keep_current` so the caller's access token survives even though
    // their refresh row did not.
    let keep_token_hash = if payload.keep_current {
        jar.get(REFRESH_TOKEN_COOKIE)
            .map(|cookie| Sha256::digest(cookie.value().as_bytes()))
    } else {
        None
    };

    let revoked = db::revoke_all_sessions_for_user(
        &state.db,
        user_id,
        keep_token_hash.as_deref(),
        payload.keep_current,
    )
    .await?;

    let response_jar = if payload.keep_current {
        // Caller stays signed in - leave their cookies intact. An empty
        // jar emits no Set-Cookie headers, so the browser keeps the
        // cookies it already has.
        CookieJar::new()
    } else {
        // Panic-logout: clear both cookies so the browser drops them on
        // receipt. The refresh row is already revoked, and the access
        // token will be rejected by the middleware on the next request
        // thanks to the `jwt_invalidate_before` bump.
        CookieJar::new()
            .add(cookies::build_expired_access_cookie(
                state.config.cookie_secure,
            ))
            .add(cookies::build_expired_refresh_cookie(
                state.config.cookie_secure,
            ))
    };

    Ok((response_jar, Json(RevokeAllSessionsResponse { revoked })))
}
