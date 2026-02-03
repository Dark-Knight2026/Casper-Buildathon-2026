//! Models for health check responses.

use serde::Serialize;

/// Represents the status of a connection to an external service (Redis, Database, etc.).
#[derive(Debug, Serialize, PartialEq)]
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
