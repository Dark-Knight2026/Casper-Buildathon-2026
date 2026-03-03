//! Request and response models for ICO endpoints.

use serde::Serialize;
use utoipa::ToSchema;

/// ICO balance information for a specific account.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct IcoBalanceResponse {
    /// Total tokens purchased by this account (U256 as string, minimal units, decimals=18).
    #[schema(example = "1505000000000000000000000")]
    pub tokens_purchased: String,
    /// Total amount spent in USD: `(tokens_purchased / 10^18) * price_usd`.
    #[serde(rename = "totalSpentUSD")]
    #[schema(example = 1505.0)]
    pub total_spent_usd: f64,
    /// Current token price in USD (from ICO config).
    #[schema(example = 0.5)]
    pub token_price: f64,
    /// Token symbol (always `"BIG"`).
    #[schema(example = "BIG")]
    pub token_symbol: String,
    /// Current value of holdings in USD: same formula as `totalSpentUSD` while ICO is active.
    #[schema(example = 1505.0)]
    pub current_value: f64,
}

/// ICO sale progress information.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct IcoProgressResponse {
    /// Total tokens sold across all purchases (U256 as string, minimal units).
    #[schema(example = "225000000000000000000000000")]
    pub tokens_sold: String,
    /// Total token allocation for this ICO round (U256 as string, minimal units).
    #[schema(example = "500000000000000000000000000")]
    pub total_allocation: String,
    /// Remaining tokens: `total_allocation - tokens_sold` (U256 as string).
    #[schema(example = "275000000000000000000000000")]
    pub tokens_remaining: String,
    /// Total amount raised in USD: `(tokens_sold / 10^18) * price_usd`.
    #[schema(example = 337_500.0)]
    pub amount_raised: f64,
    /// Hard cap in USD: `(total_allocation / 10^18) * price_usd`.
    #[schema(example = 250_000_000.0)]
    pub hard_cap_usd: f64,
    /// Token price in USD for this ICO round.
    #[schema(example = 0.5)]
    pub price_usd: f64,
    /// Percentage of tokens sold (0.0 - 100.0).
    #[schema(example = 30.0)]
    pub percent_sold: f64,
}
