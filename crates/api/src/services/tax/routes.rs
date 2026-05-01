//! Router configuration for tax endpoints.
//!
//! Path prefix `/tax` is NOT repeated in the handlers' `#[utoipa::path]`;
//! it is added once via `.nest("/tax", ...)` in `services::protected_router`,
//! so handlers below mount as e.g. `path = "/calculate-liability"` ->
//! `/api/v1/tax/calculate-liability`.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::tax::handlers};

/// Builds the tax `OpenApiRouter`.
///
/// Returned router has no auth or rate-limiter middleware applied; the caller
/// (`protected_router`) wraps it with the protected-tier `GovernorLayer`, the
/// `require_auth` middleware, and the `/tax` path prefix via `.nest()`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new().routes(routes!(handlers::calculate_tax_liability))
}
