//! Router configuration for tax endpoints.

use std::sync::Arc;

use axum::{Router, routing::post};

use crate::{common::AppState, tax::handlers::calculate_tax_liability};

/// Creates the tax router with calculation endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/tax/calculate-liability", post(calculate_tax_liability))
}
