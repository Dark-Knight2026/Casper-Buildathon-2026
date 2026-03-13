//! HTTP request handlers for ICO endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
};
use rust_decimal::{Decimal, prelude::ToPrimitive};

use crate::{
    AuthUser,
    common::{ApiError, ApiResult, AppState},
    ico::{
        db,
        models::{IcoBalanceResponse, IcoProgressResponse},
    },
};

/// Converts a raw U256 text value (minimal units, decimals=18) to a human-readable Decimal.
#[inline]
fn to_human(raw: &str) -> Decimal {
    let decimals = Decimal::from(10u64.pow(18));
    raw.parse::<Decimal>().unwrap_or(Decimal::ZERO) / decimals
}

/// `GET /api/v1/ico/balance/{address}`
///
/// Returns ICO balance information for a specific account.
///
/// Aggregates `ico_purchases.amount` for the given buyer and derives
/// USD values from the `ICO_PRICE_USD` configuration.
///
/// # Errors
///
/// Returns `ApiError::Internal` if ICO config is missing.
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
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "ICO not configured or internal error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[inline]
pub async fn get_ico_balance(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
    Path(address): Path<String>,
) -> ApiResult<Json<IcoBalanceResponse>> {
    let ico = state
        .config
        .ico
        .as_ref()
        .ok_or_else(|| ApiError::Internal("ICO not configured".to_owned()))?;

    let address = address.to_ascii_lowercase();
    if address.len() != 64 || !address.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApiError::BadRequest(
            "Address must be 64 hex characters (account hash without prefix)".to_owned(),
        ));
    }

    let tokens_purchased = db::fetch_buyer_tokens(&state.db, &address).await?;
    let price = Decimal::try_from(ico.price_usd).unwrap_or(Decimal::ZERO);
    let usd_value = (to_human(&tokens_purchased) * price)
        .to_f64()
        .unwrap_or(0.0);

    Ok(Json(IcoBalanceResponse {
        tokens_purchased,
        total_spent_usd: usd_value,
        token_price: ico.price_usd,
        token_symbol: "BIG".to_owned(),
        current_value: usd_value,
    }))
}

/// `GET /api/v1/ico/progress`
///
/// Returns overall ICO sale progress.
///
/// Derives all values from `SUM(ico_purchases.amount)` and the
/// `ICO_PRICE_USD` / `ICO_TOTAL_ALLOCATION` configuration.
///
/// # Errors
///
/// Returns `ApiError::Internal` if ICO config is missing.
#[utoipa::path(
    get,
    path = "/ico/progress",
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
    let ico = state
        .config
        .ico
        .as_ref()
        .ok_or_else(|| ApiError::Internal("ICO not configured".to_owned()))?;

    let (tokens_sold, tokens_remaining) =
        db::fetch_sale_totals(&state.db, &ico.total_allocation).await?;

    let price = Decimal::try_from(ico.price_usd).unwrap_or(Decimal::ZERO);
    let sold_dec = tokens_sold.parse::<Decimal>().unwrap_or(Decimal::ZERO);
    let alloc_dec = ico
        .total_allocation
        .parse::<Decimal>()
        .unwrap_or(Decimal::ZERO);
    let hundred = Decimal::from(100);

    let amount_raised = (to_human(&tokens_sold) * price).to_f64().unwrap_or(0.0);
    let hard_cap_usd = (to_human(&ico.total_allocation) * price)
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
        total_allocation: ico.total_allocation.clone(),
        tokens_remaining,
        amount_raised,
        hard_cap_usd,
        price_usd: ico.price_usd,
        percent_sold,
    }))
}
