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
use chrono::{DateTime, Utc};
use serde::Serialize;
use sha2::{Digest, Sha256};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState},
    services::auth::{AuthUser, cookies::REFRESH_TOKEN_COOKIE, db},
};

/// One row of the response from `GET /api/v1/auth/sessions`.
///
/// `family_id` is intentionally NOT exposed: rotations within a family
/// are an implementation detail of the refresh flow, and surfacing the
/// id would tempt clients to build their own rotation UI on top of it.
/// `token_hash` is also not exposed - the handler computes `is_current`
/// against the request cookie and discards the hash before serializing.
#[derive(Debug, Serialize, ToSchema)]
pub struct SessionResponse {
    /// Stable identifier for the session row. Pass back to
    /// `DELETE /api/v1/auth/sessions/{id}` to terminate this session.
    pub id: Uuid,
    /// Wall-clock timestamp the session was issued (login time, or the
    /// time of the last refresh-rotation that produced this row).
    pub issued_at: DateTime<Utc>,
    /// Absolute expiration timestamp; rows whose `expires_at` is past
    /// `NOW()` are filtered out at the db layer, so this value is
    /// always strictly in the future at response time.
    pub expires_at: DateTime<Utc>,
    /// `true` if the row's `token_hash` matches `sha256(request_cookie)`,
    /// i.e. the session that issued the access cookie used to load this
    /// list. Clients use it to render a "this device" pill and to gate
    /// the "log out other sessions" button without picking the row that
    /// would log the current user out.
    pub is_current: bool,
}

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
