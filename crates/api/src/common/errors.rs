//! Application-level error types.

use std::env::VarError;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{common::EmailError, services::auth::AuthError};

/// Represents errors that can occur at the application level (e.g., startup).
/// These are not intended to be converted into API responses but are for logging
/// and terminating the application gracefully.
#[derive(Debug, thiserror::Error)]
pub enum ServerError {
    /// An I/O error occurred (e.g., binding to a socket).
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    /// A database connection or query error occurred during startup.
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    /// A database migration error.
    #[error("Migration failed: {0}")]
    Migration(#[from] sqlx::migrate::MigrateError),
    /// An authentication-related error occurred, typically during setup.
    #[error("Authentication setup error: {0}")]
    Auth(#[from] AuthError),
    /// A required environment variable was missing or invalid.
    #[error("Environment variable error: {0}")]
    EnvVar(String),
    /// Queue/Redis related error.
    #[error("Queue error: {0}")]
    Queue(String),
}

impl From<VarError> for ServerError {
    #[inline]
    fn from(err: VarError) -> Self {
        Self::EnvVar(err.to_string())
    }
}

/// The primary error type for API handlers.
///
/// This enum consolidates all possible errors that can occur within the API
/// layer, providing a consistent way to convert them into HTTP responses.
/// Sensitive information is never exposed to the client.
#[derive(Debug)]
pub enum ApiError {
    /// Wraps authentication-related errors.
    Auth(AuthError),
    /// Returned when the client provides invalid data.
    BadRequest(String),
    /// Returned when authentication is required but not provided.
    Unauthorized(String),
    /// Returned when a user does not have sufficient permissions.
    Forbidden(String),
    /// Returned when a resource cannot be found.
    NotFound(String),
    /// Returned when creating a resource that already exists.
    Conflict(String),
    /// Returned when the client has sent too many requests.
    TooManyRequests(String),
    /// Wraps a `sqlx::Error`. These errors are not exposed to the client
    /// for security reasons, and will result in a generic 500 error.
    Database(sqlx::Error),
    /// Queue/Redis related error.
    Queue(String),
    /// Generic internal server error.
    Internal(String),
}

/// A generic error response for API endpoints.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ErrorResponse {
    /// A description of the error.
    #[schema(example = "A meaningful error message.")]
    pub error: String,
}

impl IntoResponse for ApiError {
    #[inline]
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            ApiError::Auth(err) => {
                let (status, code) = err.status_and_code();
                (status, code.to_owned())
            }
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            ApiError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            ApiError::Forbidden(msg) => (StatusCode::FORBIDDEN, msg.clone()),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            ApiError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            ApiError::TooManyRequests(msg) => (StatusCode::TOO_MANY_REQUESTS, msg.clone()),
            ApiError::Queue(msg) => {
                tracing::error!("Queue error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal system error".to_owned(),
                )
            }
            ApiError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred".to_owned(),
                )
            }
            ApiError::Database(err) => {
                tracing::error!("Database error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred".to_owned(),
                )
            }
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });
        (status, body).into_response()
    }
}

/// A convenience type alias for `Result` returned from API handlers.
pub type ApiResult<T> = Result<T, ApiError>;

impl From<AuthError> for ApiError {
    #[inline]
    fn from(err: AuthError) -> Self {
        ApiError::Auth(err)
    }
}

impl From<sqlx::Error> for ApiError {
    #[inline]
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => ApiError::NotFound("Resource not found".to_owned()),
            sqlx::Error::Database(ref db_err) if db_err.is_unique_violation() => {
                ApiError::Conflict("A resource with this value already exists".to_owned())
            }
            _ => ApiError::Database(err),
        }
    }
}

impl From<EmailError> for ApiError {
    /// Maps email-transport failures to a generic 500.
    ///
    /// The provider-side message goes into [`ApiError::Internal`], which
    /// `IntoResponse` logs but does NOT echo into the response body - the
    /// client gets a flat "internal server error" so SMTP hostnames,
    /// rate-limit hints, or quota details cannot leak. A future variant
    /// `ApiError::Email(EmailError)` is justified only when handlers need
    /// differentiated responses (e.g. 503 + `Retry-After` for provider
    /// rate-limits); until then this stringly-typed wrap is enough.
    #[inline]
    fn from(err: EmailError) -> Self {
        Self::Internal(err.to_string())
    }
}
