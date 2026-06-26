//! Database queries for vesting endpoints.

use futures_util::stream::BoxStream;
use sqlx::{FromRow, PgPool};

/// Raw vesting schedule row from `vesting_schedules` table.
#[derive(Debug, FromRow)]
pub struct VestingScheduleRow {
    /// Vesting schedule ID (U256 as TEXT).
    pub vesting_id: String,
    /// Total tokens locked (U256 as TEXT, minimal units, decimals=18).
    pub total_amount: String,
    /// Tokens already claimed (U256 as TEXT, minimal units, decimals=18).
    pub claimed_amount: String,
    /// Block timestamp when the vesting clock starts (epoch ms).
    pub start_timestamp: i64,
    /// Cliff duration (ms).
    pub cliff_duration: i64,
    /// Total vesting duration (ms).
    pub vesting_duration: i64,
}

/// Fetches paginated vesting schedules for a given beneficiary.
///
/// Returns `(rows, total_count)` for pagination.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_schedules_by_account(
    pool: &PgPool,
    account: &str,
    limit: i64,
    offset: i64,
) -> Result<(Vec<VestingScheduleRow>, i64), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let rows = sqlx::query_as!(
        VestingScheduleRow,
        r"
            SELECT vesting_id, total_amount, claimed_amount, start_timestamp, cliff_duration, vesting_duration
            FROM vesting_schedules
            WHERE beneficiary = $1
            ORDER BY start_timestamp
            LIMIT $2 OFFSET $3
        ",
        account,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;

    let count = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM vesting_schedules WHERE beneficiary = $1",
        account,
    )
    .fetch_one(tx.as_mut())
    .await?
    .unwrap_or(0);

    tx.commit().await?;

    Ok((rows, count))
}

/// Returns the sum of BIG token balances for non-contract addresses.
///
/// Contract addresses are excluded via the `contract_registry` table.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_circulating_supply(pool: &PgPool) -> Result<String, sqlx::Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT COALESCE(SUM(th.balance::NUMERIC), 0)::TEXT
            FROM token_holdings th
            LEFT JOIN contract_registry cr
                ON th.user_address = cr.contract_hash AND cr.is_active = TRUE
            WHERE th.token_type = 'BIG'
              AND cr.contract_hash IS NULL
        ",
    )
    .fetch_one(pool)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Earliest and latest schedule timestamps used to size the release-schedule
/// month buffer before streaming individual rows.
#[derive(Debug)]
pub struct ScheduleBounds {
    /// Minimum `start_timestamp` across all schedules (epoch ms), or `None` if table is empty.
    pub min_start: Option<i64>,
    /// Maximum `start_timestamp + vesting_duration` across all schedules (epoch ms), or `None` if empty.
    pub max_end: Option<i64>,
    /// Total number of schedules.
    pub count: i64,
}

/// Returns the bounding timestamps and row count for the global release
/// schedule aggregation. Consumed by `get_release_schedule` to size its
/// delta buffers before streaming individual rows.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_schedule_bounds(pool: &PgPool) -> Result<ScheduleBounds, sqlx::Error> {
    let row = sqlx::query!(
        r#"
            SELECT
                MIN(start_timestamp) AS min_start,
                MAX(start_timestamp + vesting_duration) AS max_end,
                COUNT(*) AS "count!"
            FROM vesting_schedules
        "#,
    )
    .fetch_one(pool)
    .await?;

    Ok(ScheduleBounds {
        min_start: row.min_start,
        max_end: row.max_end,
        count: row.count,
    })
}

/// Streams all vesting schedules globally (for release schedule calculation).
///
/// Returns a row-by-row stream so the handler can accumulate sweep-line deltas
/// without materializing every schedule in a Rust `Vec`. Use
/// [`fetch_schedule_bounds`] first to size the delta arrays before consuming
/// this stream.
#[inline]
#[must_use]
pub fn stream_all_schedules(
    pool: &PgPool,
) -> BoxStream<'_, Result<VestingScheduleRow, sqlx::Error>> {
    sqlx::query_as!(
        VestingScheduleRow,
        r"
            SELECT vesting_id, total_amount, claimed_amount, start_timestamp, cliff_duration, vesting_duration
            FROM vesting_schedules
            ORDER BY start_timestamp
        ",
    )
    .fetch(pool)
}
