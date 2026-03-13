//! Database queries for ICO endpoints.

use rust_decimal::Decimal;
use sqlx::{FromRow, PgPool};

/// ICO schedule row from `ico_schedules` table.
#[derive(Debug, FromRow)]
pub struct IcoScheduleRow {
    /// Total allocation for this round (U256 as TEXT, minimal units, decimals=18).
    pub sale_amount: String,
    /// Token price (U256 as TEXT, 6 decimals; 500000 = $0.50).
    pub price: String,
}

/// Returns the currently active ICO schedule (by timestamp), or the latest one.
///
/// Tries active schedule first (`NOW()` between start/end), falls back to the
/// most recently created schedule.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails or no schedule exists.
#[inline]
pub async fn fetch_active_schedule(pool: &PgPool) -> Result<Option<IcoScheduleRow>, sqlx::Error> {
    let row = sqlx::query_as!(
        IcoScheduleRow,
        r"
            SELECT sale_amount, price
            FROM ico_schedules
            ORDER BY
                CASE WHEN EXTRACT(EPOCH FROM NOW())::BIGINT BETWEEN start_timestamp AND end_timestamp
                     THEN 0 ELSE 1 END,
                created_at DESC
            LIMIT 1
        ",
    )
    .fetch_optional(pool)
    .await?;

    Ok(row)
}

/// Returns the total tokens purchased by a specific buyer (U256 as TEXT).
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_buyer_tokens(pool: &PgPool, buyer_address: &str) -> Result<String, sqlx::Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT COALESCE(SUM(amount::NUMERIC), 0)::TEXT
            FROM ico_purchases
            WHERE buyer_address = $1
        ",
        buyer_address,
    )
    .fetch_one(pool)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Returns `(tokens_sold, tokens_remaining)` as TEXT strings.
///
/// `tokens_remaining` is clamped to zero via `GREATEST(... , 0)`.
/// `total_allocation` is parsed to [`Decimal`] for precise SQL arithmetic.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_sale_totals(
    pool: &PgPool,
    total_allocation: &str,
) -> Result<(String, String), sqlx::Error> {
    let alloc: Decimal = total_allocation.parse().unwrap_or(Decimal::ZERO);

    let row = sqlx::query!(
        r"
            SELECT
                COALESCE(SUM(amount::NUMERIC), 0)::TEXT AS tokens_sold,
                GREATEST($1 - COALESCE(SUM(amount::NUMERIC), 0), 0)::TEXT AS tokens_remaining
            FROM ico_purchases
        ",
        alloc,
    )
    .fetch_one(pool)
    .await?;

    Ok((
        row.tokens_sold.unwrap_or_else(|| "0".to_owned()),
        row.tokens_remaining
            .unwrap_or_else(|| total_allocation.to_owned()),
    ))
}
