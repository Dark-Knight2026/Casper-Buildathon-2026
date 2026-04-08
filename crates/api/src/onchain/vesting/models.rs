//! Request and response models for vesting endpoints.

use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use crate::common::Pagination;

/// Query parameters for `GET /vesting/schedules`.
///
/// Pagination fields are duplicated from [`Pagination`] because
/// `serde_urlencoded` does not support `#[serde(flatten)]`.
#[derive(Debug, Default, Deserialize, IntoParams)]
pub struct SchedulesQuery {
    /// Account hash of the beneficiary (64 hex characters, no prefix).
    #[param(example = "ec91fa80b40ed85bf570c1f2b2454d3af5a3d242e6d1bcb709f7980e4b67f6ef")]
    pub account: String,
    /// Page number (1-based, defaults to 1).
    #[serde(default)]
    pub page: Option<i64>,
    /// Items per page (1-100, defaults to 25).
    #[serde(default)]
    pub page_size: Option<i64>,
}

impl SchedulesQuery {
    /// Convert the embedded pagination fields into a [`Pagination`] value.
    #[inline]
    #[must_use]
    pub fn pagination(&self) -> Pagination {
        Pagination {
            page: self.page,
            page_size: self.page_size,
        }
    }
}

/// A single vesting schedule for a beneficiary.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct VestingScheduleItem {
    /// Vesting schedule ID from the contract.
    #[schema(example = "0")]
    pub id: String,
    /// Remaining tokens: `total_amount - claimed_amount` (human-readable f64).
    /// Includes both time-locked and vested-but-unclaimed tokens.
    /// True time-locked amount would be `total - vested`.
    #[schema(example = 50000.0)]
    pub locked_amount: f64,
    /// Block timestamp when the vesting clock started (epoch ms).
    #[schema(example = 1_762_012_800_000_i64)]
    pub purchase_timestamp: i64,
    /// Timestamp when cliff ends and first tokens unlock (epoch ms).
    #[schema(example = 1_746_057_600_000_i64)]
    pub unlock_timestamp: i64,
    /// Timestamp when vesting ends and all tokens become claimable (epoch ms).
    #[schema(example = 1_793_548_800_000_i64)]
    pub vesting_end_timestamp: i64,
    /// Tokens already unlocked/claimed (human-readable f64).
    #[schema(example = 0.0)]
    pub unlocked_amount: f64,
}

/// Response for `GET /vesting/token-supply`.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokenSupplyResponse {
    /// Total BIG token supply (human-readable f64).
    #[schema(example = 5_000_000_000.0)]
    pub total_supply: f64,
    /// Circulating supply: tokens held by non-contract addresses (human-readable f64).
    #[schema(example = 1_000_000_000.0)]
    pub circulating_supply: f64,
}

/// A single point in the global vesting release schedule.
#[derive(Debug, Serialize, ToSchema)]
pub struct ReleaseSchedulePoint {
    /// Relative month from the earliest vesting start (e.g. "0", "6", "12").
    #[schema(example = "6")]
    pub month: String,
    /// Cumulative tokens released by this month (human-readable f64).
    #[schema(example = 1_000_000_000.0)]
    pub released: f64,
}

/// Response for `GET /vesting/release-schedule`.
#[derive(Debug, Serialize, ToSchema)]
pub struct ReleaseScheduleResponse {
    /// Release schedule data points.
    pub data: Vec<ReleaseSchedulePoint>,
    /// `true` when the 10,000-row safety cap was hit and results may be incomplete.
    pub is_truncated: bool,
}
