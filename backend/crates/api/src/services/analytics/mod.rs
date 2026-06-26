//! Property analytics feature module.
//!
//! Provides property performance metrics and analytics.

/// HTTP request handlers for analytics.
pub mod handlers;
/// Request and response models for analytics endpoints.
pub mod models;
/// Router configuration for analytics endpoints.
pub mod routes;

// Re-exports
pub use models::{PropertyPerformanceReport, PropertyPerformanceRequest};
