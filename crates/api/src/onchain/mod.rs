//! On-chain data modules sourced from the Casper Network indexer.
//!
//! - [`ico`] - ICO sale progress and account balances
//! - [`staking`] - Staking info, portfolio and rewards
//! - [`transactions`] - Blockchain transaction history
//! - [`vesting`] - Vesting schedules and token supply

use std::sync::Arc;

use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::AppState;

/// ICO (Initial Coin Offering) feature module.
pub mod ico;
/// Staking feature module.
pub mod staking;
/// Transaction history feature module.
pub mod transactions;
/// Vesting schedule feature module.
pub mod vesting;

/// Rate limit: requests allowed per second for public data endpoints.
pub const PUBLIC_DATA_RATE_LIMIT_PER_SECOND: u64 = 5;

/// Rate limit: maximum burst size for public data endpoints.
pub const PUBLIC_DATA_RATE_LIMIT_BURST: u32 = 30;

/// Creates a rate-limited `OpenAPI` router for public on-chain data endpoints (no auth).
///
/// - `GET /ico/progress` - ICO sale progress
/// - `GET /ico/balance/{address}` - ICO balance for an account
/// - `GET /transactions/token/big` - BIG token transactions
/// - `GET /transactions/account/{address}` - account transaction history
/// - `GET /staking/{accountHash}` - staking info
/// - `GET /staking/{accountHash}/portfolio` - portfolio overview
/// - `GET /staking/{accountHash}/earnings` - monthly earnings chart
/// - `GET /staking/{accountHash}/rewards-history` - daily rewards history
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid (e.g. zero burst size).
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(PUBLIC_DATA_RATE_LIMIT_PER_SECOND)
            .burst_size(PUBLIC_DATA_RATE_LIMIT_BURST)
            .finish()
            .expect(
                "public-data rate-limit config is always valid: per_second > 0 and burst_size > 0",
            ),
    );

    OpenApiRouter::new()
        .nest("/transactions", transactions_router())
        .nest("/ico", ico_router())
        .nest("/vesting", vesting_router())
        .nest("/staking", staking_router())
        .route_layer(GovernorLayer::new(rate_limit))
}

/// Creates an `OpenAPI` router for blockchain transaction endpoints.
#[inline]
fn transactions_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(transactions::handlers::get_account_transactions))
        .routes(routes!(transactions::handlers::get_big_token_transactions))
}

/// Creates an `OpenAPI` router for ICO endpoints.
#[inline]
fn ico_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(ico::handlers::get_ico_balance))
        .routes(routes!(ico::handlers::get_ico_progress))
}

/// Creates an `OpenAPI` router for vesting endpoints.
#[inline]
fn vesting_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(vesting::handlers::get_vesting_schedules))
        .routes(routes!(vesting::handlers::get_token_supply))
        .routes(routes!(vesting::handlers::get_release_schedule))
}

/// Creates an `OpenAPI` router for staking endpoints.
#[inline]
fn staking_router() -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(staking::handlers::get_staking_info))
        .routes(routes!(staking::handlers::get_portfolio))
        .routes(routes!(staking::handlers::get_earnings))
        .routes(routes!(staking::handlers::get_rewards_history))
}
