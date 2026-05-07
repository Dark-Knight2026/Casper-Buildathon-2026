//! Authentication middleware and error types.
//!
//! Access-token transport: `access_token` cookie (HttpOnly; Secure; SameSite=Strict).
//! The previous `Authorization: Bearer` flow has been removed - the frontend
//! reads the token from a cookie set at login time.
//!
//! # Per-request cost of the force-revoke check
//!
//! Every protected request now issues `SELECT jwt_invalidate_before FROM
//! users WHERE id = $1 AND deleted_at IS NULL` against the primary
//! database in addition to the existing Redis blocklist lookup. The auth
//! hot path therefore touches both Postgres and Redis on every call -
//! deliberate trade-off, captured here so a future profiler-driven
//! refactor knows what was considered:
//!
//! - **Why a DB read at all?** The cutoff has to be enforced
//!   server-side: a JWT remains cryptographically valid until its 15-
//!   minute `exp`, but role changes, panic-logout, and self-deletion
//!   need to invalidate every outstanding token *immediately*. Stamping
//!   `users.jwt_invalidate_before = NOW()` and rejecting any token with
//!   `claims.iat <= cutoff` on the next request is the cheapest
//!   correctness primitive available to us.
//!
//! - **Why fail-closed on DB error?** If the lookup fails, we cannot
//!   tell whether the token has been force-revoked. Failing open would
//!   let an attacker who can disrupt our DB for a few seconds bypass
//!   force-revoke entirely; failing closed costs availability under a
//!   DB outage but never silently admits an invalidated token. Redis
//!   errors on the blocklist check, by contrast, are fail-open: the
//!   15-minute access-token TTL caps the worst-case replay window even
//!   if the blocklist temporarily disappears.
//!
//! - **Why not cache the cutoff in Redis?** A short-TTL key
//!   `force_revoke:<user_id>` (TTL <= the 15-minute access-token TTL)
//!   would collapse the steady-state cost to "Redis only" in the
//!   common case where no force-revoke event has fired. We accept the
//!   per-request DB read for now because:
//!   1. The cache adds an invalidation contract: every flow that
//!      stamps `jwt_invalidate_before` (`POST /auth/sessions/revoke-all`
//!      with `keep_current = false`, `PATCH /users/me/role`,
//!      `DELETE /users/me`) would need to also `DEL` the cache key
//!      under the same transaction, and a missed hook leaves a
//!      revoked token live for up to one TTL. Three hooks today, more
//!      whenever a new force-revoke trigger lands.
//!   2. The fail-closed semantics interact subtly with the cache: a
//!      Redis miss can mean "no cutoff exists" or "cache expired";
//!      distinguishing requires a DB fallback, which puts us back to
//!      the steady-state behavior we have now under the steady-state
//!      load that matters (the cold-cache path).
//!   3. Postgres handles a single-row primary-key SELECT cheaply, and
//!      the protected-route surface is bounded by JWT validity (15 min)
//!      so the QPS upper bound is predictable.
//!
//!   When the system has measured evidence that this lookup is the hot
//!   spot worth optimizing - sustained P99 dominated by the auth path,
//!   or a Postgres connection-pool ceiling - the cache is the
//!   recommended next step. Wire the invalidation hooks first, then
//!   add the cache; the fail-closed read becomes the slow path that
//!   only fires when the cache misses.

use std::sync::Arc;

use axum::{
    Json,
    body::Body,
    extract::{FromRequestParts, State},
    http::{Request, StatusCode, request::Parts},
    middleware::Next,
    response::{IntoResponse, Response},
};
use axum_extra::extract::CookieJar;
use thiserror::Error;

use crate::{
    common::{AppState, Claims, ErrorResponse, TokenType},
    services::auth::{cookies::ACCESS_TOKEN_COOKIE, db, jwt},
};

/// Authenticated user extracted from the `access_token` JWT cookie.
#[derive(Debug)]
pub struct AuthUser(pub Claims);

impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = AuthError;

    #[inline]
    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);
        let token = jar
            .get(ACCESS_TOKEN_COOKIE)
            .ok_or(AuthError::MissingAccessToken)?
            .value()
            .to_owned();

        let claims = jwt::decode_token(&token, &state.config.jwt_secret)?;

        // A refresh token must never authorize a protected request even if it
        // accidentally lands in the access cookie. Legacy tokens (issued before
        // typed claims rolled out) have `token_type = None` and are accepted
        // until they expire naturally.
        if matches!(claims.token_type, Some(TokenType::Refresh)) {
            return Err(AuthError::WrongTokenType);
        }

        // Force-revoke check. `users.jwt_invalidate_before` is set by flows
        // that need to kill outstanding access tokens before their natural
        // `exp` (role change, revoke-all-sessions, self-delete). DB errors
        // here surface as `AuthError::Database` -> 500 (fail-closed): the
        // alternative would let an attacker who can disrupt our DB for a
        // few seconds bypass force-revoke entirely. Legacy tokens issued
        // before the `iat` claim was added decode with `iat = 0`, which is
        // `<= NOW()` for any non-NULL cutoff, so they are correctly killed
        // by the same code path.
        let cutoff = db::fetch_jwt_invalidate_before(&state.db, claims.sub).await?;
        if let Some(cutoff_at) = cutoff {
            let cutoff_ts = usize::try_from(cutoff_at.timestamp().max(0)).unwrap_or(usize::MAX);
            if claims.iat <= cutoff_ts {
                return Err(AuthError::TokenInvalidated);
            }
        }

        // Logout-blocklist check. Redis errors are fail-open (warn + allow):
        // a partial Redis outage must not take down the entire protected
        // surface, and the access-token TTL of 15 minutes already caps the
        // worst-case replay window.
        match state.redis.is_jwt_blocklisted(claims.jti).await {
            Ok(true) => return Err(AuthError::TokenRevoked),
            Ok(false) => {}
            Err(err) => {
                tracing::warn!(
                    error = %err,
                    jti = %claims.jti,
                    "Blocklist check failed; allowing request (fail-open)"
                );
            }
        }

        Ok(AuthUser(claims))
    }
}

/// Router-level auth middleware that rejects unauthenticated requests before
/// they reach any handler. Reuses [`AuthUser`] validation logic so the JWT
/// rules stay in one place.
///
/// # Errors
///
/// Returns [`AuthError::MissingAccessToken`] when the `access_token` cookie is
/// absent, [`AuthError::InvalidToken`] when JWT decoding or validation fails,
/// [`AuthError::WrongTokenType`] when a refresh token is presented as an
/// access token, and [`AuthError::TokenRevoked`] when the token's `jti` is on
/// the logout blocklist.
#[inline]
pub async fn require_auth(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, AuthError> {
    let (mut parts, body) = request.into_parts();
    let _user = AuthUser::from_request_parts(&mut parts, &state).await?;
    Ok(next.run(Request::from_parts(parts, body)).await)
}

/// Authentication errors.
#[derive(Debug, Error)]
pub enum AuthError {
    /// `access_token` cookie is missing from the request.
    #[error("Missing access token")]
    MissingAccessToken,
    /// JWT token failed signature, issuer, audience, or expiration validation.
    #[error("Invalid token: {0}")]
    InvalidToken(#[from] jsonwebtoken::errors::Error),
    /// A token of the wrong type was presented (e.g., refresh used as access).
    #[error("Wrong token type")]
    WrongTokenType,
    /// The token's `jti` is on the logout blocklist.
    #[error("Token revoked")]
    TokenRevoked,
    /// The token's `iat` is at or below `users.jwt_invalidate_before`,
    /// meaning a force-revoke flow (role change, revoke-all-sessions,
    /// self-delete) ran since this token was issued.
    #[error("Token invalidated by force-revoke")]
    TokenInvalidated,
    /// Database lookup of `jwt_invalidate_before` failed. Fail-closed:
    /// without this read we cannot tell whether the token has been
    /// force-revoked, so we refuse the request rather than risk admitting
    /// an invalidated token.
    #[error("Auth DB error: {0}")]
    Database(#[from] sqlx::Error),
}

impl AuthError {
    /// Maps the error to its HTTP status and stable client-facing error code.
    ///
    /// Logging of suspicious cases lives here so every conversion path
    /// (direct extractor rejection and `ApiError::Auth` wrapping) emits
    /// the same telemetry without duplication.
    ///
    /// All token-rejection variants collapse to the same `invalid_token`
    /// client-code on purpose - exposing whether a token was malformed,
    /// of the wrong type, or specifically revoked would leak attacker-
    /// useful state. The variant-specific log line keeps that distinction
    /// available to operators without exposing it to clients.
    #[inline]
    pub(crate) fn status_and_code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::MissingAccessToken => (StatusCode::UNAUTHORIZED, "missing_access_token"),
            Self::InvalidToken(err) => {
                tracing::warn!(error = %err, "JWT validation failed");
                (StatusCode::UNAUTHORIZED, "invalid_token")
            }
            Self::WrongTokenType => {
                tracing::warn!("Refresh token presented as access token");
                (StatusCode::UNAUTHORIZED, "invalid_token")
            }
            Self::TokenRevoked => {
                tracing::warn!("Blocklisted access token presented");
                (StatusCode::UNAUTHORIZED, "invalid_token")
            }
            Self::TokenInvalidated => {
                tracing::warn!(
                    "Force-revoked access token presented (iat <= jwt_invalidate_before)"
                );
                (StatusCode::UNAUTHORIZED, "invalid_token")
            }
            Self::Database(err) => {
                tracing::error!(error = %err, "Auth DB lookup failed; failing closed");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal_error")
            }
        }
    }
}

impl IntoResponse for AuthError {
    #[inline]
    fn into_response(self) -> Response {
        let (status, code) = self.status_and_code();
        (
            status,
            Json(ErrorResponse {
                error: code.to_owned(),
            }),
        )
            .into_response()
    }
}
