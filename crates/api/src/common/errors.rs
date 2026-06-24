//! Application-level error types.

use std::env::VarError;

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use redis::RedisError;
use serde::{Deserialize, Serialize};
use sqlx::{Error, migrate::MigrateError};
use thiserror::Error;
use utoipa::ToSchema;

use crate::{
    providers::{EmailError, StorageError},
    services::auth::AuthError,
};

/// Represents errors that can occur at the application level (e.g., startup).
/// These are not intended to be converted into API responses but are for logging
/// and terminating the application gracefully.
#[derive(Debug, Error)]
pub enum ServerError {
    /// An I/O error occurred (e.g., binding to a socket).
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    /// A database connection or query error occurred during startup.
    #[error("Database error: {0}")]
    Database(#[from] Error),
    /// A database migration error.
    #[error("Migration failed: {0}")]
    Migration(#[from] MigrateError),
    /// An authentication-related error occurred, typically during setup.
    #[error("Authentication setup error: {0}")]
    Auth(#[from] AuthError),
    /// A required environment variable was missing or invalid.
    #[error("Environment variable error: {0}")]
    EnvVar(String),
    /// Queue/Redis related error.
    #[error("Queue error: {0}")]
    Queue(String),
    /// Media-storage initialization or transport error during startup.
    #[error("Storage error: {0}")]
    Storage(#[from] StorageError),
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
    Database(Error),
    /// Queue/Redis related error.
    Queue(String),
    /// 413 (not 400) so clients can route oversize bodies to a distinct UX path.
    ///
    /// Used when the request body exceeds the per-endpoint cap. A 6 MB
    /// avatar triggers "clear picker / compress" UX, not the generic
    /// 400 funnel that other validation failures share.
    PayloadTooLarge(String),
    /// Folds disallowed-MIME and MIME-spoofing into one 415 so clients show one message.
    ///
    /// Used when the request MIME is not on the per-endpoint whitelist,
    /// or when the bytes do not match the declared type.
    UnsupportedMediaType(String),
    /// Returned when the body parsed fine but a semantic precondition is unmet (422).
    ///
    /// Distinct from 400 (malformed input) and 409 (conflict with existing
    /// state): the request is well-formed, but the operation cannot proceed -
    /// e.g. a role that maps to no on-chain flag attempting registration.
    UnprocessableEntity(String),
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
            ApiError::Database(err) => {
                tracing::error!("Database error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "An internal server error occurred".to_owned(),
                )
            }
            ApiError::Queue(msg) => {
                tracing::error!("Queue error: {}", msg);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal system error".to_owned(),
                )
            }
            ApiError::PayloadTooLarge(msg) => (StatusCode::PAYLOAD_TOO_LARGE, msg.clone()),
            ApiError::UnsupportedMediaType(msg) => {
                (StatusCode::UNSUPPORTED_MEDIA_TYPE, msg.clone())
            }
            ApiError::UnprocessableEntity(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            ApiError::Internal(msg) => {
                tracing::error!("Internal error: {}", msg);
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

impl From<Error> for ApiError {
    #[inline]
    fn from(err: Error) -> Self {
        match err {
            Error::RowNotFound => ApiError::NotFound("Resource not found".to_owned()),
            Error::Database(ref db_err) if db_err.is_unique_violation() => {
                ApiError::Conflict("A resource with this value already exists".to_owned())
            }
            _ => ApiError::Database(err),
        }
    }
}

impl From<EmailError> for ApiError {
    /// Default fallback: both variants collapse to 500.
    ///
    /// Handlers that need retry-queue routing or 422 surfacing must
    /// `match` before `?`. Exhaustive on purpose: a new variant must
    /// opt into its HTTP shape.
    #[inline]
    fn from(err: EmailError) -> Self {
        match err {
            EmailError::Transient(_) | EmailError::Permanent(_) => Self::Internal(err.to_string()),
        }
    }
}

impl From<RedisError> for ApiError {
    /// Fail-stop default for `?`-cascade callers that cannot recover inline.
    ///
    /// Sites with recovery semantics (auth fail-open, wallet
    /// log-ignore) handle Redis errors directly. Email-change handlers
    /// need 500 - no Redis means no rate-limit and no token storage.
    /// `Queue` already logs server-side and emits a flat body, so no
    /// transport details leak.
    #[inline]
    fn from(err: RedisError) -> Self {
        Self::Queue(err.to_string())
    }
}
