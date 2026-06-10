//! Database access layer for event processing.
//!
//! Contains all SQL queries used by the event handlers ([`crate::events`])
//! and the event processor ([`crate::processor`]).
//!
//! ## Sections
//!
//! - **Events** — raw event storage (`blockchain_events`).
//! - **Transactions** — generic blockchain transaction log (`blockchain_transactions`).
//! - **Token holdings** — current CEP-18 balances per user (`token_holdings`).
//! - **ICO** — detailed ICO purchase log (`ico_purchases`).
//! - **Vesting** — vesting schedule tracking (`vesting_schedules`).
//! - **Staking** — staking positions, events and reward deposits.

use std::collections::HashSet;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, PgTransaction};

use crate::{
    config::{ContractRegistry, ContractType},
    error::{IndexerError, IndexerResult},
};

// Address type ----------------------------------------------------------------

/// Address type discriminant for `blockchain_transactions.from_type` / `to_type`.
///
/// Matches the CSPR.cloud `/ft-token-actions` convention:
/// - `0` = regular user account
/// - `1` = smart contract
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "u8", into = "u8")]
pub enum HashType {
    /// Regular user account hash.
    Account,
    /// Smart contract hash.
    Contract,
    /// Unrecognised address type discriminant.
    Unknown(u8),
}

impl From<u8> for HashType {
    #[inline]
    fn from(value: u8) -> Self {
        match value {
            0 => Self::Account,
            1 => Self::Contract,
            other => Self::Unknown(other),
        }
    }
}

impl From<HashType> for u8 {
    #[inline]
    fn from(value: HashType) -> Self {
        match value {
            HashType::Account => 0,
            HashType::Contract => 1,
            HashType::Unknown(v) => v,
        }
    }
}

impl HashType {
    /// Returns the string label for this address type.
    #[inline]
    #[must_use]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Account => "account",
            Self::Contract => "contract",
            Self::Unknown(_) => "unknown",
        }
    }

    /// Convert to `Option<i16>` for storage in `blockchain_transactions`.
    #[inline]
    #[must_use]
    pub fn to_db(self) -> Option<i16> {
        Some(i16::from(u8::from(self)))
    }

    /// Determine address type from an API-provided value, or fall back to
    /// checking if the address is a known contract.
    ///
    /// `api_type` is preferred when present (e.g. from CSPR.cloud
    /// `from_type`/`to_type`). The `known_contracts` fallback uses package
    /// hashes which live in a different hash domain than the normalized
    /// account hashes passed as `address`, so it is best-effort only.
    #[inline]
    #[must_use]
    pub fn lookup(address: &str, known_contracts: &HashSet<String>, api_type: Option<u8>) -> Self {
        if let Some(t) = api_type {
            return Self::from(t);
        }
        if known_contracts.contains(address) {
            Self::Contract
        } else {
            Self::Account
        }
    }
}

// Contract registry -----------------------------------------------------------

/// Populate the `contract_registry` table with all active contracts from config.
///
/// Runs inside a single transaction:
/// 1. Mark all existing rows as inactive.
/// 2. Upsert each configured contract, setting `is_active = TRUE`.
///
/// Contracts removed from the config will remain in the table with
/// `is_active = FALSE`, preserving historical data while reflecting the
/// current deployment state.
///
/// Called once at indexer startup before backfill and streaming begin.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn upsert_contract_registry(
    pool: &PgPool,
    contracts: &ContractRegistry,
) -> IndexerResult<()> {
    let mut tx = pool.begin().await?;

    // Deactivate only the contract types managed by this instance;
    // foreign types (from other environments on a shared DB) stay untouched.
    let active = contracts.active_contracts();
    let types = active
        .iter()
        .map(|c| c.contract_type.as_str().to_owned())
        .collect::<Vec<_>>();
    sqlx::query!(
        "UPDATE contract_registry SET is_active = FALSE WHERE contract_type = ANY($1)",
        &types,
    )
    .execute(tx.as_mut())
    .await?;

    for contract in &active {
        sqlx::query!(
            r"
                INSERT INTO contract_registry (contract_type, contract_hash, is_active)
                VALUES ($1, $2, TRUE)
                ON CONFLICT (contract_type) DO UPDATE SET
                    contract_hash = EXCLUDED.contract_hash,
                    is_active     = TRUE
            ",
            contract.contract_type.as_str(),
            contract.hash,
        )
        .execute(tx.as_mut())
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

// Events ----------------------------------------------------------------------

/// Data required to insert a row into `blockchain_events`.
#[derive(Debug)]
pub struct NewBlockchainEvent<'a> {
    /// CES event name (e.g. `"TokensPurchased"`).
    pub event_type: &'a str,
    /// Contract package hash that emitted the event.
    pub contract_address: &'a str,
    /// Deploy hash of the transaction containing this event.
    pub transaction_hash: &'a str,
    /// Block height where the event was included.
    pub block_number: i64,
    /// Raw event payload as JSON.
    pub event_data: &'a serde_json::Value,
    /// Transform index within the deploy. `None` when unavailable.
    pub transform_idx: Option<i32>,
}

/// Insert a raw event into `blockchain_events` (idempotent).
///
/// Returns `true` if the row was actually inserted (new event), `false` if it
/// already existed (duplicate — `ON CONFLICT DO NOTHING`).
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn insert_blockchain_event(
    tx: &mut PgTransaction<'_>,
    row: NewBlockchainEvent<'_>,
) -> IndexerResult<bool> {
    let result = sqlx::query!(
        r"
            INSERT INTO blockchain_events (event_type, contract_address, transaction_hash, block_number, event_data, transform_idx)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (transaction_hash, event_type, contract_address, COALESCE(transform_idx, -1)) DO NOTHING
            RETURNING id
        ",
        row.event_type,
        row.contract_address,
        row.transaction_hash,
        row.block_number,
        row.event_data,
        row.transform_idx,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    Ok(result.is_some())
}

/// Mark an event as processed in `blockchain_events`.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn mark_event_processed(
    tx: &mut PgTransaction<'_>,
    transaction_hash: &str,
    event_type: &str,
    contract_address: &str,
    transform_idx: Option<i32>,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            UPDATE blockchain_events
            SET    processed    = TRUE,
                   processed_at = NOW()
            WHERE  transaction_hash = $1
              AND  event_type       = $2
              AND  contract_address = $3
              AND  COALESCE(transform_idx, -1) = COALESCE($4, -1)
        ",
        transaction_hash,
        event_type,
        contract_address,
        transform_idx,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

// Blockchain transactions -----------------------------------------------------

/// Data required to insert a row into `blockchain_transactions`.
#[derive(Debug)]
pub struct NewBlockchainTx<'a> {
    /// Deploy hash (used as both `transaction_hash` and `deploy_hash`).
    pub deploy_hash: &'a str,
    /// Block height of the deployment.
    pub block_number: i64,
    /// Transaction type label (e.g. `"token_purchase"`, `"token_transfer"`).
    pub transaction_type: &'a str,
    /// Casper public key of the caller.
    pub from_address: &'a str,
    /// Recipient address (account or contract hash).
    pub to_address: Option<&'a str>,
    /// Amount involved (U256 as string), if applicable.
    pub amount: Option<&'a str>,
    /// Currency label, if applicable.
    pub currency: Option<&'a str>,
    /// Contract package hash that emitted this event.
    pub contract_hash: Option<&'a str>,
    /// Block timestamp from the blockchain.
    pub block_timestamp: Option<DateTime<Utc>>,
    /// Address type of the sender (0=Account, 1=Contract).
    pub from_type: Option<i16>,
    /// Address type of the recipient (0=Account, 1=Contract).
    pub to_type: Option<i16>,
    /// Transform index within the deploy.
    pub transform_idx: Option<i32>,
    /// Full event payload for the `metadata` JSONB column.
    pub metadata: &'a serde_json::Value,
}

/// Insert or backfill a row into `blockchain_transactions`.
///
/// Uses an expression-based unique index on
/// `(transaction_hash, transaction_type, from_address, COALESCE(transform_idx, -1))`
/// so that multiple events of the same type from the same sender within a
/// single deploy are correctly distinguished by their transform index.
///
/// On conflict the `DO UPDATE SET ... COALESCE` clause fills in columns that
/// were `NULL` in pre-existing rows (e.g. rows inserted before the
/// `to_address`, `contract_hash`, `block_timestamp`, `from_type`, `to_type`,
/// `transform_idx` columns were added), making re-indexing safe.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn insert_blockchain_transaction(
    tx: &mut PgTransaction<'_>,
    row: &NewBlockchainTx<'_>,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO blockchain_transactions ( transaction_hash, deploy_hash, block_number, transaction_type, from_address, to_address, amount, currency, contract_hash, block_timestamp, from_type, to_type, transform_idx, status, metadata, confirmed_at )
            VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'confirmed', $13, NOW())
            ON CONFLICT (transaction_hash, transaction_type, from_address, COALESCE(transform_idx, -1))
            DO UPDATE SET
                to_address      = COALESCE(blockchain_transactions.to_address,      EXCLUDED.to_address),
                contract_hash   = COALESCE(blockchain_transactions.contract_hash,    EXCLUDED.contract_hash),
                block_timestamp = COALESCE(blockchain_transactions.block_timestamp,  EXCLUDED.block_timestamp),
                from_type       = COALESCE(blockchain_transactions.from_type,        EXCLUDED.from_type),
                to_type         = COALESCE(blockchain_transactions.to_type,          EXCLUDED.to_type),
                transform_idx   = COALESCE(blockchain_transactions.transform_idx,    EXCLUDED.transform_idx)
        ",
        row.deploy_hash,
        row.block_number,
        row.transaction_type,
        row.from_address,
        row.to_address,
        row.amount,
        row.currency,
        row.contract_hash,
        row.block_timestamp,
        row.from_type,
        row.to_type,
        row.transform_idx,
        row.metadata,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

// Token holdings --------------------------------------------------------------

/// Direction and amount of a token balance change.
#[derive(Debug, Clone, Copy)]
pub enum BalanceUpdate<'a> {
    /// Add `amount` to the current balance (e.g. incoming transfer, purchase).
    Increase(&'a str),
    /// Subtract `amount` from the current balance (e.g. outgoing transfer).
    Decrease(&'a str),
}

/// Update a user's token balance in `token_holdings` (UPSERT).
///
/// The arithmetic is performed by `PostgreSQL` via `::NUMERIC` so arbitrarily
/// large U256 strings are handled correctly.
///
/// If no row exists yet:
/// - `Increase` creates the record with `balance = amount`.
/// - `Decrease` creates the record with `balance = '0'` (avoids negatives on
///   the first-seen event during backfill).
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// if `amount` is not a valid decimal string or if the SQL fails.
#[inline]
pub async fn update_token_balance(
    tx: &mut PgTransaction<'_>,
    user_address: &str,
    token_type: ContractType,
    update: BalanceUpdate<'_>,
) -> IndexerResult<()> {
    let token_name = match token_type {
        ContractType::Big => "BIG",
        ContractType::Usdc => "USDC",
        ContractType::Usdt => "USDT",
        _ => {
            tracing::warn!(
                contract_type = ?token_type,
                %user_address,
                "update_token_balance called for non-CEP18 contract — skipping"
            );
            return Ok(());
        }
    };

    match update {
        BalanceUpdate::Decrease(amount) => {
            sqlx::query!(
                r"
                    INSERT INTO token_holdings as th (user_address, token_type, balance, last_updated_at)
                    VALUES ($1, $2, '0', NOW())
                    ON CONFLICT (user_address, token_type) DO UPDATE SET
                        balance         = GREATEST('0'::NUMERIC, th.balance::NUMERIC - $3::TEXT::NUMERIC)::TEXT,
                        last_updated_at = NOW()
                ",
                user_address,
                token_name,
                amount,
            )
            .execute(tx.as_mut())
            .await?;
        }
        BalanceUpdate::Increase(amount) => {
            sqlx::query!(
                r"
                    INSERT INTO token_holdings as th (user_address, token_type, balance, last_updated_at)
                    VALUES ($1, $2, $3, NOW())
                    ON CONFLICT (user_address, token_type) DO UPDATE SET
                        balance         = (th.balance::NUMERIC + $3::TEXT::NUMERIC)::TEXT,
                        last_updated_at = NOW()
                ",
                user_address,
                token_name,
                amount,
            )
            .execute(tx.as_mut())
            .await?;
        }
    }

    Ok(())
}

// ICO purchases ---------------------------------------------------------------

/// Data required to insert a row into `ico_purchases`.
#[derive(Debug)]
pub struct NewIcoPurchase<'a> {
    /// Deploy hash that emitted the `TokensPurchased` event.
    pub transaction_hash: &'a str,
    /// Block height of the deployment.
    pub block_height: i64,
    /// Casper public key of the buyer.
    pub buyer_address: &'a str,
    /// Number of BIG tokens purchased (U256 as string).
    pub amount: &'a str,
    /// Payment currency label (`"CSPR"`, `"USDC"`, `"USDT"`).
    pub currency: &'a str,
    /// Token price at the time of purchase (U256 as string).
    /// `None` when reconstructed via backfill (price unavailable from node RPC).
    pub price: Option<&'a str>,
    /// Total cost paid by the buyer (U256 as string).
    pub cost: &'a str,
    /// Block timestamp (epoch seconds).
    pub event_timestamp: i64,
    /// Intra-deploy event index (distinguishes multiple events per deploy).
    pub transform_idx: Option<i32>,
}

/// Insert a row into `ico_purchases` for a `TokensPurchased` event.
///
/// Uses `ON CONFLICT DO NOTHING` so re-processing the same deploy is safe.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn insert_ico_purchase(
    tx: &mut PgTransaction<'_>,
    row: &NewIcoPurchase<'_>,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO ico_purchases (transaction_hash, block_height, buyer_address, amount, currency, price, cost, event_timestamp, transform_idx)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (transaction_hash, COALESCE(transform_idx, -1)) DO NOTHING
        ",
        row.transaction_hash,
        row.block_height,
        row.buyer_address,
        row.amount,
        row.currency,
        row.price,
        row.cost,
        row.event_timestamp,
        row.transform_idx,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

// ICO schedules ---------------------------------------------------------------

/// Data required to insert a row into `ico_schedules`.
#[derive(Debug)]
pub struct NewIcoSchedule<'a> {
    /// Schedule ID from the contract.
    pub schedule_id: &'a str,
    /// Unix timestamp: sale window start.
    pub start_timestamp: i64,
    /// Unix timestamp: sale window end.
    pub end_timestamp: i64,
    /// Total allocation for this round (U256 as string).
    pub sale_amount: &'a str,
    /// Token price (U256 as string, 6 decimals).
    pub price: &'a str,
    /// Deploy hash that emitted the event.
    pub transaction_hash: &'a str,
    /// Block height of the deployment.
    pub block_height: i64,
}

/// Upsert a row into `ico_schedules` for an `ICOScheduleAdded` event.
///
/// Uses `ON CONFLICT (schedule_id) DO UPDATE` so re-indexing is safe and
/// schedule updates from the contract are reflected.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn upsert_ico_schedule(
    tx: &mut PgTransaction<'_>,
    row: &NewIcoSchedule<'_>,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO ico_schedules (schedule_id, start_timestamp, end_timestamp, sale_amount, price, transaction_hash, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (schedule_id) DO UPDATE SET
                start_timestamp  = EXCLUDED.start_timestamp,
                end_timestamp    = EXCLUDED.end_timestamp,
                sale_amount      = EXCLUDED.sale_amount,
                price            = EXCLUDED.price,
                transaction_hash = EXCLUDED.transaction_hash,
                block_height     = EXCLUDED.block_height,
                updated_at       = NOW()
            WHERE ico_schedules.block_height <= EXCLUDED.block_height
        ",
        row.schedule_id,
        row.start_timestamp,
        row.end_timestamp,
        row.sale_amount,
        row.price,
        row.transaction_hash,
        row.block_height,
    )
      .execute(tx.as_mut())
      .await
      .map(|r| {
          if r.rows_affected() == 0 {
              tracing::warn!(
                  schedule_id = row.schedule_id,
                  block_height = row.block_height,
                  "upsert_ico_schedule no-op: older block_height"
              );
          }
      })?;

    Ok(())
}

// Vesting schedules -----------------------------------------------------------

/// Data required to insert a row into `vesting_schedules`.
#[derive(Debug)]
pub struct NewVestingSchedule<'a> {
    /// Vesting schedule ID from the contract (U256 as string).
    pub vesting_id: &'a str,
    /// Account hash of the beneficiary (64 hex, no prefix).
    pub beneficiary: &'a str,
    /// Account hash of the whitelisted creator (e.g. ICO contract).
    pub whitelisted_creator: &'a str,
    /// Total number of tokens locked (U256 as string).
    pub total_amount: &'a str,
    /// Block timestamp when the vesting clock starts (epoch ms).
    pub start_timestamp: i64,
    /// Duration before any tokens become claimable (ms).
    pub cliff_duration: i64,
    /// Total duration from start to full vesting (ms).
    pub vesting_duration: i64,
    /// Deploy hash that emitted the event.
    pub transaction_hash: &'a str,
    /// Block height where the event was included.
    pub block_height: i64,
}

/// Upsert a row into `vesting_schedules` for a `ScheduleCreated` event.
///
/// Uses `ON CONFLICT (vesting_id) DO UPDATE` so re-indexing is safe.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn upsert_vesting_schedule(
    tx: &mut PgTransaction<'_>,
    row: &NewVestingSchedule<'_>,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO vesting_schedules (vesting_id, beneficiary, whitelisted_creator, total_amount, start_timestamp, cliff_duration, vesting_duration, transaction_hash, block_height)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (vesting_id) DO UPDATE SET
                beneficiary         = EXCLUDED.beneficiary,
                whitelisted_creator = EXCLUDED.whitelisted_creator,
                total_amount        = EXCLUDED.total_amount,
                start_timestamp     = EXCLUDED.start_timestamp,
                cliff_duration      = EXCLUDED.cliff_duration,
                vesting_duration    = EXCLUDED.vesting_duration,
                transaction_hash    = EXCLUDED.transaction_hash,
                block_height        = EXCLUDED.block_height,
                updated_at          = NOW()
            WHERE vesting_schedules.block_height <= EXCLUDED.block_height
        ",
        row.vesting_id,
        row.beneficiary,
        row.whitelisted_creator,
        row.total_amount,
        row.start_timestamp,
        row.cliff_duration,
        row.vesting_duration,
        row.transaction_hash,
        row.block_height,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

/// Increase `claimed_amount` on a vesting schedule after a `TokensClaimed` event.
///
/// Uses `::NUMERIC` arithmetic so U256-scale values are handled correctly.
/// Idempotency is guaranteed at the processor level: `insert_blockchain_event`
/// deduplicates by `(transaction_hash, event_type, contract_address)` and
/// short-circuits before the handler is called on replay.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn update_vesting_claimed(
    tx: &mut PgTransaction<'_>,
    vesting_id: &str,
    amount: &str,
) -> IndexerResult<()> {
    let result = sqlx::query!(
        r"
            UPDATE vesting_schedules
            SET claimed_amount = (claimed_amount::NUMERIC + $2::TEXT::NUMERIC)::TEXT,
                updated_at     = NOW()
            WHERE vesting_id = $1
        ",
        vesting_id,
        amount,
    )
    .execute(tx.as_mut())
    .await?;

    if result.rows_affected() == 0 {
        tracing::warn!(vesting_id, "update_vesting_claimed: vesting_id not found");
    }

    Ok(())
}

/// Check whether a `TokensClaimed` event has already been recorded in
/// `blockchain_transactions`. Used as an idempotency guard to prevent
/// double-counting `claimed_amount` on replays or backfills.
///
/// The check includes `transform_idx` so that batch deploys emitting
/// `TokensClaimed` for multiple vesting schedules are distinguished
/// correctly (matching the `blockchain_transactions` conflict target).
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn is_vesting_claim_processed(
    tx: &mut PgTransaction<'_>,
    deploy_hash: &str,
    transform_idx: Option<i32>,
) -> IndexerResult<bool> {
    let exists: bool = sqlx::query_scalar!(
        r"
            SELECT EXISTS(
                SELECT 1 FROM blockchain_transactions
                WHERE transaction_hash = $1
                  AND transaction_type = 'vesting_tokens_claimed'
                  AND COALESCE(transform_idx, -1) = COALESCE($2, -1)
        )",
        deploy_hash,
        transform_idx,
    )
    .fetch_one(tx.as_mut())
    .await?
    .unwrap_or(false);

    Ok(exists)
}

// Staking positions -----------------------------------------------------------

/// Data required to insert a staking event into `staking_events`.
#[derive(Debug)]
pub struct NewStakingEvent<'a> {
    /// Account hash of the staker (64 hex, no prefix).
    pub staker_address: &'a str,
    /// Event kind: `"stake"`, `"unstake"`, `"withdraw"`, `"reward_claim"`.
    pub event_type: &'a str,
    /// Token amount involved (U256 as string).
    pub amount: &'a str,
    /// Deploy hash that emitted the event.
    pub transaction_hash: &'a str,
    /// Block height where the event was included.
    pub block_height: i64,
    /// Block timestamp of the event.
    pub event_timestamp: DateTime<Utc>,
    /// Transform index within the deploy (distinguishes batch events).
    pub transform_idx: Option<i32>,
}

/// Insert a row into `staking_events` (append-only log).
///
/// Returns `true` if a new row was inserted, `false` if the event was already
/// recorded (duplicate `transaction_hash`). Callers should skip arithmetic
/// position mutations when this returns `false` to stay idempotent.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn insert_staking_event(
    tx: &mut PgTransaction<'_>,
    row: &NewStakingEvent<'_>,
) -> IndexerResult<bool> {
    let result = sqlx::query!(
        r"
            INSERT INTO staking_events (staker_address, event_type, amount, transaction_hash, block_height, event_timestamp, transform_idx)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (transaction_hash, event_type, COALESCE(transform_idx, -1)) DO NOTHING
        ",
        row.staker_address,
        row.event_type,
        row.amount,
        row.transaction_hash,
        row.block_height,
        row.event_timestamp,
        row.transform_idx,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(result.rows_affected() > 0)
}

/// UPSERT `staking_positions` for a `Staked` event: increase `staked_amount`.
///
/// Creates the row if the staker has never staked before.
/// Uses `::NUMERIC` arithmetic for U256-safe addition.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn upsert_staking_position_stake(
    tx: &mut PgTransaction<'_>,
    staker_address: &str,
    amount: &str,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO staking_positions (staker_address, staked_amount, last_updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (staker_address) DO UPDATE SET
                staked_amount   = (staking_positions.staked_amount::NUMERIC + $2::TEXT::NUMERIC)::TEXT,
                last_updated_at = NOW()
        ",
        staker_address,
        amount,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

/// UPSERT `staking_positions` for an `UnstakedInitiated` event: decrease
/// `staked_amount`, set `unbonding_amount` and `unbonding_ends_at`.
///
/// Creates the position row if it doesn't exist yet (out-of-order events
/// during backfill or indexer restart), ensuring the unstake delta is never
/// silently lost.
///
/// Defends against contract-level over-unstake: if `amount` exceeds the
/// pre-update `staked_amount`, the unbonding delta is clamped to the
/// available balance (via `LEAST`) so tokens that were never staked cannot
/// enter the unbonding queue, and a warning is logged for operator visibility.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn update_staking_position_unstake(
    tx: &mut PgTransaction<'_>,
    staker_address: &str,
    amount: &str,
    unbonding_ends_at: Option<DateTime<Utc>>,
) -> IndexerResult<()> {
    let result = sqlx::query!(
        r"
            INSERT INTO staking_positions (staker_address, staked_amount, unbonding_amount, unbonding_ends_at, last_updated_at)
            VALUES ($1, '0', $2, $3, NOW())
            ON CONFLICT (staker_address) DO UPDATE SET
                staked_amount     = GREATEST(
                                        '0'::NUMERIC,
                                        staking_positions.staked_amount::NUMERIC - $2::TEXT::NUMERIC
                                    )::TEXT,
                unbonding_amount  = (
                                        staking_positions.unbonding_amount::NUMERIC
                                        + LEAST($2::TEXT::NUMERIC, staking_positions.staked_amount::NUMERIC)
                                    )::TEXT,
                unbonding_ends_at = $3,
                last_updated_at   = NOW()
            RETURNING (xmax = 0) AS inserted
        ",
        staker_address,
        amount,
        unbonding_ends_at,
    )
    .fetch_one(tx.as_mut())
    .await?;

    if result.inserted.unwrap_or(false) {
        tracing::warn!(
            staker = staker_address,
            amount,
            "unstake upsert created new position - event arrived before Staked"
        );
    }

    Ok(())
}

/// UPSERT `staking_positions` for an `UnbondedWithdrawn` event: clear
/// unbonding state.
///
/// Creates the position row if it doesn't exist yet (out-of-order events),
/// ensuring the staker has a row for subsequent events.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn update_staking_position_withdraw(
    tx: &mut PgTransaction<'_>,
    staker_address: &str,
) -> IndexerResult<()> {
    let result = sqlx::query!(
        r"
            INSERT INTO staking_positions (staker_address, last_updated_at)
            VALUES ($1, NOW())
            ON CONFLICT (staker_address) DO UPDATE SET
                unbonding_amount  = '0',
                unbonding_ends_at = NULL,
                last_updated_at   = NOW()
            RETURNING (xmax = 0) AS inserted
        ",
        staker_address,
    )
    .fetch_one(tx.as_mut())
    .await?;

    if result.inserted.unwrap_or(false) {
        tracing::warn!(
            staker = staker_address,
            "withdraw upsert created new position - event arrived before Staked"
        );
    }

    Ok(())
}

/// UPSERT `staking_positions` for a `RewardsClaimed` event: increase
/// `total_rewards_claimed`.
///
/// Creates the position row if it doesn't exist yet (out-of-order events),
/// ensuring the reward amount is never silently lost.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn update_staking_position_rewards(
    tx: &mut PgTransaction<'_>,
    staker_address: &str,
    amount: &str,
) -> IndexerResult<()> {
    let result = sqlx::query!(
        r"
            INSERT INTO staking_positions (staker_address, total_rewards_claimed, last_updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (staker_address) DO UPDATE SET
                total_rewards_claimed = (staking_positions.total_rewards_claimed::NUMERIC + $2::TEXT::NUMERIC)::TEXT,
                last_updated_at       = NOW()
            RETURNING (xmax = 0) AS inserted
        ",
        staker_address,
        amount,
    )
    .fetch_one(tx.as_mut())
    .await?;

    if result.inserted.unwrap_or(false) {
        tracing::warn!(
            staker = staker_address,
            amount,
            "rewards upsert created new position - event arrived before Staked"
        );
    }

    Ok(())
}

// Staking reward deposits -----------------------------------------------------

/// Data required to insert a row into `staking_reward_deposits`.
#[derive(Debug)]
pub struct NewStakingRewardDeposit<'a> {
    /// Account hash of the caller who deposited rewards.
    pub caller_address: &'a str,
    /// Deposited amount (U256 as string).
    pub amount: &'a str,
    /// Global `reward_per_token_stored` snapshot at deposit time (U256 as string).
    pub reward_per_token_stored: &'a str,
    /// Deploy hash that emitted the event.
    pub transaction_hash: &'a str,
    /// Block height where the event was included.
    pub block_height: i64,
    /// Block timestamp of the event.
    pub event_timestamp: DateTime<Utc>,
    /// Transform index within the deploy (distinguishes batch events).
    pub transform_idx: Option<i32>,
}

/// Insert a row into `staking_reward_deposits` for a `RewardsDeposited` event.
///
/// Uses `ON CONFLICT DO NOTHING` on `(transaction_hash, COALESCE(transform_idx, -1))`
/// so re-processing is safe while batch deploys with multiple events are recorded.
/// Returns `true` when a new row was inserted, `false` on duplicate. Callers
/// should skip global state mutations when this returns `false`.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn insert_staking_reward_deposit(
    tx: &mut PgTransaction<'_>,
    row: &NewStakingRewardDeposit<'_>,
) -> IndexerResult<bool> {
    let result = sqlx::query!(
        r"
            INSERT INTO staking_reward_deposits (caller_address, amount, reward_per_token_stored, transaction_hash, block_height, event_timestamp, transform_idx)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (transaction_hash, COALESCE(transform_idx, -1)) DO NOTHING
        ",
        row.caller_address,
        row.amount,
        row.reward_per_token_stored,
        row.transaction_hash,
        row.block_height,
        row.event_timestamp,
        row.transform_idx,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(result.rows_affected() > 0)
}

// Global reward state ---------------------------------------------------------

/// Update the singleton `staking_reward_state` row with the latest
/// `reward_per_token_stored` from a `RewardsDeposited` event.
///
/// The monotonicity guard (`reward_per_token_stored < $1`) ensures
/// out-of-order events cannot regress the accumulator.  If the
/// singleton row is missing the function returns an error - this
/// indicates a broken migration.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures, or [`IndexerError::Startup`](IndexerError::Startup)
/// if the singleton row does not exist.
#[inline]
pub async fn update_global_reward_state(
    tx: &mut PgTransaction<'_>,
    reward_per_token_stored: &str,
) -> IndexerResult<()> {
    let result = sqlx::query!(
        r"
            UPDATE staking_reward_state
            SET reward_per_token_stored = $1, last_updated_at = NOW()
            WHERE id = 1
              AND reward_per_token_stored::NUMERIC < ($1::TEXT)::NUMERIC
        ",
        reward_per_token_stored,
    )
    .execute(tx.as_mut())
    .await?;

    if result.rows_affected() == 0 {
        // Distinguish "singleton missing" from "monotonicity skip".
        let exists =
            sqlx::query_scalar!("SELECT EXISTS(SELECT 1 FROM staking_reward_state WHERE id = 1)")
                .fetch_one(tx.as_mut())
                .await?;

        if exists == Some(false) {
            return Err(IndexerError::Startup(
                "staking_reward_state singleton row (id=1) is missing - check migrations".into(),
            ));
        }

        tracing::debug!(
            reward_per_token_stored,
            "update_global_reward_state: skipped - current value >= new value (monotonicity guard)"
        );
    }

    Ok(())
}

// Staker reward snapshot ------------------------------------------------------

/// Update per-user reward tracking columns from a `StakerSnapshot` event.
///
/// Overwrites `pending_rewards` and `reward_per_token_paid` on the existing
/// `staking_positions` row. The position row must already exist (created by
/// the `Staked` event that fires before the snapshot).
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn update_staker_reward_snapshot(
    tx: &mut PgTransaction<'_>,
    staker_address: &str,
    pending_rewards: &str,
    reward_per_token_paid: &str,
    block_height: i64,
) -> IndexerResult<u64> {
    let result = sqlx::query!(
        r"
            UPDATE staking_positions
            SET pending_rewards = $2,
                reward_per_token_paid = $3,
                snapshot_block_height = $4,
                last_updated_at = NOW()
            WHERE staker_address = $1
              AND (snapshot_block_height IS NULL OR snapshot_block_height <= $4)
        ",
        staker_address,
        pending_rewards,
        reward_per_token_paid,
        block_height,
    )
    .execute(tx.as_mut())
    .await?;

    let rows = result.rows_affected();
    if rows == 0 {
        tracing::warn!(
            staker = %staker_address,
            block_height = block_height,
            "StakerSnapshot: skipped - no row or monotonicity guard"
        );
    }

    Ok(rows)
}

// Users (on-chain reconciliation) ---------------------------------------------

/// Stamps the on-chain id on the user whose cached `account_hash` matches,
/// the fast path for `UserCreated` reconciliation.
///
/// `account_hash` is indexed (`users_account_hash_unique`), so this is a direct
/// lookup rather than the previous scan-and-derive over every unregistered
/// wallet. Only fills an as-yet-unset id (`onchain_user_id IS NULL`), so
/// re-processing the same event or a concurrent writer is a no-op.
///
/// Returns `true` when a row was updated, `false` when no account caches this
/// hash yet (un-backfilled legacy row, or the wallet simply is not linked) -
/// the caller then tries [`fetch_legacy_unregistered_wallets`].
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database) on SQL failures.
#[inline]
pub async fn set_user_onchain_id_by_account_hash(
    tx: &mut PgTransaction<'_>,
    account_hash: &str,
    onchain_user_id: &str,
) -> IndexerResult<bool> {
    let result = sqlx::query!(
        r"
            UPDATE users
            SET onchain_user_id = $1::TEXT::NUMERIC,
                onchain_status = 'active'
            WHERE account_hash = $2
              AND onchain_user_id IS NULL
        ",
        onchain_user_id,
        account_hash,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(result.rows_affected() > 0)
}

/// Loads the linked wallets of un-registered users whose `account_hash` cache
/// is not yet populated - the fallback set for `UserCreated` reconciliation.
///
/// This is the narrow remainder the indexed
/// [`set_user_onchain_id_by_account_hash`] cannot reach: rows linked before the
/// `account_hash` column existed keep it `NULL`. Returned values are
/// `users.wallet_address` verbatim (Casper public keys, 66/68 hex); the caller
/// derives each wallet's account hash in Rust, compares, and writes back via
/// [`set_user_onchain_id`] keyed on the same verbatim string. The set shrinks to
/// empty as those users re-link (the insert path now caches the hash), and new
/// links never land here.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database) on SQL failures.
#[inline]
pub async fn fetch_legacy_unregistered_wallets(
    tx: &mut PgTransaction<'_>,
) -> IndexerResult<Vec<String>> {
    let rows = sqlx::query!(
        r"
            SELECT wallet_address
            FROM users
            WHERE onchain_user_id IS NULL
              AND wallet_address IS NOT NULL
              AND account_hash IS NULL
        ",
    )
    .fetch_all(tx.as_mut())
    .await?;

    Ok(rows
        .into_iter()
        .filter_map(|row| row.wallet_address)
        .collect())
}

/// Records the contract-assigned on-chain id on the user with this exact
/// `wallet_address` (the verbatim public key returned by
/// [`fetch_legacy_unregistered_wallets`]) - the legacy fallback path.
///
/// Only fills an as-yet-unset id, so re-processing the same event (or a race
/// with a concurrent writer) is a no-op. The `$1::TEXT::NUMERIC` cast binds the
/// U256 decimal string straight into the `NUMERIC` column without pulling in a
/// decimal type.
///
/// Returns `true` when the row was updated, `false` when the id was already set.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database) on SQL failures.
#[inline]
pub async fn set_user_onchain_id(
    tx: &mut PgTransaction<'_>,
    wallet_address: &str,
    onchain_user_id: &str,
) -> IndexerResult<bool> {
    let result = sqlx::query!(
        r"
            UPDATE users
            SET onchain_user_id = $1::TEXT::NUMERIC,
                onchain_status = 'active'
            WHERE wallet_address = $2
              AND onchain_user_id IS NULL
        ",
        onchain_user_id,
        wallet_address,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(result.rows_affected() > 0)
}
