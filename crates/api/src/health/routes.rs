//! Router configuration for health endpoints.

use axum::{Router, routing::get};
use std::sync::Arc;

use crate::common::AppState;
use crate::health::handlers::health_check;

/// Creates the health check router.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/health", get(health_check))
}
