//! Vesting schedule endpoints.

/// Database queries for vesting data.
pub mod db;
/// HTTP request handlers for vesting endpoints.
pub mod handlers;
/// Request and response models.
pub mod models;
/// Router configuration for vesting endpoints.
pub mod routes;

pub use routes::router;
