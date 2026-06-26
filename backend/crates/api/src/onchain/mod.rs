//! On-chain data modules sourced from the Casper Network indexer.
//!
//! - [`ico`] - ICO sale progress and account balances
//! - [`staking`] - Staking info, portfolio and rewards
//! - [`transactions`] - Blockchain transaction history
//! - [`vesting`] - Vesting schedules and token supply

use std::sync::Arc;

use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};
use utoipa_axum::router::OpenApiRouter;

use crate::AppState;

/// Shared utilities (token conversion, address validation).
pub mod common;
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
///
/// Same `SmartIpKeyExtractor` trust model as [`crate::services::public_router`] - see its docs.
///
/// # Panics
///
/// Panics at startup if the rate-limit configuration is invalid (e.g. zero burst size).
#[inline]
#[must_use]
pub fn router() -> OpenApiRouter<Arc<AppState>> {
    let rate_limit = Arc::new(
        GovernorConfigBuilder::default()
            .key_extractor(SmartIpKeyExtractor)
            .per_second(PUBLIC_DATA_RATE_LIMIT_PER_SECOND)
            .burst_size(PUBLIC_DATA_RATE_LIMIT_BURST)
            .use_headers()
            .finish()
            .expect(
                "public-data rate-limit config is always valid: per_second > 0 and burst_size > 0",
            ),
    );

    OpenApiRouter::new()
        .nest("/transactions", transactions::routes::router())
        .nest("/ico", ico::routes::router())
        .nest("/vesting", vesting::routes::router())
        .nest("/staking", staking::routes::router())
        .route_layer(GovernorLayer::new(rate_limit))
}
