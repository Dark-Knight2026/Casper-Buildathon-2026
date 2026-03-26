//! Request and response models for staking endpoints.

use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

/// Default earnings period when the query parameter is omitted.
pub const DEFAULT_PERIOD: &str = "6m";

/// Path parameter for staking endpoints: `{accountHash}`.
#[derive(Debug, Deserialize, IntoParams)]
pub struct AccountHashPath {
    /// Account hash of the staker (64 hex characters, no prefix).
    #[param(example = "ec91fa80b40ed85bf570c1f2b2454d3af5a3d242e6d1bcb709f7980e4b67f6ef")]
    #[serde(rename = "accountHash")]
    pub account_hash: String,
}

/// Query parameters for earnings endpoint.
#[derive(Debug, Deserialize, IntoParams)]
pub struct EarningsQuery {
    /// Period filter: `1m`, `3m`, `6m`, `1y`, `all`. Defaults to `6m`.
    #[param(example = "6m")]
    #[serde(default = "default_period")]
    pub period: String,
}

fn default_period() -> String {
    DEFAULT_PERIOD.to_owned()
}

/// Query parameters for rewards-history endpoint.
#[derive(Debug, Deserialize, IntoParams)]
pub struct RewardsHistoryQuery {
    /// Number of days to look back. Defaults to 90.
    #[param(example = 90)]
    #[serde(default = "default_days")]
    pub period: i32,
}

fn default_days() -> i32 {
    90
}

/// Response for `GET /staking/{accountHash}`.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct StakingInfoResponse {
    /// Currently staked BIG tokens (human-readable f64).
    #[schema(example = 100_000.0)]
    pub staked_tokens: f64,
    /// Estimated annual percentage yield (%).
    #[schema(example = 12.5)]
    pub current_apy: f64,
    /// Total rewards earned by this staker: claimed + pending (human-readable f64).
    #[schema(example = 5_000.0)]
    pub total_rewards_earned: f64,
    /// Currently pending (unclaimed) rewards computed off-chain (human-readable f64).
    #[schema(example = 1_200.0)]
    pub pending_rewards: f64,
}

/// Response for `GET /staking/{accountHash}/portfolio`.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PortfolioResponse {
    /// BIG tokens in wallet (not staked) (human-readable f64).
    #[schema(example = 50_000.0)]
    pub big_in_wallet: f64,
    /// BIG tokens currently staked (human-readable f64).
    #[schema(example = 100_000.0)]
    pub big_staked: f64,
    /// Total rewards earned from staking (human-readable f64).
    #[schema(example = 5_000.0)]
    pub rewards_earned: f64,
    /// Total BIG: wallet + staked + rewards (human-readable f64).
    #[schema(example = 155_000.0)]
    pub total_big: f64,
    /// Estimated USD value of total BIG (based on current ICO price).
    #[schema(example = 77_500.0)]
    pub estimated_usd_value: f64,
    /// 24h price change percentage (always 0 - no market data available).
    #[schema(example = 0.0)]
    pub change_24h_percent: f64,
}

/// A single month in the earnings chart.
#[derive(Debug, Serialize, ToSchema)]
pub struct EarningsPoint {
    /// Month label (e.g. "2026-01").
    #[schema(example = "2026-01")]
    pub month: String,
    /// Total rewards claimed in this month (human-readable f64).
    #[schema(example = 1_200.0)]
    pub earnings: f64,
}

/// Response for `GET /staking/{accountHash}/earnings`.
#[derive(Debug, Serialize, ToSchema)]
pub struct EarningsResponse {
    /// Earnings data points grouped by month.
    pub data: Vec<EarningsPoint>,
}

/// A single day in the rewards history chart.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RewardsHistoryPoint {
    /// Relative day number from the start of the period.
    #[schema(example = 1)]
    pub day: i64,
    /// Cumulative rewards from staking pool (human-readable f64).
    #[schema(example = 500.0)]
    pub staking_pool: f64,
    /// Transaction fees component (always 0 - contract does not distinguish).
    #[schema(example = 0.0)]
    pub tx_fees: f64,
}

/// Response for `GET /staking/{accountHash}/rewards-history`.
#[derive(Debug, Serialize, ToSchema)]
pub struct RewardsHistoryResponse {
    /// Rewards history data points by day.
    pub data: Vec<RewardsHistoryPoint>,
}

/// Response for `GET /staking/{accountHash}/unbonding`.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnbondingResponse {
    /// Tokens currently in the unbonding cooldown period (human-readable f64).
    #[schema(example = 5_000.0)]
    pub unbonding_amount: f64,
    /// Epoch ms when the unbonding period ends (0 = no active unbonding).
    /// Stored as TIMESTAMPTZ in DB, converted to epoch ms for the API response.
    #[schema(example = 1_719_849_600_000i64)]
    pub unbonding_ends_at: i64,
    /// Whether the unbonding period has elapsed and `withdraw()` can be called.
    #[schema(example = false)]
    pub is_withdrawable: bool,
    /// Milliseconds remaining until withdraw is possible (0 if already withdrawable).
    #[schema(example = 604_800_000i64)]
    pub time_remaining_ms: i64,
    /// Chronological history of unstake/withdraw events.
    pub history: Vec<UnbondingEvent>,
}

/// A single unstake or withdraw event in the unbonding history.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnbondingEvent {
    /// Event type: "unstake" or "withdraw".
    #[schema(example = "unstake")]
    pub event_type: String,
    /// Token amount (human-readable f64).
    #[schema(example = 5_000.0)]
    pub amount: f64,
    /// Event timestamp (ISO 8601).
    #[schema(example = "2026-03-20T12:00:00Z")]
    pub timestamp: String,
    /// Deploy hash of the transaction.
    #[schema(example = "abc123...")]
    pub transaction_hash: String,
}
