//! Router configuration for property endpoints.
//!
//! Handlers declare FULL paths (`/properties...`) in their `#[utoipa::path]`,
//! so this router is `.merge()`d (not nested under a prefix) into the
//! marketplace router, which applies NO blanket `require_auth`. Each handler
//! states its own auth via `RoleUser`; the public detail read carries no
//! extractor.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::properties::handlers};

/// Builds the properties `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::create_property))
        .routes(routes!(handlers::update_property))
        .routes(routes!(handlers::get_property))
        .routes(routes!(handlers::search_properties))
        .routes(routes!(handlers::get_property_listings))
}
