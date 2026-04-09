//! Business logic services.
//!
//! - [`auth`] - Authentication (nonce generation, login, JWT middleware)
//! - [`analytics`] - Property performance analytics
//! - [`health`] - Health check endpoint
//! - [`tax`] - Tax calculation endpoints

use std::sync::Arc;

use crate::AppState;
use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};
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
/// # Rate limiter trust model
///
/// Uses `SmartIpKeyExtractor` which trusts `X-Forwarded-For` unconditionally.
/// **Deployment constraint**: this API MUST sit behind a trusted reverse proxy
/// (e.g. Nginx, Cloudflare, ALB) that overwrites `X-Forwarded-For` with the
/// real client IP. Direct exposure to the internet allows clients to spoof
/// `X-Forwarded-For` and bypass per-IP rate limits.
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid (e.g. zero burst size).
#[inline]
#[must_use]
pub fn public_router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .key_extractor(SmartIpKeyExtractor)
            .per_second(AUTH_RATE_LIMIT_PER_SECOND)
            .burst_size(AUTH_RATE_LIMIT_BURST)
            .use_headers()
            .finish()
            .expect("auth rate-limit config is always valid: per_second > 0 and burst_size > 0"),
    );

    OpenApiRouter::new()
        .routes(routes!(auth::handlers::get_nonce))
        .routes(routes!(auth::handlers::login))
        .route_layer(GovernorLayer::new(rate_limit))
}

/// Rate limit: requests allowed per second for protected (authenticated) endpoints.
pub const PROTECTED_RATE_LIMIT_PER_SECOND: u64 = 5;

/// Rate limit: maximum burst size for protected (authenticated) endpoints.
pub const PROTECTED_RATE_LIMIT_BURST: u32 = 30;

/// Creates an `OpenAPI` router for protected endpoints that require JWT
/// authentication.
///
/// Authentication is enforced structurally via a router-level middleware
/// (`require_auth`), so every current and future handler on this router is
/// protected regardless of whether it includes the `AuthUser` extractor.
///
/// Rate limiting uses `SmartIpKeyExtractor` (same trust model as other routers).
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid.
#[inline]
#[must_use]
pub fn protected_router(state: Arc<AppState>) -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .key_extractor(SmartIpKeyExtractor)
            .per_second(PROTECTED_RATE_LIMIT_PER_SECOND)
            .burst_size(PROTECTED_RATE_LIMIT_BURST)
            .use_headers()
            .finish()
            .expect(
                "protected rate-limit config is always valid: per_second > 0 and burst_size > 0",
            ),
    );

    OpenApiRouter::new()
        .routes(routes!(tax::handlers::calculate_tax_liability))
        .routes(routes!(analytics::handlers::get_property_performance))
        .route_layer(GovernorLayer::new(rate_limit))
        .route_layer(axum::middleware::from_fn_with_state(
            state,
            auth::middleware::require_auth,
        ))
}
