//! Router configuration for vesting endpoints.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::common::AppState;
use crate::onchain::vesting::handlers;

/// Creates an `OpenAPI` router for vesting endpoints.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::get_vesting_schedules))
        .routes(routes!(handlers::get_token_supply))
        .routes(routes!(handlers::get_release_schedule))
}
