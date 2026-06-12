//! Router configuration for listing endpoints.
//!
//! Handlers declare FULL paths (`/listings...`), so this router is `.merge()`d
//! into the marketplace router with no blanket `require_auth`; the public read
//! handlers carry no auth extractor.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::listings::handlers};

/// Builds the listings `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::list_listings))
        .routes(routes!(handlers::get_listing))
}
