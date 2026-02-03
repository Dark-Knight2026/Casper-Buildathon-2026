//! Router configuration for analytics endpoints.

use crate::{analytics, common::AppState};
use axum::{Router, routing::post};
use std::sync::Arc;

/// Creates the analytics router with performance endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route(
        "/analytics/property-performance",
        post(analytics::get_property_performance),
    )
}
