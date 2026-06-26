//! HTTP request handlers for ICO endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
};
use rust_decimal::{Decimal, prelude::ToPrimitive};

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, validation},
    onchain::{
        common::TOKEN_DECIMALS,
        ico::{
            db,
            models::{IcoBalanceResponse, IcoProgressResponse},
        },
    },
};

/// Number of decimal places in the price U256 value (same as USDC/USDT).
const PRICE_DECIMALS: u32 = 6;

/// Converts a raw U256 text value (minimal units, decimals=18) to a human-readable Decimal.
#[inline]
fn to_human(raw: &str) -> ApiResult<Decimal> {
    let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));
    let val = raw
        .parse::<Decimal>()
        .map_err(|_| ApiError::Internal(format!("invalid token amount: {raw}")))?;
    Ok(val / divisor)
}

/// Converts a price U256 string (6 decimals) to a human-readable f64.
/// E.g. "500000" -> 0.5
#[inline]
fn price_to_f64(raw: &str) -> ApiResult<f64> {
    let dec = price_to_decimal(raw)?;
    Ok(dec.to_f64().unwrap_or(0.0))
}

/// Converts a price U256 string (6 decimals) to Decimal.
#[inline]
fn price_to_decimal(raw: &str) -> ApiResult<Decimal> {
    let divisor = Decimal::from(10u64.pow(PRICE_DECIMALS));
    let val = raw
        .parse::<Decimal>()
        .map_err(|_| ApiError::Internal(format!("invalid price data: {raw}")))?;
    Ok(val / divisor)
}

// `GET /api/v1/ico/balance/{address}`
//
/// Returns ICO balance information for a specific account.
///
/// Aggregates `ico_purchases.amount` for the given buyer and derives
/// USD values from the active ICO schedule (DB) or env var fallback.
///
/// # Errors
///
/// Returns `ApiError::Internal` if neither DB schedule nor env vars are configured.
#[utoipa::path(
    get,
    path = "/balance/{address}",
    tag = "ICO",
    params(
        ("address" = String, Path, description = "Buyer account hash (64 hex, no prefix)")
    ),
    responses(
        (status = 200, description = "ICO balance for the account", body = IcoBalanceResponse),
        (status = 400, description = "Invalid address format", body = ErrorResponse),
        (status = 500, description = "ICO not configured or internal error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn get_ico_balance(
    State(state): State<Arc<AppState>>,
    Path(address): Path<String>,
) -> ApiResult<Json<IcoBalanceResponse>> {
    let address = validation::validate_account(&address)?;

    let snapshot = db::fetch_balance_snapshot(&state.db, &address).await?;

    let (price_f64, price_decimal, is_active) = if let Some(ref schedule) = snapshot.schedule {
        (
            price_to_f64(&schedule.price)?,
            price_to_decimal(&schedule.price)?,
            schedule.is_active.unwrap_or(false),
        )
    } else {
        let fallback = state
            .config
            .ico_fallback
            .as_ref()
            .ok_or_else(|| ApiError::Internal("ICO not configured".to_owned()))?;
        (
            fallback.price_usd.to_f64().unwrap_or(0.0),
            fallback.price_usd,
            false,
        )
    };

    let current_value = (to_human(&snapshot.tokens_purchased)? * price_decimal)
        .to_f64()
        .unwrap_or(0.0);

    // Historical cost: SUM(amount * price) / 10^24, pre-divided in SQL.
    let total_spent_usd = snapshot
        .historical_cost_usd
        .parse::<Decimal>()
        .map_err(|_| ApiError::Internal("invalid historical cost data".to_owned()))?
        .to_f64()
        .unwrap_or(0.0);

    Ok(Json(IcoBalanceResponse {
        tokens_purchased: snapshot.tokens_purchased,
        total_spent_usd,
        token_price: price_f64,
        token_symbol: "BIG".to_owned(),
        current_value,
        is_active,
    }))
}

// `GET /api/v1/ico/progress`
//
/// Returns overall ICO sale progress.
///
/// Derives all values from `SUM(ico_purchases.amount)` and the
/// active ICO schedule (DB) or env var fallback.
///
/// # Errors
///
/// Returns `ApiError::Internal` if neither DB schedule nor env vars are configured.
#[utoipa::path(
    get,
    path = "/progress",
    tag = "ICO",
    responses(
        (status = 200, description = "Current ICO sale progress", body = IcoProgressResponse),
        (status = 500, description = "ICO not configured or internal error", body = ErrorResponse)
    )
)]
#[inline]
pub async fn get_ico_progress(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<IcoProgressResponse>> {
    let snapshot = db::fetch_progress_snapshot(&state.db).await?;

    // Resolve price and total_allocation from the snapshot schedule or env fallback.
    let (price_f64, price_decimal, total_allocation, is_active) =
        if let Some(ref schedule) = snapshot.schedule {
            (
                price_to_f64(&schedule.price)?,
                price_to_decimal(&schedule.price)?,
                schedule.sale_amount.clone(),
                schedule.is_active.unwrap_or(false),
            )
        } else {
            let fallback = state
                .config
                .ico_fallback
                .as_ref()
                .ok_or_else(|| ApiError::Internal("ICO not configured".to_owned()))?;

            (
                fallback.price_usd.to_f64().unwrap_or(0.0),
                fallback.price_usd,
                fallback.total_allocation.clone(),
                false,
            )
        };

    // Recalculate tokens_remaining using the resolved total_allocation from the
    // snapshot schedule (not the fallback used as default for the query).
    let alloc_dec = total_allocation
        .parse::<Decimal>()
        .map_err(|_| ApiError::Internal("invalid ICO total_allocation data".to_owned()))?;
    let sold_dec = snapshot
        .tokens_sold
        .parse::<Decimal>()
        .map_err(|_| ApiError::Internal("invalid ICO tokens_sold data".to_owned()))?;
    let hundred = Decimal::from(100);

    let tokens_remaining_dec = (alloc_dec - sold_dec).max(Decimal::ZERO);
    let tokens_remaining = tokens_remaining_dec.to_string();

    // Historical cost: SUM(amount * price) / 10^24, pre-divided in SQL.
    let amount_raised = snapshot
        .historical_cost_usd
        .parse::<Decimal>()
        .map_err(|_| ApiError::Internal("invalid historical cost data".to_owned()))?
        .to_f64()
        .unwrap_or(0.0);
    let hard_cap_usd = (to_human(&total_allocation)? * price_decimal)
        .to_f64()
        .unwrap_or(0.0);
    let percent_sold = if alloc_dec > Decimal::ZERO {
        (sold_dec / alloc_dec * hundred)
            .min(hundred)
            .to_f64()
            .unwrap_or(0.0)
    } else {
        0.0
    };

    Ok(Json(IcoProgressResponse {
        tokens_sold: snapshot.tokens_sold,
        total_allocation,
        tokens_remaining,
        amount_raised,
        hard_cap_usd,
        price_usd: price_f64,
        percent_sold,
        is_active,
    }))
}
