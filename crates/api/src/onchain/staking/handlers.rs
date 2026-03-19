//! HTTP request handlers for staking endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
};
use chrono::{Months, Utc};
use rust_decimal::{Decimal, prelude::ToPrimitive};

use crate::{
    common::{ApiError, ApiResult, AppState},
    onchain::{
        common,
        staking::{
            db,
            models::{
                AccountHashPath, EarningsPoint, EarningsQuery, EarningsResponse, PortfolioResponse,
                RewardsHistoryPoint, RewardsHistoryQuery, RewardsHistoryResponse,
                StakingInfoResponse,
            },
        },
    },
};

/// ICO price precision (6 decimals).
const PRICE_DECIMALS: u32 = 6;

/// Parse period string into number of months to look back.
/// Supported: `1m`, `3m`, `6m`, `1y`, `all`.
#[inline]
fn parse_period_months(period: &str) -> Result<Option<u32>, ApiError> {
    match period {
        "1m" => Ok(Some(1)),
        "3m" => Ok(Some(3)),
        "6m" => Ok(Some(6)),
        "1y" => Ok(Some(12)),
        "all" => Ok(None),
        _ => Err(ApiError::BadRequest(
            "Invalid period. Allowed: 1m, 3m, 6m, 1y, all".to_owned(),
        )),
    }
}

// `GET /api/v1/staking/{accountHash}`
//
/// Returns staking info for a given account: staked tokens, APY, total rewards.
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the account hash is not 64 hex characters.
#[utoipa::path(
    get,
    path = "/{accountHash}",
    tag = "Staking",
    params(AccountHashPath),
    responses(
        (status = 200, description = "Staking information", body = StakingInfoResponse),
        (status = 400, description = "Invalid account hash format"),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_staking_info(
    State(state): State<Arc<AppState>>,
    Path(path): Path<AccountHashPath>,
) -> ApiResult<Json<StakingInfoResponse>> {
    let account = common::validate_account(&path.account_hash)?;

    let position = db::fetch_staking_position(&state.db, &account).await?;
    let apy_data = db::fetch_apy_data(&state.db).await?;

    let (staked_tokens, total_rewards_earned) = match position {
        Some(p) => (
            common::to_human_f64(&p.staked_amount),
            common::to_human_f64(&p.total_rewards_claimed),
        ),
        None => (0.0, 0.0),
    };

    let rewards_per_year = apy_data
        .rewards_per_year
        .parse::<Decimal>()
        .unwrap_or(Decimal::ZERO);
    let total_staked = apy_data
        .total_staked
        .parse::<Decimal>()
        .unwrap_or(Decimal::ZERO);
    let current_apy = if total_staked.is_zero() {
        0.0
    } else {
        ((rewards_per_year / total_staked) * Decimal::from(100))
            .to_f64()
            .unwrap_or(0.0)
    };

    Ok(Json(StakingInfoResponse {
        staked_tokens,
        current_apy,
        total_rewards_earned,
    }))
}

// `GET /api/v1/staking/{accountHash}/portfolio`
//
/// Returns portfolio overview: wallet balance, staked, rewards, USD estimate.
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the account hash is not 64 hex characters.
#[utoipa::path(
    get,
    path = "/{accountHash}/portfolio",
    tag = "Staking",
    params(AccountHashPath),
    responses(
        (status = 200, description = "Portfolio overview", body = PortfolioResponse),
        (status = 400, description = "Invalid account hash format"),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_portfolio(
    State(state): State<Arc<AppState>>,
    Path(path): Path<AccountHashPath>,
) -> ApiResult<Json<PortfolioResponse>> {
    let account = common::validate_account(&path.account_hash)?;

    let big_balance_raw = db::fetch_big_balance(&state.db, &account).await?;
    let position = db::fetch_staking_position(&state.db, &account).await?;
    let ico_price_raw = db::fetch_ico_price(&state.db).await?;

    let big_in_wallet = common::to_human_f64(&big_balance_raw);
    let (big_staked, rewards_earned) = match position {
        Some(p) => (
            common::to_human_f64(&p.staked_amount),
            common::to_human_f64(&p.total_rewards_claimed),
        ),
        None => (0.0, 0.0),
    };
    let total_big = big_in_wallet + big_staked + rewards_earned;

    // Convert ICO price (U256, 6 decimals) to human-readable USD price per token.
    let price_divisor = Decimal::from(10u64.pow(PRICE_DECIMALS));
    let price_per_token = ico_price_raw.parse::<Decimal>().unwrap_or(Decimal::ZERO) / price_divisor;
    let estimated_usd_value = (Decimal::try_from(total_big).unwrap_or(Decimal::ZERO)
        * price_per_token)
        .to_f64()
        .unwrap_or(0.0);

    Ok(Json(PortfolioResponse {
        big_in_wallet,
        big_staked,
        rewards_earned,
        total_big,
        estimated_usd_value,
        change_24h_percent: 0.0,
    }))
}

// `GET /api/v1/staking/{accountHash}/earnings?period=6m`
//
/// Returns monthly earnings chart for a staker.
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the account hash is not 64 hex characters.
#[utoipa::path(
    get,
    path = "/{accountHash}/earnings",
    tag = "Staking",
    params(AccountHashPath, EarningsQuery),
    responses(
        (status = 200, description = "Monthly earnings data", body = EarningsResponse),
        (status = 400, description = "Invalid account hash format"),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_earnings(
    State(state): State<Arc<AppState>>,
    Path(path): Path<AccountHashPath>,
    Query(query): Query<EarningsQuery>,
) -> ApiResult<Json<EarningsResponse>> {
    let account = common::validate_account(&path.account_hash)?;

    let since = match parse_period_months(&query.period)? {
        Some(months) => Utc::now()
            .checked_sub_months(Months::new(months))
            .unwrap_or(Utc::now()),
        None => chrono::DateTime::UNIX_EPOCH,
    };

    let rows = db::fetch_monthly_earnings(&state.db, &account, since).await?;

    let data = rows
        .into_iter()
        .map(|r| EarningsPoint {
            month: r.month,
            earnings: common::to_human_f64(&r.total_amount),
        })
        .collect();

    Ok(Json(EarningsResponse { data }))
}

// `GET /api/v1/staking/{accountHash}/rewards-history?period=90`
//
/// Returns daily cumulative rewards history for a staker.
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the account hash is not 64 hex characters.
#[utoipa::path(
    get,
    path = "/{accountHash}/rewards-history",
    tag = "Staking",
    params(AccountHashPath, RewardsHistoryQuery),
    responses(
        (status = 200, description = "Daily rewards history", body = RewardsHistoryResponse),
        (status = 400, description = "Invalid account hash format"),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_rewards_history(
    State(state): State<Arc<AppState>>,
    Path(path): Path<AccountHashPath>,
    Query(query): Query<RewardsHistoryQuery>,
) -> ApiResult<Json<RewardsHistoryResponse>> {
    let account = common::validate_account(&path.account_hash)?;
    let days = query.period.clamp(1, 365);

    let rows = db::fetch_daily_cumulative_rewards(&state.db, &account, days).await?;

    if rows.is_empty() {
        return Ok(Json(RewardsHistoryResponse { data: vec![] }));
    }

    let start_date = rows.first().map(|r| r.reward_date).unwrap_or_default();

    let data = rows
        .into_iter()
        .map(|r| {
            let day = (r.reward_date - start_date).num_days() + 1;
            RewardsHistoryPoint {
                day,
                staking_pool: common::to_human_f64(&r.cumulative_amount),
                tx_fees: 0.0,
            }
        })
        .collect();

    Ok(Json(RewardsHistoryResponse { data }))
}
