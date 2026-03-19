//! Staking endpoints.

/// Database queries for staking data.
pub mod db;
/// HTTP request handlers for staking endpoints.
pub mod handlers;
/// Request and response models.
pub mod models;
/// Router configuration for staking endpoints.
pub mod routes;

pub use routes::router;
