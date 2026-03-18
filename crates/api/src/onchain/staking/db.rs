//! Database queries for staking endpoints.

use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};

/// Raw staking position row from `staking_positions`.
#[derive(Debug, FromRow)]
pub struct StakingPositionRow {
    /// Currently staked amount (U256 as TEXT).
    pub staked_amount: String,
    /// Cumulative rewards claimed (U256 as TEXT).
    pub total_rewards_claimed: String,
}

/// Fetch the staking position for a given account.
///
/// Returns `None` if the account has never staked.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_staking_position(
    pool: &PgPool,
    staker_address: &str,
) -> Result<Option<StakingPositionRow>, sqlx::Error> {
    sqlx::query_as!(
        StakingPositionRow,
        r"
            SELECT staked_amount, total_rewards_claimed
            FROM staking_positions
            WHERE staker_address = $1
        ",
        staker_address,
    )
    .fetch_optional(pool)
    .await
}

/// APY components returned from the database.
#[derive(Debug)]
pub struct ApyData {
    /// Annualized rewards based on the last 30 days (U256 as TEXT).
    pub rewards_per_year: String,
    /// Total staked across all stakers (U256 as TEXT).
    pub total_staked: String,
}

/// Fetch data needed to calculate APY: 30-day extrapolated rewards and total staked.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_apy_data(pool: &PgPool) -> Result<ApyData, sqlx::Error> {
    let rewards_per_year = sqlx::query_scalar!(
        r"
            SELECT COALESCE(SUM(amount::NUMERIC) * 365 / 30, 0)::TEXT
            FROM staking_reward_deposits
            WHERE event_timestamp >= NOW() - INTERVAL '30 days'
        ",
    )
    .fetch_one(pool)
    .await?
    .unwrap_or_else(|| "0".to_owned());

    let total_staked = sqlx::query_scalar!(
        r"
            SELECT COALESCE(SUM(staked_amount::NUMERIC), 0)::TEXT
            FROM staking_positions
        ",
    )
    .fetch_one(pool)
    .await?
    .unwrap_or_else(|| "0".to_owned());

    Ok(ApyData {
        rewards_per_year,
        total_staked,
    })
}

/// Fetch BIG wallet balance for an account from `token_holdings`.
///
/// Returns "0" if no balance exists.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_big_balance(pool: &PgPool, user_address: &str) -> Result<String, sqlx::Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT balance
            FROM token_holdings
            WHERE user_address = $1 AND token_type = 'BIG'
        ",
        user_address,
    )
    .fetch_optional(pool)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Fetch the latest active ICO schedule price (U256 as TEXT, 6 decimals).
///
/// Used to estimate USD value of BIG tokens.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_ico_price(pool: &PgPool) -> Result<String, sqlx::Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT price
            FROM ico_schedules
            ORDER BY start_timestamp DESC
            LIMIT 1
        ",
    )
    .fetch_optional(pool)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Monthly earnings row from `staking_events` aggregation.
#[derive(Debug, FromRow)]
pub struct MonthlyEarningsRow {
    /// Month label (e.g. "2026-01").
    pub month: String,
    /// Total claimed amount for the month (U256 as TEXT).
    pub total_amount: String,
}

/// Fetch monthly `reward_claim` earnings for a staker within a date range.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_monthly_earnings(
    pool: &PgPool,
    staker_address: &str,
    since: DateTime<Utc>,
) -> Result<Vec<MonthlyEarningsRow>, sqlx::Error> {
    sqlx::query_as!(
        MonthlyEarningsRow,
        r#"
            SELECT
                TO_CHAR(event_timestamp, 'YYYY-MM') AS "month!",
                SUM(amount::NUMERIC)::TEXT AS "total_amount!"
            FROM staking_events
            WHERE staker_address = $1
              AND event_type = 'reward_claim'
              AND event_timestamp >= $2
            GROUP BY TO_CHAR(event_timestamp, 'YYYY-MM')
            ORDER BY "month!"
        "#,
        staker_address,
        since,
    )
    .fetch_all(pool)
    .await
}

/// Daily cumulative reward row for rewards-history chart.
#[derive(Debug, FromRow)]
pub struct DailyRewardRow {
    /// Date of the rewards.
    pub reward_date: chrono::NaiveDate,
    /// Cumulative sum of rewards up to and including this date (U256 as TEXT).
    pub cumulative_amount: String,
}

/// Fetch daily cumulative `reward_claim` events for a staker over the last N days.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_daily_cumulative_rewards(
    pool: &PgPool,
    staker_address: &str,
    days: i32,
) -> Result<Vec<DailyRewardRow>, sqlx::Error> {
    sqlx::query_as!(
        DailyRewardRow,
        r#"
            SELECT
                reward_date AS "reward_date!",
                SUM(daily_total) OVER (ORDER BY reward_date)::TEXT AS "cumulative_amount!"
            FROM (
                SELECT
                    event_timestamp::DATE AS reward_date,
                    SUM(amount::NUMERIC) AS daily_total
                FROM staking_events
                WHERE staker_address = $1
                  AND event_type = 'reward_claim'
                  AND event_timestamp >= NOW() - make_interval(days => $2::INT)
                GROUP BY event_timestamp::DATE
            ) daily
            ORDER BY reward_date
        "#,
        staker_address,
        days,
    )
    .fetch_all(pool)
    .await
}
