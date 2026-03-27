//! Database queries for staking endpoints.

use chrono::{DateTime, Utc};
use sqlx::{Error, FromRow, PgPool};

/// Number of days used to extrapolate annual rewards for APY calculation.
const APY_WINDOW_DAYS: i32 = 30;

/// Raw staking position row from `staking_positions`.
#[derive(Debug, FromRow)]
pub struct StakingPositionRow {
    /// Currently staked amount (U256 as TEXT).
    pub staked_amount: String,
    /// Cumulative rewards claimed (U256 as TEXT).
    pub total_rewards_claimed: String,
    /// Last-known pending rewards from `StakerSnapshot` (U256 as TEXT).
    pub pending_rewards: String,
    /// Last-known `reward_per_token_paid` from `StakerSnapshot` (U256 as TEXT).
    pub reward_per_token_paid: String,
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
) -> Result<Option<StakingPositionRow>, Error> {
    sqlx::query_as!(
        StakingPositionRow,
        r"
            SELECT staked_amount, total_rewards_claimed, pending_rewards, reward_per_token_paid
            FROM staking_positions
            WHERE staker_address = $1
        ",
        staker_address,
    )
    .fetch_optional(pool)
    .await
}

/// Fetch the latest global `reward_per_token_stored` from the singleton state.
///
/// Returns "0" if the row is missing (should not happen after migration).
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_global_reward_per_token_stored(pool: &PgPool) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT reward_per_token_stored
            FROM staking_reward_state
            WHERE id = 1
        ",
    )
    .fetch_optional(pool)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Compute current pending rewards using SQL NUMERIC arithmetic.
///
/// Formula: `pending_rewards + (staked_amount * (global_reward_per_token - reward_per_token_paid)) / 1e18`
///
/// Uses `PostgreSQL` `::NUMERIC` for arbitrary-precision arithmetic (up to 131072 digits),
/// avoiding overflow issues with Rust's `Decimal` (28-29 digits).
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn compute_pending_rewards(
    pool: &PgPool,
    pending_rewards: &str,
    staked_amount: &str,
    global_reward_per_token: &str,
    reward_per_token_paid: &str,
) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r#"
            SELECT GREATEST(
                $1::TEXT::NUMERIC + ($2::TEXT::NUMERIC * ($3::TEXT::NUMERIC - $4::TEXT::NUMERIC))
                    / 1000000000000000000,
                0
            )::TEXT AS "result!"
        "#,
        pending_rewards,
        staked_amount,
        global_reward_per_token,
        reward_per_token_paid,
    )
    .fetch_one(pool)
    .await?;

    Ok(value)
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
pub async fn fetch_apy_data(pool: &PgPool) -> Result<ApyData, Error> {
    let rewards_per_year = sqlx::query_scalar!(
        r"
            SELECT COALESCE(
                SUM(amount::NUMERIC) * 365 / $1::INT, 0
            )::TEXT
            FROM staking_reward_deposits
            WHERE event_timestamp >= NOW() - make_interval(days => $1::INT)
        ",
        APY_WINDOW_DAYS,
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
pub async fn fetch_big_balance(pool: &PgPool, user_address: &str) -> Result<String, Error> {
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
pub async fn fetch_ico_price(pool: &PgPool) -> Result<String, Error> {
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
) -> Result<Vec<MonthlyEarningsRow>, Error> {
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
) -> Result<Vec<DailyRewardRow>, Error> {
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

/// Unbonding position data from `staking_positions`.
#[derive(Debug, FromRow)]
pub struct UnbondingPositionRow {
    /// Tokens in unbonding cooldown (U256 as TEXT).
    pub unbonding_amount: String,
    /// Timestamp when unbonding ends (None = no active unbonding).
    pub unbonding_ends_at: Option<DateTime<Utc>>,
}

/// Fetch unbonding position for a given staker.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_unbonding_position(
    pool: &PgPool,
    staker_address: &str,
) -> Result<Option<UnbondingPositionRow>, Error> {
    sqlx::query_as!(
        UnbondingPositionRow,
        r"
            SELECT unbonding_amount, unbonding_ends_at
            FROM staking_positions
            WHERE staker_address = $1
        ",
        staker_address,
    )
    .fetch_optional(pool)
    .await
}

/// A single unstake/withdraw event row from `staking_events`.
#[derive(Debug, FromRow)]
pub struct UnbondingEventRow {
    /// Event type: "unstake" or "withdraw".
    pub event_type: String,
    /// Token amount (U256 as TEXT).
    pub amount: String,
    /// Event timestamp.
    pub event_timestamp: DateTime<Utc>,
    /// Deploy hash.
    pub transaction_hash: String,
}

/// Fetch unstake/withdraw events for a staker, ordered chronologically.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_unbonding_events(
    pool: &PgPool,
    staker_address: &str,
) -> Result<Vec<UnbondingEventRow>, Error> {
    sqlx::query_as!(
        UnbondingEventRow,
        r#"
            SELECT
                event_type AS "event_type!",
                amount AS "amount!",
                event_timestamp AS "event_timestamp!",
                transaction_hash AS "transaction_hash!"
            FROM staking_events
            WHERE staker_address = $1
              AND event_type IN ('unstake', 'withdraw')
            ORDER BY event_timestamp
        "#,
        staker_address,
    )
    .fetch_all(pool)
    .await
}
