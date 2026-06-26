//! Router configuration for favorite endpoints.
//!
//! Handlers declare FULL paths (`/favorites...`), so this router is `.merge()`d
//! into the marketplace router with no blanket `require_auth`; each handler
//! self-gates via `RoleUser<TenantRole>`. The static `/favorites/ids` (GET) and
//! the dynamic `/favorites/{listingId}` (DELETE) coexist because axum matches
//! static segments first and they carry distinct methods.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, services::favorites::handlers};

/// Builds the favorites `OpenApiRouter`.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::list_favorites))
        .routes(routes!(handlers::add_favorite))
        .routes(routes!(handlers::list_favorite_ids))
        .routes(routes!(handlers::remove_favorite))
}
