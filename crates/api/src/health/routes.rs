//! Router configuration for health endpoints.

use crate::{common::AppState, health::handlers::health_check};
use axum::{Router, routing::get};
use std::sync::Arc;

/// Creates the health check router.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/health", get(health_check))
}
