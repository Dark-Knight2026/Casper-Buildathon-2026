//! Database queries for vesting endpoints.

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
    .fetch_all(pool)
    .await?;

    let count = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM vesting_schedules WHERE beneficiary = $1",
        account,
    )
    .fetch_one(pool)
    .await?
    .unwrap_or(0);

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
            WHERE th.token_type = 'BIG'
              AND th.user_address NOT IN (
                  SELECT contract_hash FROM contract_registry WHERE is_active = TRUE
              )
        ",
    )
    .fetch_one(pool)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Returns all vesting schedules globally (for release schedule calculation).
///
/// Hard-capped at 10 000 rows to bound memory and CPU usage on this
/// unauthenticated endpoint.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_all_schedules(pool: &PgPool) -> Result<Vec<VestingScheduleRow>, sqlx::Error> {
    sqlx::query_as!(
        VestingScheduleRow,
        r"
            SELECT vesting_id, total_amount, claimed_amount, start_timestamp, cliff_duration, vesting_duration
            FROM vesting_schedules
            ORDER BY start_timestamp
            LIMIT 10000
        ",
    )
    .fetch_all(pool)
    .await
}
