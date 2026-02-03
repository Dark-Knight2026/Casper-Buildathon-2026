//! Router configuration for tax endpoints.

use crate::{common::AppState, tax::handlers::calculate_tax_liability};
use axum::{Router, routing::post};
use std::sync::Arc;

/// Creates the tax router with calculation endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new().route("/tax/calculate-liability", post(calculate_tax_liability))
}
