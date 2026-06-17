//! Router configuration for rental-application endpoints.
//!
//! Handlers declare FULL paths (`/listings/{id}/applications`, `/applications`,
//! `/applications/{id}/status`), so this router is `.merge()`d into the
//! marketplace router with no blanket `require_auth`; each handler self-gates
//! via `RoleUser<R>`. `POST` (tenant) and `GET` (landlord) share the
//! `/listings/{id}/applications` path, distinguished by method and role.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::applications::handlers};

/// Builds the rental-applications `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::submit_application))
        .routes(routes!(handlers::list_listing_applications))
        .routes(routes!(handlers::list_my_applications))
        .routes(routes!(handlers::list_landlord_applications))
        .routes(routes!(handlers::get_application))
        .routes(routes!(handlers::review_application))
}
