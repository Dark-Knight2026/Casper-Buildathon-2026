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

use std::collections::HashSet;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, PgTransaction};

use crate::{
    config::{ContractRegistry, ContractType},
    error::IndexerResult,
};

// -----------------------------------------------------------------------------
// Address type
// -----------------------------------------------------------------------------

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

    /// Determine address type by checking if the address is a known contract.
    #[inline]
    #[must_use]
    pub fn lookup(address: &str, known_contracts: &HashSet<String>) -> Self {
        if known_contracts.contains(address) {
            Self::Contract
        } else {
            Self::Account
        }
    }
}

// -----------------------------------------------------------------------------
// Contract registry
// -----------------------------------------------------------------------------

/// Populate the `contract_registry` table with all active contracts from config.
///
/// Uses `ON CONFLICT (contract_type) DO UPDATE` so that hash changes (e.g. a
/// redeployment) are reflected without manual DB intervention.
///
/// Called once at indexer startup before backfill and streaming begin.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn upsert_contract_registry(
    pool: &PgPool,
    contracts: &ContractRegistry,
) -> IndexerResult<()> {
    for contract in contracts.active_contracts() {
        sqlx::query!(
            r"
                INSERT INTO contract_registry (contract_type, contract_hash, contract_name, is_active)
                VALUES ($1, $2, $3, TRUE)
                ON CONFLICT (contract_type) DO UPDATE SET
                    contract_hash = EXCLUDED.contract_hash,
                    contract_name = EXCLUDED.contract_name,
                    is_active     = TRUE
            ",
            contract.contract_type.as_str(),
            contract.hash,
            contract.contract_type.as_str(),
        )
        .execute(pool)
        .await?;
    }
    Ok(())
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

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
}

/// Insert a raw event into `blockchain_events` (idempotent).
///
/// Returns `true` if the row was actually inserted (new event), `false` if it
/// already existed (duplicate — `ON CONFLICT DO NOTHING`).
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn insert_blockchain_event(
    tx: &mut PgTransaction<'_>,
    row: NewBlockchainEvent<'_>,
) -> IndexerResult<bool> {
    let result = sqlx::query!(
        r"
            INSERT INTO blockchain_events (event_type, contract_address, transaction_hash, block_number, event_data)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (transaction_hash, event_type, contract_address) DO NOTHING
            RETURNING id
        ",
        row.event_type,
        row.contract_address,
        row.transaction_hash,
        row.block_number,
        row.event_data,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    Ok(result.is_some())
}

/// Mark an event as processed in `blockchain_events`.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn mark_event_processed(
    tx: &mut PgTransaction<'_>,
    transaction_hash: &str,
    event_type: &str,
    contract_address: &str,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            UPDATE blockchain_events
            SET    processed    = TRUE,
                   processed_at = NOW()
            WHERE  transaction_hash = $1
              AND  event_type       = $2
              AND  contract_address = $3
        ",
        transaction_hash,
        event_type,
        contract_address,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

// -----------------------------------------------------------------------------
// Blockchain transactions
// -----------------------------------------------------------------------------

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

/// Insert a row into `blockchain_transactions`.
///
/// Uses `ON CONFLICT DO NOTHING` on `transaction_hash` so re-processing the
/// same deploy is safe.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
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
            ON CONFLICT (transaction_hash, transaction_type, from_address) DO NOTHING
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

// -----------------------------------------------------------------------------
// Token holdings
// -----------------------------------------------------------------------------

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
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
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

// -----------------------------------------------------------------------------
// ICO purchases
// -----------------------------------------------------------------------------

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
}

/// Insert a row into `ico_purchases` for a `TokensPurchased` event.
///
/// Uses `ON CONFLICT DO NOTHING` so re-processing the same deploy is safe.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// on SQL failures.
#[inline]
pub async fn insert_ico_purchase(
    tx: &mut PgTransaction<'_>,
    row: &NewIcoPurchase<'_>,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO ico_purchases (transaction_hash, block_height, buyer_address, amount, currency, price, cost, event_timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (transaction_hash) DO NOTHING
        ",
        row.transaction_hash,
        row.block_height,
        row.buyer_address,
        row.amount,
        row.currency,
        row.price,
        row.cost,
        row.event_timestamp,
    )
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

// -----------------------------------------------------------------------------
// ICO schedules
// -----------------------------------------------------------------------------

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
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
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
      .await?;

    Ok(())
}
