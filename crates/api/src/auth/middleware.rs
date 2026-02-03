//! Authentication middleware and error types.

use std::sync::Arc;

use axum::{
    Json,
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};
use error_tools::dependency::thiserror;
use jsonwebtoken::{DecodingKey, Validation, decode};
use secrecy::ExposeSecret;
use serde_json::json;

use crate::common::{AppState, Claims};

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

        if !auth_header.starts_with("Bearer ") {
            return Err(AuthError::MissingCredentials);
        }

        let token = &auth_header[7..];

        let secret = state.config.jwt_secret.expose_secret();

        let validation = Validation::new(jsonwebtoken::Algorithm::HS256);

        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &validation,
        )
        .map_err(|_| AuthError::InvalidToken)?;

        Ok(AuthUser(token_data.claims))
    }
}

/// Authentication errors.
#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    /// Authorization header is missing or malformed.
    #[error("Missing credentials")]
    MissingCredentials,
    /// JWT token is invalid or expired.
    #[error("Invalid token")]
    InvalidToken,
    /// Server configuration error (e.g., missing JWT secret).
    #[error("Server configuration error")]
    ServerConfiguration,
}

impl IntoResponse for AuthError {
    #[inline]
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AuthError::MissingCredentials => (StatusCode::UNAUTHORIZED, "Missing credentials"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token"),
            AuthError::ServerConfiguration => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Server configuration error",
            ),
        };
        let body = Json(json!({
            "error": error_message,
        }));
        (status, body).into_response()
    }
}
