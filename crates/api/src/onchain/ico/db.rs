//! Database queries for ICO endpoints.

use sqlx::{FromRow, PgPool, postgres::PgConnection};

/// ICO schedule row from `ico_schedules` table.
#[derive(Debug, FromRow)]
pub struct IcoScheduleRow {
    /// Total allocation for this round (U256 as TEXT, minimal units, decimals=18).
    pub sale_amount: String,
    /// Token price (U256 as TEXT, 6 decimals; 500000 = $0.50).
    pub price: String,
    /// Whether `NOW()` falls between `start_timestamp` and `end_timestamp`.
    /// sqlx infers `Option<bool>` for computed expressions; callers use
    /// `.unwrap_or(false)`.
    pub is_active: Option<bool>,
}

/// Fetches the current (or most recent) ICO schedule.
///
/// Prefers the active schedule (where `NOW()` is between start and end
/// timestamps). Falls back to the latest by `block_height` and `created_at`.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
async fn fetch_current_schedule(
    conn: &mut PgConnection,
) -> Result<Option<IcoScheduleRow>, sqlx::Error> {
    sqlx::query_as!(
        IcoScheduleRow,
        r"
            SELECT sale_amount, price,
                   (EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 BETWEEN start_timestamp AND end_timestamp) AS is_active
            FROM ico_schedules
            ORDER BY
                CASE WHEN EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 BETWEEN start_timestamp AND end_timestamp
                     THEN 0 ELSE 1 END,
                block_height DESC, created_at DESC
            LIMIT 1
        ",
    )
    .fetch_optional(conn)
    .await
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

    let schedule = fetch_current_schedule(tx.as_mut()).await?;

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

/// Snapshot of ICO balance data fetched atomically.
#[derive(Debug)]
pub struct BalanceSnapshot {
    /// Active ICO schedule, if any.
    pub schedule: Option<IcoScheduleRow>,
    /// Total tokens purchased by the buyer (U256 as TEXT).
    pub tokens_purchased: String,
}

/// Fetches ICO schedule and buyer tokens in a single REPEATABLE READ transaction.
///
/// Ensures `schedule` and `tokens_purchased` reflect the same database snapshot,
/// preventing price race conditions from concurrent ICO schedule changes.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_balance_snapshot(
    pool: &PgPool,
    buyer_address: &str,
) -> Result<BalanceSnapshot, sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let schedule = fetch_current_schedule(tx.as_mut()).await?;

    let value = sqlx::query_scalar!(
        r"
            SELECT COALESCE(SUM(amount::NUMERIC), 0)::TEXT
            FROM ico_purchases
            WHERE buyer_address = $1
        ",
        buyer_address,
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;

    Ok(BalanceSnapshot {
        schedule,
        tokens_purchased: value.unwrap_or_else(|| "0".to_owned()),
    })
}
