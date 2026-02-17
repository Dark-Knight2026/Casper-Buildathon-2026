//! Router configuration for health endpoints.

use std::sync::Arc;

use axum::{Router, routing::get};

use crate::{common::AppState, health::handlers::health_check};

/// Creates the health check router.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/health", get(health_check))
}
