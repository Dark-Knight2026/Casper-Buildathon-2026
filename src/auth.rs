use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde_json::json;
use std::env;
use crate::models::Claims;

pub struct AuthUser(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|value| value.to_str().ok())
            .ok_or(AuthError::MissingCredentials)?;

        if !auth_header.starts_with("Bearer ") {
            return Err(AuthError::MissingCredentials);
        }

        let token = &auth_header[7..];
        let secret = env::var("SUPABASE_JWT_SECRET").map_err(|_| AuthError::ServerConfiguration)?;
        
        // Supabase JWTs usually don't require audience validation by default unless configured
        let mut validation = Validation::default();
        validation.validate_exp = true;
        validation.insecure_disable_signature_validation(); // TODO: Remove this in production and use proper secret handling if needed, but usually we validate signature.
        // Re-enabling signature validation
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

#[derive(Debug)]
pub enum AuthError {
    MissingCredentials,
    InvalidToken,
    ServerConfiguration,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AuthError::MissingCredentials => (StatusCode::UNAUTHORIZED, "Missing credentials"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid token"),
            AuthError::ServerConfiguration => (StatusCode::INTERNAL_SERVER_ERROR, "Server configuration error"),
        };
        let body = Json(json!({
            "error": error_message,
        }));
        (status, body).into_response()
    }
}