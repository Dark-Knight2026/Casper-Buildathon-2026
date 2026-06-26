//! Router configuration for viewing endpoints.
//!
//! Handlers declare FULL paths (`/listings/{id}/viewings`, `/viewings`,
//! `/listings/{id}/viewings/{viewingId}`), so this router is `.merge()`d into
//! the marketplace router with no blanket `require_auth`; each handler
//! self-gates via `RoleUser<R>`. `POST` (tenant) and `GET` (landlord) share the
//! `/listings/{id}/viewings` path; `DELETE` (tenant) and `PUT` (landlord) share
//! the `/listings/{id}/viewings/{viewingId}` path - distinguished by method and
//! role.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::viewings::handlers};

/// Builds the viewings `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::book_viewing))
        .routes(routes!(handlers::list_listing_viewings))
        .routes(routes!(handlers::list_my_viewings))
        .routes(routes!(handlers::cancel_viewing))
        .routes(routes!(handlers::update_viewing_status))
}
