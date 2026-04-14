//! ICO (Initial Coin Offering) endpoints.

/// Database queries for ICO data.
pub mod db;
/// HTTP request handlers for ICO endpoints.
pub mod handlers;
/// Request and response models.
pub mod models;
/// Router configuration for ICO endpoints.
pub mod routes;

pub use routes::router;
