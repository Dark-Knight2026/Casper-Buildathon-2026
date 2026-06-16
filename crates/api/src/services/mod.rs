//! Business logic services.
//!
//! - [`auth`] - Authentication (nonce generation, login, JWT middleware)
//! - [`analytics`] - Property performance analytics
//! - [`health`] - Health check endpoint
//! - [`tax`] - Tax calculation endpoints
//! - [`users`] - Authenticated user-profile endpoints

use std::sync::Arc;

use crate::AppState;
use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};
use utoipa_axum::router::OpenApiRouter;

/// Property analytics feature module.
pub mod analytics;
/// Rental-applications feature module (ADR-007 downstream); role-gated.
pub mod applications;
/// Authentication feature module.
pub mod auth;
/// Favorites (tenant saved listings) feature module; tenant-gated.
pub mod favorites;
/// Health check feature module.
pub mod health;
/// Lease-agreement feature module; authenticated landlord/tenant surface.
pub mod leases;
/// Listing (time-bound offer) feature module; mixed public/role-gated auth.
pub mod listings;
/// Property (physical-asset) feature module; mixed public/role-gated auth.
pub mod properties;
/// Tax calculation feature module.
pub mod tax;
/// Authenticated user-profile feature module.
pub mod users;
/// Viewings (in-person booking) feature module (ADR-007 downstream); role-gated.
pub mod viewings;

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

    auth::routes::router().route_layer(GovernorLayer::new(rate_limit))
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
        .nest("/tax", tax::routes::router())
        .nest("/analytics", analytics::routes::router())
        .nest("/users", users::routes::router())
        .merge(leases::routes::router())
        .route_layer(GovernorLayer::new(rate_limit))
        .route_layer(axum::middleware::from_fn_with_state(
            state,
            auth::middleware::require_auth,
        ))
}

/// Rate limit: requests allowed per second for the property/listing marketplace.
pub const MARKETPLACE_RATE_LIMIT_PER_SECOND: u64 = 10;

/// Rate limit: maximum burst size for the property/listing marketplace.
pub const MARKETPLACE_RATE_LIMIT_BURST: u32 = 50;

/// Creates the property/listing marketplace router.
///
/// Unlike [`protected_router`], this router applies NO blanket `require_auth`:
/// the surface is mixed-access. Public reads (e.g. `GET /properties/{id}`)
/// carry no auth extractor, while writes self-gate via `RoleUser<R>` inside
/// each handler (which validates the `access_token` cookie on its own). Only
/// the shared rate limiter is applied here. Handlers declare full paths, so
/// their routers are `.merge()`d rather than nested under a prefix.
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid.
#[inline]
#[must_use]
pub fn marketplace_router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .key_extractor(SmartIpKeyExtractor)
            .per_second(MARKETPLACE_RATE_LIMIT_PER_SECOND)
            .burst_size(MARKETPLACE_RATE_LIMIT_BURST)
            .use_headers()
            .finish()
            .expect(
                "marketplace rate-limit config is always valid: per_second > 0 and burst_size > 0",
            ),
    );

    OpenApiRouter::new()
        .merge(properties::routes::router())
        .merge(listings::routes::router())
        .merge(favorites::routes::router())
        .merge(applications::routes::router())
        .merge(viewings::routes::router())
        .route_layer(GovernorLayer::new(rate_limit))
}
