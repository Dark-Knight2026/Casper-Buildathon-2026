//! Router configuration for ICO endpoints.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, onchain::ico::handlers};

/// Creates an `OpenAPI` router for ICO endpoints.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::get_ico_balance))
        .routes(routes!(handlers::get_ico_progress))
}
