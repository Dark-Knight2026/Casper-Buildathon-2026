//! Authentication middleware and error types.
//!
//! Access-token transport: `access_token` cookie (HttpOnly; Secure; SameSite=Strict).
//! The previous `Authorization: Bearer` flow has been removed - the frontend
//! reads the token from a cookie set at login time.

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
    services::auth::{cookies::ACCESS_TOKEN_COOKIE, jwt},
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

        // Logout-blocklist check. A `jti` is only present on tokens minted
        // after Phase 2.1 - legacy tokens (`jti = None`) skip the check and
        // continue to expire naturally. Redis errors are fail-open (warn +
        // allow): a partial Redis outage must not take down the entire
        // protected surface, and the access-token TTL of 15 minutes already
        // caps the worst-case replay window.
        if let Some(jti) = claims.jti {
            match state.redis.is_jwt_blocklisted(jti).await {
                Ok(true) => return Err(AuthError::TokenRevoked),
                Ok(false) => {}
                Err(err) => {
                    tracing::warn!(
                        error = %err,
                        jti = %jti,
                        "Blocklist check failed; allowing request (fail-open)"
                    );
                }
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
