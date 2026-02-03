//! Router configuration for analytics endpoints.

use axum::{Router, routing::post};
use std::sync::Arc;

use crate::analytics::handlers::get_property_performance;
use crate::common::AppState;

/// Creates the analytics router with performance endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route(
        "/analytics/property-performance",
        post(get_property_performance),
    )
}
