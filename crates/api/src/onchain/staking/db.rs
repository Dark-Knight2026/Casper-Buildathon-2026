//! Database queries for staking endpoints.

use chrono::{DateTime, Utc};
use sqlx::{Error, FromRow, PgExecutor, PgPool};

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
    executor: impl PgExecutor<'_>,
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
    .fetch_optional(executor)
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
pub async fn fetch_global_reward_per_token_stored(
    executor: impl PgExecutor<'_>,
) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT reward_per_token_stored
            FROM staking_reward_state
            WHERE id = 1
        ",
    )
    .fetch_optional(executor)
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
    executor: impl PgExecutor<'_>,
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
    .fetch_one(executor)
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

/// Fetch 30-day extrapolated annual rewards (U256 as TEXT).
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_rewards_per_year(executor: impl PgExecutor<'_>) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT COALESCE(
                SUM(amount::NUMERIC) * 365 / $1::INT, 0
            )::TEXT
            FROM staking_reward_deposits
            WHERE event_timestamp >= NOW() - make_interval(days => $1::INT)
        ",
        APY_WINDOW_DAYS,
    )
    .fetch_one(executor)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Fetch total staked across all stakers (U256 as TEXT).
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_total_staked(executor: impl PgExecutor<'_>) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT COALESCE(SUM(staked_amount::NUMERIC), 0)::TEXT
            FROM staking_positions
        ",
    )
    .fetch_one(executor)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

/// Fetch data needed to calculate APY: 30-day extrapolated rewards and total staked.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_apy_data(pool: &PgPool) -> Result<ApyData, Error> {
    let rewards_per_year = fetch_rewards_per_year(pool).await?;
    let total_staked = fetch_total_staked(pool).await?;
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
pub async fn fetch_big_balance(
    executor: impl PgExecutor<'_>,
    user_address: &str,
) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT balance
            FROM token_holdings
            WHERE user_address = $1 AND token_type = 'BIG'
        ",
        user_address,
    )
    .fetch_optional(executor)
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
pub async fn fetch_ico_price(executor: impl PgExecutor<'_>) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT price
            FROM ico_schedules
            WHERE start_timestamp <= EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
            ORDER BY start_timestamp DESC
            LIMIT 1
        ",
    )
    .fetch_optional(executor)
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
            LIMIT 200
        "#,
        staker_address,
    )
    .fetch_all(pool)
    .await
}

/// Fetch the sum of locked (not yet claimed) vesting tokens for an account.
///
/// Formula: `SUM(total_amount - claimed_amount)` across all vesting schedules.
/// Returns "0" if the account has no vesting schedules.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database query fails.
#[inline]
pub async fn fetch_vesting_locked_amount(
    executor: impl PgExecutor<'_>,
    beneficiary: &str,
) -> Result<String, Error> {
    let value = sqlx::query_scalar!(
        r"
            SELECT COALESCE(
                SUM(total_amount::NUMERIC - claimed_amount::NUMERIC), 0
            )::TEXT
            FROM vesting_schedules
            WHERE beneficiary = $1
        ",
        beneficiary,
    )
    .fetch_one(executor)
    .await?;

    Ok(value.unwrap_or_else(|| "0".to_owned()))
}

// Transactional snapshots -----------------------------------------------------

/// Components needed by `get_staking_info`, read under a single snapshot.
#[derive(Debug)]
pub struct StakingInfoSnapshot {
    /// Staking position for the account, if any.
    pub position: Option<StakingPositionRow>,
    /// APY calculation inputs.
    pub apy_data: ApyData,
    /// Computed pending rewards (U256 as TEXT), `None` if no position.
    pub pending_rewards_computed: Option<String>,
    /// Sum of locked vesting tokens (U256 as TEXT) - fallback when no staking position.
    pub vesting_locked: String,
}

/// Fetch all data for `get_staking_info` in a single `REPEATABLE READ` transaction.
///
/// # Errors
///
/// Returns `sqlx::Error` if any database query fails.
#[inline]
pub async fn fetch_staking_info_snapshot(
    pool: &PgPool,
    staker_address: &str,
) -> Result<StakingInfoSnapshot, Error> {
    let mut tx = pool.begin().await?;
    sqlx::query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let position = fetch_staking_position(tx.as_mut(), staker_address).await?;
    let global_rpt = fetch_global_reward_per_token_stored(tx.as_mut()).await?;
    let vesting_locked = fetch_vesting_locked_amount(tx.as_mut(), staker_address).await?;

    let pending_rewards_computed = if let Some(ref p) = position {
        Some(
            compute_pending_rewards(
                tx.as_mut(),
                &p.pending_rewards,
                &p.staked_amount,
                &global_rpt,
                &p.reward_per_token_paid,
            )
            .await?,
        )
    } else {
        None
    };

    let rewards_per_year = fetch_rewards_per_year(tx.as_mut()).await?;
    let total_staked = fetch_total_staked(tx.as_mut()).await?;

    tx.commit().await?;

    Ok(StakingInfoSnapshot {
        position,
        apy_data: ApyData {
            rewards_per_year,
            total_staked,
        },
        pending_rewards_computed,
        vesting_locked,
    })
}

/// Components needed by `get_portfolio`, read under a single snapshot.
#[derive(Debug)]
pub struct PortfolioSnapshot {
    /// Staking position for the account, if any.
    pub position: Option<StakingPositionRow>,
    /// BIG wallet balance (U256 as TEXT).
    pub big_balance: String,
    /// Latest ICO price (U256 as TEXT, 6 decimals).
    pub ico_price: String,
    /// Computed pending rewards (U256 as TEXT), `None` if no position.
    pub pending_rewards_computed: Option<String>,
    /// Sum of locked vesting tokens (U256 as TEXT) - fallback when no staking position.
    pub vesting_locked: String,
}

/// Fetch all data for `get_portfolio` in a single `REPEATABLE READ` transaction.
///
/// # Errors
///
/// Returns `sqlx::Error` if any database query fails.
#[inline]
pub async fn fetch_portfolio_snapshot(
    pool: &PgPool,
    staker_address: &str,
) -> Result<PortfolioSnapshot, Error> {
    let mut tx = pool.begin().await?;
    sqlx::query!("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let big_balance = fetch_big_balance(tx.as_mut(), staker_address).await?;
    let position = fetch_staking_position(tx.as_mut(), staker_address).await?;
    let ico_price = fetch_ico_price(tx.as_mut()).await?;
    let global_rpt = fetch_global_reward_per_token_stored(tx.as_mut()).await?;
    let vesting_locked = fetch_vesting_locked_amount(tx.as_mut(), staker_address).await?;

    let pending_rewards_computed = if let Some(ref p) = position {
        Some(
            compute_pending_rewards(
                tx.as_mut(),
                &p.pending_rewards,
                &p.staked_amount,
                &global_rpt,
                &p.reward_per_token_paid,
            )
            .await?,
        )
    } else {
        None
    };

    tx.commit().await?;

    Ok(PortfolioSnapshot {
        position,
        big_balance,
        ico_price,
        pending_rewards_computed,
        vesting_locked,
    })
}
