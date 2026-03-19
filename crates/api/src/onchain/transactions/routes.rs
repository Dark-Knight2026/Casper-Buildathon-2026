//! Router configuration for transaction history endpoints.

use std::sync::Arc;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{common::AppState, onchain::transactions::handlers};

/// Creates an `OpenAPI` router for blockchain transaction endpoints.
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(handlers::get_account_transactions))
        .routes(routes!(handlers::get_big_token_transactions))
}
