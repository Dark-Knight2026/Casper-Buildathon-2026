//! HTTP request handlers for vesting endpoints.

use std::sync::Arc;

use axum::{Json, extract::Query, extract::State};
use chrono::Utc;
use rust_decimal::{Decimal, prelude::ToPrimitive};
use tracing::warn;

use crate::{
    common::{ApiResult, AppState, PaginatedResponse, Pagination},
    onchain::{
        common::{self, TOKEN_DECIMALS},
        vesting::{
            db,
            models::{
                ReleaseSchedulePoint, ReleaseScheduleResponse, SchedulesQuery, TokenSupplyResponse,
                VestingScheduleItem,
            },
        },
    },
};

/// Approximate milliseconds in one month (30 days).
const MS_PER_MONTH: i64 = 30 * 24 * 60 * 60 * 1_000;

/// Returns the smallest month index `m` such that `origin + m * MS_PER_MONTH >= ts`.
/// Clamped to `[0, max_len]`.
#[inline]
fn month_index_ceil(ts: i64, origin: i64, max_len: usize) -> usize {
    if ts <= origin {
        return 0;
    }
    let diff = (ts - origin).max(0);
    let m = usize::try_from((diff + MS_PER_MONTH - 1) / MS_PER_MONTH).unwrap_or(0);
    m.min(max_len)
}

/// Calculates total vested amount for a schedule at a given timestamp.
///
/// Mirrors the on-chain `calculate_vested_amt` logic:
/// - Before cliff: 0
/// - After full vesting: `total_amount`
/// - Between: linear interpolation
#[inline]
fn calculate_vested(total: &str, start: i64, cliff: i64, duration: i64, now: i64) -> Decimal {
    let total_dec = total.parse::<Decimal>().unwrap_or(Decimal::ZERO);

    let cliff_end = start.saturating_add(cliff);
    let vesting_end = start.saturating_add(duration);

    if now < cliff_end {
        Decimal::ZERO
    } else if now >= vesting_end {
        total_dec
    } else {
        let elapsed = Decimal::from(now - start);
        let dur = Decimal::from(duration);
        if dur.is_zero() {
            Decimal::ZERO
        } else {
            // Divide first to avoid overflow: (elapsed / dur) is always <= 1.0
            total_dec * (elapsed / dur)
        }
    }
}

// `GET /api/v1/vesting/schedules?account={accountHash}`
//
/// Returns paginated vesting schedules for a given beneficiary account.
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the account hash is not 64 hex characters.
#[utoipa::path(
    get,
    path = "/schedules",
    tag = "Vesting",
    params(
        ("account" = String, Query, description = "Account hash (64 hex, no prefix)"),
        Pagination,
    ),
    responses(
        (status = 200, description = "Paginated vesting schedules",
         body = inline(PaginatedResponse<VestingScheduleItem>)),
        (status = 400, description = "Invalid account hash format"),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_vesting_schedules(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SchedulesQuery>,
) -> ApiResult<Json<PaginatedResponse<VestingScheduleItem>>> {
    let account = common::validate_account(&query.account)?;
    let pagination = query.pagination();
    let (rows, item_count) = db::fetch_schedules_by_account(
        &state.db,
        &account,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    let now = Utc::now().timestamp_millis();

    let data = rows
        .iter()
        .map(|r| {
            let total_dec = r.total_amount.parse::<Decimal>().unwrap_or(Decimal::ZERO);
            let claimed_dec = r.claimed_amount.parse::<Decimal>().unwrap_or(Decimal::ZERO);

            let vested = calculate_vested(
                &r.total_amount,
                r.start_timestamp,
                r.cliff_duration,
                r.vesting_duration,
                now,
            );
            // locked = tokens not yet released by the vesting schedule
            let locked_dec = total_dec - vested;
            let unlocked_dec = vested - claimed_dec;
            let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));

            if unlocked_dec < Decimal::ZERO {
                warn!(
                    vesting_id = %r.vesting_id,
                    vested = %vested,
                    claimed = %claimed_dec,
                    "unlocked_amount is negative - claimed exceeds vested, \
                     possible indexer replay corruption"
                );
            }

            VestingScheduleItem {
                id: r.vesting_id.clone(),
                locked_amount: (locked_dec / divisor).to_f64().unwrap_or(0.0),
                purchase_timestamp: r.start_timestamp,
                unlock_timestamp: r.start_timestamp.saturating_add(r.cliff_duration),
                unlocked_amount: (unlocked_dec.max(Decimal::ZERO) / divisor)
                    .to_f64()
                    .unwrap_or(0.0),
            }
        })
        .collect();

    Ok(Json(PaginatedResponse::new(data, item_count, &pagination)))
}

// `GET /api/v1/vesting/token-supply`
//
/// Returns total BIG supply and circulating supply (tokens on non-contract wallets).
///
/// # Errors
///
/// Returns `ApiError::Database` if the database query fails.
#[utoipa::path(
    get,
    path = "/token-supply",
    tag = "Vesting",
    responses(
        (status = 200, description = "BIG token supply information", body = TokenSupplyResponse),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_token_supply(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<TokenSupplyResponse>> {
    let circulating_raw = db::fetch_circulating_supply(&state.db).await?;

    Ok(Json(TokenSupplyResponse {
        total_supply: state.config.total_supply,
        circulating_supply: common::to_human_f64(&circulating_raw),
    }))
}

// `GET /api/v1/vesting/release-schedule`
//
/// Returns the global vesting release schedule aggregated across all schedules.
/// Each point shows cumulative tokens released at a given month offset.
///
/// # Errors
///
/// Returns `ApiError::Database` if the database query fails.
#[utoipa::path(
    get,
    path = "/release-schedule",
    tag = "Vesting",
    responses(
        (status = 200, description = "Global vesting release schedule", body = ReleaseScheduleResponse),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_release_schedule(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<ReleaseScheduleResponse>> {
    let rows = db::fetch_all_schedules(&state.db).await?;

    if rows.is_empty() {
        return Ok(Json(ReleaseScheduleResponse { data: vec![] }));
    }

    // Find the earliest start_timestamp as the global origin.
    let origin = rows.iter().map(|r| r.start_timestamp).min().unwrap_or(0);

    // Find the latest vesting end to determine the range.
    let max_end = rows
        .iter()
        .map(|r| r.start_timestamp.saturating_add(r.vesting_duration))
        .max()
        .unwrap_or(0);

    let total_months = ((max_end - origin) / MS_PER_MONTH) + 1;
    let len = usize::try_from(total_months + 1).unwrap_or(usize::MAX);
    let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));

    // Sweep-line O(N + M): encode each schedule's linear vesting ramp as
    // second-order prefix-sum deltas, then reconstruct all month totals in
    // a single pass.
    let mut base_delta = vec![Decimal::ZERO; len + 1];
    let mut slope_delta = vec![Decimal::ZERO; len + 1];

    for r in &rows {
        let total_dec = r.total_amount.parse::<Decimal>().unwrap_or(Decimal::ZERO);
        if total_dec.is_zero() {
            continue;
        }

        let cliff_end_ts = r.start_timestamp.saturating_add(r.cliff_duration);
        let vesting_end_ts = r.start_timestamp.saturating_add(r.vesting_duration);

        if r.vesting_duration == 0 || vesting_end_ts <= cliff_end_ts {
            // Fully vested at cliff - add as one-time jump.
            let m = month_index_ceil(cliff_end_ts, origin, len);
            base_delta[m] += total_dec;
            continue;
        }

        let cliff_m = month_index_ceil(cliff_end_ts, origin, len);
        let end_m = month_index_ceil(vesting_end_ts, origin, len);

        if cliff_m >= len {
            continue;
        }

        let dur_dec = Decimal::from(r.vesting_duration);
        // Divide first to keep values within Decimal's 28-digit precision
        // (total_dec can be a raw U256 amount with 20+ digits).
        let slope = (total_dec / dur_dec) * Decimal::from(MS_PER_MONTH);

        // Value at cliff_month via the linear formula.
        let cliff_ts = origin + i64::try_from(cliff_m).unwrap_or(0) * MS_PER_MONTH;
        let cliff_value = (total_dec / dur_dec) * Decimal::from(cliff_ts - r.start_timestamp);

        base_delta[cliff_m] += cliff_value;
        slope_delta[cliff_m] += slope;

        if end_m < len {
            slope_delta[end_m] -= slope;
            let linear_at_end = cliff_value + slope * Decimal::from(end_m - cliff_m);
            base_delta[end_m] += total_dec - linear_at_end;
        }
    }

    // Reconstruct totals via prefix-sum sweep.
    let mut running_slope = Decimal::ZERO;
    let mut running_value = Decimal::ZERO;
    let mut data = Vec::with_capacity(len);

    for m in 0..len {
        running_value += running_slope + base_delta[m];
        running_slope += slope_delta[m];

        let released = (running_value / divisor).to_f64().unwrap_or(0.0);
        data.push(ReleaseSchedulePoint {
            month: m.to_string(),
            released,
        });
    }

    Ok(Json(ReleaseScheduleResponse { data }))
}
