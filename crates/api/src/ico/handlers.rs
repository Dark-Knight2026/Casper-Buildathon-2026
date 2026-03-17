//! HTTP request handlers for ICO endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
};
use rust_decimal::{Decimal, prelude::ToPrimitive};

use crate::{
    common::{ApiError, ApiResult, AppState},
    ico::{
        db,
        models::{IcoBalanceResponse, IcoProgressResponse},
    },
};

/// Number of decimal places in the price U256 value (same as USDC/USDT).
const PRICE_DECIMALS: u32 = 6;

/// Number of decimal places in the token amount U256 value (BIG token).
const TOKEN_DECIMALS: u32 = 18;

/// Converts a raw U256 text value (minimal units, decimals=18) to a human-readable Decimal.
#[inline]
fn to_human(raw: &str) -> Decimal {
    let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));
    raw.parse::<Decimal>().unwrap_or(Decimal::ZERO) / divisor
}

/// Converts a price U256 string (6 decimals) to a human-readable f64.
/// E.g. "500000" -> 0.5
#[inline]
fn price_to_f64(raw: &str) -> f64 {
    let divisor = Decimal::from(10u64.pow(PRICE_DECIMALS));
    let dec = raw.parse::<Decimal>().unwrap_or(Decimal::ZERO) / divisor;
    dec.to_f64().unwrap_or(0.0)
}

/// Converts a price U256 string (6 decimals) to Decimal.
#[inline]
fn price_to_decimal(raw: &str) -> Decimal {
    let divisor = Decimal::from(10u64.pow(PRICE_DECIMALS));
    raw.parse::<Decimal>().unwrap_or(Decimal::ZERO) / divisor
}

/// Resolved ICO config: price as f64, price as U256 string, and total allocation.
struct ResolvedIco {
    price_f64: f64,
    price_decimal: Decimal,
    total_allocation: String,
}

/// Resolve ICO config: try `ico_schedules` table first, fall back to env vars.
async fn resolve_ico(state: &AppState) -> Result<ResolvedIco, ApiError> {
    if let Some(schedule) = db::fetch_active_schedule(&state.db).await? {
        return Ok(ResolvedIco {
            price_f64: price_to_f64(&schedule.price),
            price_decimal: price_to_decimal(&schedule.price),
            total_allocation: schedule.sale_amount,
        });
    }

    let fallback = state
        .config
        .ico_fallback
        .as_ref()
        .ok_or_else(|| ApiError::Internal("ICO not configured".to_owned()))?;

    Ok(ResolvedIco {
        price_f64: fallback.price_usd,
        price_decimal: Decimal::try_from(fallback.price_usd).unwrap_or(Decimal::ZERO),
        total_allocation: fallback.total_allocation.clone(),
    })
}

/// `GET /api/v1/ico/balance/{address}`
///
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
        (status = 400, description = "Invalid address format"),
        (status = 500, description = "ICO not configured or internal error")
    )
)]
#[inline]
pub async fn get_ico_balance(
    State(state): State<Arc<AppState>>,
    Path(address): Path<String>,
) -> ApiResult<Json<IcoBalanceResponse>> {
    let address = address.to_ascii_lowercase();
    if address.len() != 64 || !address.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApiError::BadRequest(
            "Address must be 64 hex characters (account hash without prefix)".to_owned(),
        ));
    }

    let ico = resolve_ico(&state).await?;
    let tokens_purchased = db::fetch_buyer_tokens(&state.db, &address).await?;
    let usd_value = (to_human(&tokens_purchased) * ico.price_decimal)
        .to_f64()
        .unwrap_or(0.0);

    Ok(Json(IcoBalanceResponse {
        tokens_purchased,
        total_spent_usd: usd_value,
        token_price: ico.price_f64,
        token_symbol: "BIG".to_owned(),
        current_value: usd_value,
    }))
}

/// `GET /api/v1/ico/progress`
///
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
        (status = 500, description = "ICO not configured or internal error")
    )
)]
#[inline]
pub async fn get_ico_progress(
    State(state): State<Arc<AppState>>,
) -> ApiResult<Json<IcoProgressResponse>> {
    let ico = resolve_ico(&state).await?;

    let (tokens_sold, tokens_remaining) =
        db::fetch_sale_totals(&state.db, &ico.total_allocation).await?;

    let sold_dec = tokens_sold.parse::<Decimal>().unwrap_or(Decimal::ZERO);
    let alloc_dec = ico
        .total_allocation
        .parse::<Decimal>()
        .unwrap_or(Decimal::ZERO);
    let hundred = Decimal::from(100);

    let amount_raised = (to_human(&tokens_sold) * ico.price_decimal)
        .to_f64()
        .unwrap_or(0.0);
    let hard_cap_usd = (to_human(&ico.total_allocation) * ico.price_decimal)
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
        tokens_sold,
        total_allocation: ico.total_allocation,
        tokens_remaining,
        amount_raised,
        hard_cap_usd,
        price_usd: ico.price_f64,
        percent_sold,
    }))
}
