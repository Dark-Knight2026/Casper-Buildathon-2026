//! Models for health check responses.

use axum::http::StatusCode;
use serde::{Serialize, Serializer};
use utoipa::ToSchema;

/// Represents the status of a connection to an external service (Redis, Database, etc.).
#[derive(Debug, Serialize, PartialEq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionStatus {
    /// Service is reachable and responding correctly.
    Connected,
    /// Service is unreachable or connection failed.
    Disconnected,
    /// An error occurred while checking the service status.
    Error,
    /// The service returned a response that was not expected.
    UnknownResponse,
}

/// Health check response containing service statuses.
#[derive(Debug, Serialize, ToSchema)]
pub struct HealthResponse {
    /// HTTP status code (200 for healthy, 503 for unhealthy).
    #[schema(value_type = u16, example = 200)]
    #[serde(serialize_with = "serialize_status_code")]
    pub status: StatusCode,
    /// Service name.
    pub service: String,
    /// Redis connection status.
    pub redis: ConnectionStatus,
    /// Database connection status.
    pub database: ConnectionStatus,
}

/// Serializes `StatusCode` as its numeric `u16` representation.
#[inline]
#[allow(clippy::trivially_copy_pass_by_ref)]
fn serialize_status_code<S>(status: &StatusCode, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_u16(status.as_u16())
}
