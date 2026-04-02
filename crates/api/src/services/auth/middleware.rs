//! Authentication middleware and error types.

use std::sync::Arc;

use axum::{
    Json,
    body::Body,
    extract::{FromRequestParts, State},
    http::{Request, StatusCode, request::Parts},
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use secrecy::ExposeSecret;
use serde_json::json;
use thiserror::Error;

use crate::common::{AppState, Claims, JWT_AUDIENCE, JWT_ISSUER};

/// Authenticated user extracted from JWT token.
#[derive(Debug)]
pub struct AuthUser(pub Claims);

impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = AuthError;

    #[inline]
    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|value| value.to_str().ok())
            .ok_or(AuthError::MissingCredentials)?;

        let Some(token) = auth_header.strip_prefix("Bearer ") else {
            return Err(AuthError::MissingCredentials);
        };
        let secret = state.config.jwt_secret.expose_secret();
        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_issuer(&[JWT_ISSUER]);
        validation.set_audience(&[JWT_AUDIENCE]);
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &validation,
        )?;

        Ok(AuthUser(token_data.claims))
    }
}

/// Router-level auth middleware that rejects unauthenticated requests before
/// they reach any handler. Reuses [`AuthUser`] validation logic so the JWT
/// rules stay in one place.
///
/// # Errors
///
/// Returns [`AuthError::MissingCredentials`] when the `Authorization` header is
/// absent or malformed, and [`AuthError::InvalidToken`] when JWT decoding or
/// validation fails.
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
    /// Authorization header is missing or malformed.
    #[error("Missing credentials")]
    MissingCredentials,
    /// JWT token is invalid or expired.
    #[error("Invalid token: {0}")]
    InvalidToken(#[from] jsonwebtoken::errors::Error),
}

impl IntoResponse for AuthError {
    #[inline]
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AuthError::MissingCredentials => (StatusCode::UNAUTHORIZED, "Missing credentials"),
            AuthError::InvalidToken(err) => {
                tracing::warn!(error = %err, "JWT validation failed");
                (StatusCode::UNAUTHORIZED, "Invalid token")
            }
        };
        let body = Json(json!({
            "error": error_message,
        }));
        (status, body).into_response()
    }
}
