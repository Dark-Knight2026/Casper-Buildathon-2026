//! Database queries for ICO endpoints.

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

/// Snapshot of ICO progress data fetched atomically.
#[derive(Debug)]
pub struct ProgressSnapshot {
    /// Active ICO schedule, if any.
    pub schedule: Option<IcoScheduleRow>,
    /// Total tokens sold (U256 as TEXT).
    pub tokens_sold: String,
}

/// Fetches ICO schedule and sale totals in a single REPEATABLE READ transaction.
///
/// Ensures `schedule` and `tokens_sold` reflect the same database snapshot,
/// preventing inconsistencies from concurrent purchases.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_progress_snapshot(pool: &PgPool) -> Result<ProgressSnapshot, sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let schedule = sqlx::query_as!(
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
    .fetch_optional(tx.as_mut())
    .await?;

    let row =
        sqlx::query_scalar!(r"SELECT COALESCE(SUM(amount::NUMERIC), 0)::TEXT FROM ico_purchases",)
            .fetch_one(tx.as_mut())
            .await?;

    tx.commit().await?;

    Ok(ProgressSnapshot {
        schedule,
        tokens_sold: row.unwrap_or_else(|| "0".to_owned()),
    })
}
