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
        .routes(routes!(handlers::create_listing))
        .routes(routes!(handlers::get_listing))
        .routes(routes!(handlers::update_listing))
        .routes(routes!(handlers::delete_listing))
        .routes(routes!(handlers::submit_listing))
        .routes(routes!(handlers::set_listing_state))
        .routes(routes!(handlers::record_listing_view))
        .routes(routes!(handlers::get_listing_statistics))
        .routes(routes!(handlers::get_listing_historical_data))
        .routes(routes!(handlers::get_provenance))
        .routes(routes!(handlers::upload_authority_document))
        .routes(routes!(handlers::screen_listing))
        .routes(routes!(handlers::upload_listing_media))
        .routes(routes!(handlers::get_landlord_listings))
}
