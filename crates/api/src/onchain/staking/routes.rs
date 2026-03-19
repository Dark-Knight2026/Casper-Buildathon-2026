//! Router configuration for staking endpoints.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::common::AppState;
use crate::onchain::staking::handlers;

/// Creates an `OpenAPI` router for staking endpoints.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::get_staking_info))
        .routes(routes!(handlers::get_portfolio))
        .routes(routes!(handlers::get_earnings))
        .routes(routes!(handlers::get_rewards_history))
}
