//! HTTP request handlers for ICO endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
};

use crate::{
    AuthUser,
    common::{ApiError, ApiResult, AppState},
    ico::{
        db,
        models::{IcoBalanceResponse, IcoProgressResponse},
    },
};

/// Number of decimal places in the BIG token (ERC-20 standard).
const TOKEN_DECIMALS: f64 = 1e18;

/// Converts a raw U256 text value (minimal units, decimals=18) to a "human" f64.
#[inline]
fn to_human(raw: &str) -> f64 {
    raw.parse::<f64>().unwrap_or(0.0) / TOKEN_DECIMALS
}

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
    let usd_value = to_human(&tokens_purchased) * ico.price_usd;

    Ok(Json(IcoBalanceResponse {
        tokens_purchased,
        total_spent_usd: usd_value,
        token_price: ico.price_usd,
        token_symbol: "BIG".to_owned(),
        current_value: usd_value,
    }))
}

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
    path = "/progress",
    tag = "ICO",
    responses(
        (status = 200, description = "Current ICO sale progress", body = IcoProgressResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "ICO not configured or internal error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[inline]
pub async fn get_ico_progress(
    State(state): State<Arc<AppState>>,
    _user: AuthUser,
) -> ApiResult<Json<IcoProgressResponse>> {
    let ico = state
        .config
        .ico
        .as_ref()
        .ok_or_else(|| ApiError::Internal("ICO not configured".to_owned()))?;

    let (tokens_sold, tokens_remaining) =
        db::fetch_sale_totals(&state.db, &ico.total_allocation).await?;

    let sold_f64: f64 = tokens_sold.parse().unwrap_or(0.0);
    let alloc_f64: f64 = ico.total_allocation.parse().unwrap_or(0.0);

    let amount_raised = to_human(&tokens_sold) * ico.price_usd;
    let hard_cap_usd = to_human(&ico.total_allocation) * ico.price_usd;
    let percent_sold = if alloc_f64 > 0.0 {
        (sold_f64 / alloc_f64 * 100.0).min(100.0)
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
