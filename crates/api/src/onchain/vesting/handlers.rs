//! HTTP request handlers for vesting endpoints.

use std::collections::BTreeMap;
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
    let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));

    // For each month, calculate the total vested across all schedules.
    let mut points = BTreeMap::new();
    for month_idx in 0..=total_months {
        let timestamp = origin + month_idx * MS_PER_MONTH;
        let mut total_vested = Decimal::ZERO;

        for r in &rows {
            total_vested += calculate_vested(
                &r.total_amount,
                r.start_timestamp,
                r.cliff_duration,
                r.vesting_duration,
                timestamp,
            );
        }

        let released = (total_vested / divisor).to_f64().unwrap_or(0.0);
        points.insert(month_idx, released);
    }

    let data = points
        .into_iter()
        .map(|(month, released)| ReleaseSchedulePoint {
            month: month.to_string(),
            released,
        })
        .collect();

    Ok(Json(ReleaseScheduleResponse { data }))
}
