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
                StakingInfoResponse, UnbondingEvent, UnbondingResponse,
            },
        },
    },
};

/// ICO price precision (6 decimals).
const PRICE_DECIMALS: u32 = 6;

/// Parse period string into number of months to look back.
/// Supported: `1m`, `3m`, `6m`, `1y`, `all`.
#[inline]
fn parse_period_months(period: &str) -> ApiResult<Option<u32>> {
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

    let snap = db::fetch_staking_info_snapshot(&state.db, &account).await?;

    let vesting_locked_tokens = common::to_human_f64(&snap.vesting_locked)?;

    let (staked_tokens, total_rewards_claimed, pending_rewards) = match &snap.position {
        Some(p) => (
            common::to_human_f64(&p.staked_amount)?,
            common::to_human_f64(&p.total_rewards_claimed)?,
            match snap.pending_rewards_computed.as_deref() {
                Some(v) => common::to_human_f64(v)?,
                None => 0.0,
            },
        ),
        None => (0.0, 0.0, 0.0),
    };

    let total_rewards_earned = total_rewards_claimed + pending_rewards;

    let rewards_per_year = snap
        .apy_data
        .rewards_per_year
        .parse::<Decimal>()
        .unwrap_or_else(|e| {
            tracing::warn!(
                raw = %snap.apy_data.rewards_per_year,
                error = %e,
                "Failed to parse rewards_per_year as Decimal, defaulting to 0"
            );
            Decimal::ZERO
        });
    let total_staked = snap
        .apy_data
        .total_staked
        .parse::<Decimal>()
        .unwrap_or_else(|e| {
            tracing::warn!(
                raw = %snap.apy_data.total_staked,
                error = %e,
                "Failed to parse total_staked as Decimal, defaulting to 0"
            );
            Decimal::ZERO
        });
    let current_apy = if total_staked.is_zero() {
        0.0
    } else {
        ((rewards_per_year / total_staked) * Decimal::from(100))
            .to_f64()
            .unwrap_or(0.0)
    };

    Ok(Json(StakingInfoResponse {
        staked_tokens,
        vesting_locked_tokens,
        current_apy,
        total_rewards_earned,
        pending_rewards,
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

    let snap = db::fetch_portfolio_snapshot(&state.db, &account).await?;

    let big_in_wallet = common::to_human_f64(&snap.big_balance)?;
    let vesting_locked_tokens = common::to_human_f64(&snap.vesting_locked)?;
    let (big_staked, rewards_earned) = match &snap.position {
        Some(p) => {
            let pending = match snap.pending_rewards_computed.as_deref() {
                Some(v) => common::to_human_f64(v)?,
                None => 0.0,
            };
            (
                common::to_human_f64(&p.staked_amount)?,
                common::to_human_f64(&p.total_rewards_claimed)? + pending,
            )
        }
        None => (0.0, 0.0),
    };
    let total_big = big_in_wallet + big_staked + rewards_earned;

    // Convert ICO price (U256, 6 decimals) to human-readable USD price per token.
    let price_divisor = Decimal::from(10u64.pow(PRICE_DECIMALS));
    let price_per_token =
        snap.ico_price.parse::<Decimal>().unwrap_or(Decimal::ZERO) / price_divisor;
    let estimated_usd_value = (Decimal::try_from(total_big).unwrap_or(Decimal::ZERO)
        * price_per_token)
        .to_f64()
        .unwrap_or(0.0);

    Ok(Json(PortfolioResponse {
        big_in_wallet,
        big_staked,
        vesting_locked_tokens,
        rewards_earned,
        total_big,
        estimated_usd_value,
        // TODO: implement 24h percent change calculation
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
        .map(|r| {
            Ok(EarningsPoint {
                month: r.month,
                earnings: common::to_human_f64(&r.total_amount)?,
            })
        })
        .collect::<ApiResult<Vec<_>>>()?;

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
            Ok(RewardsHistoryPoint {
                day,
                staking_pool: common::to_human_f64(&r.cumulative_amount)?,
                tx_fees: 0.0,
            })
        })
        .collect::<ApiResult<Vec<_>>>()?;

    Ok(Json(RewardsHistoryResponse { data }))
}

// `GET /api/v1/staking/{accountHash}/unbonding`
//
/// Returns unbonding status and unstake/withdraw event history for a staker.
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the account hash is not 64 hex characters.
#[utoipa::path(
    get,
    path = "/{accountHash}/unbonding",
    tag = "Staking",
    params(AccountHashPath),
    responses(
        (status = 200, description = "Unbonding status and history", body = UnbondingResponse),
        (status = 400, description = "Invalid account hash format"),
        (status = 500, description = "Internal error"),
    )
)]
#[inline]
pub async fn get_unbonding(
    State(state): State<Arc<AppState>>,
    Path(path): Path<AccountHashPath>,
) -> ApiResult<Json<UnbondingResponse>> {
    let account = common::validate_account(&path.account_hash)?;

    let snap = db::fetch_unbonding_snapshot(&state.db, &account).await?;
    let position = snap.position;
    let events = snap.events;

    let now_ms = Utc::now().timestamp_millis();

    let (unbonding_amount, unbonding_ends_at_ms) = match &position {
        Some(p) => (
            common::to_human_f64(&p.unbonding_amount)?,
            p.unbonding_ends_at.map_or(0, |dt| dt.timestamp_millis()),
        ),
        None => (0.0, 0),
    };

    let is_withdrawable = unbonding_ends_at_ms > 0 && unbonding_ends_at_ms <= now_ms;
    let time_remaining_ms = if unbonding_ends_at_ms > now_ms {
        unbonding_ends_at_ms - now_ms
    } else {
        0
    };

    let history = events
        .into_iter()
        .map(|e| {
            Ok(UnbondingEvent {
                event_type: e.event_type,
                amount: common::to_human_f64(&e.amount)?,
                timestamp: e.event_timestamp.to_rfc3339(),
                transaction_hash: e.transaction_hash,
            })
        })
        .collect::<ApiResult<Vec<_>>>()?;

    Ok(Json(UnbondingResponse {
        unbonding_amount,
        unbonding_ends_at: unbonding_ends_at_ms,
        is_withdrawable,
        time_remaining_ms,
        history,
    }))
}
