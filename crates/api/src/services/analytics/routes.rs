//! Router configuration for analytics endpoints.
//!
//! Path prefix `/analytics` is NOT repeated in the handlers' `#[utoipa::path]`;
//! it is added once via `.nest("/analytics", ...)` in
//! `services::protected_router`, so handlers below mount as e.g.
//! `path = "/property-performance"` -> `/api/v1/analytics/property-performance`.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::analytics::handlers};

/// Builds the analytics `OpenApiRouter`.
///
/// Returned router has no auth or rate-limiter middleware applied; the caller
/// (`protected_router`) wraps it with the protected-tier `GovernorLayer`, the
/// `require_auth` middleware, and the `/analytics` path prefix via `.nest()`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new().routes(routes!(handlers::get_property_performance))
}
