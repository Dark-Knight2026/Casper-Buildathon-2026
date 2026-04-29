//! Logout handler: clears auth cookies, blocklists the access token's `jti`
//! so a stolen access cookie cannot be replayed within its 15-minute lifetime,
//! and revokes the refresh-token family bound to the presented refresh cookie.
//!
//! Idempotency is a hard requirement: a client may call `/auth/logout` after
//! already losing one of the cookies (closed tab, clear-storage button, partial
//! token expiry), and the response must still be `204 No Content` with both
//! cookies stamped `Max-Age=0`. Every internal failure (Redis unreachable,
//! DB transient error, malformed JWT) is logged and swallowed so the
//! user-facing logout always succeeds - the alternative would let a transient
//! infrastructure issue trap a session in a half-logged-in state.

use std::sync::Arc;

use axum::{extract::State, http::StatusCode};
use axum_extra::extract::CookieJar;
use chrono::Utc;
use sha2::{Digest, Sha256};

use crate::{
    common::{ApiResult, AppState},
    services::auth::{
        cookies::{self, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE},
        db, jwt,
    },
};

// `POST /api/v1/auth/logout`
//
/// Logs the user out: blocklists the access JWT (until its natural expiry),
/// revokes the refresh-token family, and instructs the browser to drop both
/// auth cookies.
///
/// 1. Reads the `access_token` cookie. If it decodes to a valid JWT, its
///    `jti` is added to the Redis blocklist with TTL = `exp - now` so the
///    same access cookie cannot be replayed for the rest of its 15-minute
///    window.
/// 2. Reads the `refresh_token` cookie. If present, hashes the value and
///    revokes every active row in its family - locking out concurrent
///    sessions sharing the same login.
/// 3. Returns `204 No Content` with two `Set-Cookie` headers (`Max-Age=0`)
///    that match the issuance attributes byte-for-byte; otherwise the
///    browser would not match them for deletion.
///
/// The handler is idempotent and side-effect-tolerant: any of the three
/// steps may be skipped (cookie absent, JWT undecodable, hash unknown) and
/// the response is still `204`.
///
/// # Arguments
///
/// * `state` - Application state (DB pool, Redis store, cookie config).
/// * `jar` - Incoming `CookieJar`; both `access_token` and `refresh_token`
///   are consulted, but neither is required.
///
/// # Returns
///
/// `(CookieJar, StatusCode::NO_CONTENT)` - jar carries cleared
/// `access_token` (Path=/, Max-Age=0) and `refresh_token`
/// (Path=/api/v1/auth, Max-Age=0) cookies.
///
/// # Errors
///
/// Never returns an error in normal operation - infrastructure failures
/// (Redis outage, DB transient error) are logged and treated as a
/// successful logout. The `ApiResult` return type is preserved for API
/// surface consistency with the rest of the auth module.
#[utoipa::path(
    post,
    path = "/logout",
    tag = "Auth",
    responses(
        (status = 204, description = "Logout successful; cookies cleared"),
    )
)]
#[inline]
pub async fn logout(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
) -> ApiResult<(CookieJar, StatusCode)> {
    // Best-effort access-token blocklist. We deliberately decode without
    // propagating errors: an expired or otherwise-invalid access cookie at
    // logout time is normal (e.g. user clicks "logout" 20 minutes after
    // their last activity), so we silently skip the blocklist step in that
    // case and still clear the cookie below.
    if let Some(access_cookie) = jar.get(ACCESS_TOKEN_COOKIE)
        && let Ok(claims) = jwt::decode_token(access_cookie.value(), &state.config.jwt_secret)
    {
        // TTL is anchored to the JWT's own `exp` so the blocklist key
        // evicts at the moment the token would have stopped being
        // accepted anyway - no chance of either over-retaining (Redis
        // bloat) or under-retaining (replay window).
        let now_secs = Utc::now().timestamp();
        let exp_secs = i64::try_from(claims.exp).unwrap_or(0);
        let remaining = (exp_secs - now_secs).max(0);
        let ttl = u64::try_from(remaining).unwrap_or(0);
        if let Err(err) = state.redis.blocklist_jwt(claims.jti, ttl).await {
            // Fail-open: a Redis hiccup must not turn logout into 500.
            // The cookie is still cleared, and the access token will
            // expire on its own within 15 minutes.
            tracing::warn!(
                error = %err,
                jti = %claims.jti,
                "Failed to blocklist access-token jti on logout"
            );
        }
    }

    // Refresh-family revoke is also best-effort: an unknown hash matches
    // zero rows (not an error), and a transient DB hiccup should not
    // block the logout response. Same fail-open rationale as above.
    if let Some(refresh_cookie) = jar.get(REFRESH_TOKEN_COOKIE) {
        let presented_hash = Sha256::digest(refresh_cookie.value().as_bytes());
        if let Err(err) =
            db::revoke_refresh_family_by_hash(&state.db, presented_hash.as_slice()).await
        {
            tracing::warn!(
                error = ?err,
                "Failed to revoke refresh-token family on logout"
            );
        }
    }

    let clear_access = cookies::build_expired_access_cookie(state.config.cookie_secure);
    let clear_refresh = cookies::build_expired_refresh_cookie(state.config.cookie_secure);

    tracing::info!(event = "user_logout", "User logged out");

    Ok((
        CookieJar::new().add(clear_access).add(clear_refresh),
        StatusCode::NO_CONTENT,
    ))
}
