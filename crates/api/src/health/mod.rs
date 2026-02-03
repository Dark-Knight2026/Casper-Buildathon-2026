//! Health check feature module.
//!
//! Provides health check endpoints for monitoring service status.

/// Database operations for health checks.
pub mod db;
/// HTTP request handlers for health checks.
pub mod handlers;
/// Models for health check responses.
pub mod models;
/// Router configuration for health endpoints.
pub mod routes;

pub use handlers::health_check;
pub use models::ConnectionStatus;
pub use routes::router;
