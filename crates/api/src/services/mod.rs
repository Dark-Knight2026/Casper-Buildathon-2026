//! Business logic services.
//!
//! - [`auth`] - Authentication (nonce generation, login, JWT middleware)
//! - [`analytics`] - Property performance analytics
//! - [`health`] - Health check endpoint
//! - [`tax`] - Tax calculation endpoints

use std::sync::Arc;

use crate::AppState;
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
use utoipa_axum::{router::OpenApiRouter, routes};

/// Property analytics feature module.
pub mod analytics;
/// Authentication feature module.
pub mod auth;
/// Health check feature module.
pub mod health;
/// Tax calculation feature module.
pub mod tax;

/// Rate limit: requests allowed per second for auth endpoints.
pub const AUTH_RATE_LIMIT_PER_SECOND: u64 = 1;

/// Rate limit: maximum burst size for auth endpoints.
pub const AUTH_RATE_LIMIT_BURST: u32 = 15;

/// Creates an `OpenAPI` router for public API endpoints that do not require
/// authentication.
///
/// Includes rate limiting:
/// - Authentication endpoints (`/auth/*`)
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid (e.g. zero burst size).
#[inline]
pub fn public_router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(AUTH_RATE_LIMIT_PER_SECOND)
            .burst_size(AUTH_RATE_LIMIT_BURST)
            .finish()
            .expect("auth rate-limit config is always valid: per_second > 0 and burst_size > 0"),
    );

    OpenApiRouter::new()
        .routes(routes!(auth::handlers::get_nonce))
        .routes(routes!(auth::handlers::login))
        .route_layer(GovernorLayer::new(rate_limit))
}

/// Creates an `OpenAPI` router for protected endpoints that require JWT
/// authentication.
///
/// Authentication is enforced via the `AuthUser` extractor in handlers.
#[inline]
pub fn protected_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(tax::handlers::calculate_tax_liability))
        .routes(routes!(analytics::handlers::get_property_performance))
}
