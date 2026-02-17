//! Router configuration for analytics endpoints.

use std::sync::Arc;

use axum::{Router, routing::post};

use crate::{analytics, common::AppState};

/// Creates the analytics router with performance endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route(
        "/analytics/property-performance",
        post(analytics::get_property_performance),
    )
}
