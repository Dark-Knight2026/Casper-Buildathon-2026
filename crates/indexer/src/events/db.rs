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

use sqlx::{Postgres, Transaction};

use crate::{config::ContractType, error::IndexerResult};

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
    tx: &mut Transaction<'_, Postgres>,
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
    tx: &mut Transaction<'_, Postgres>,
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
    /// Amount involved (U256 as string), if applicable.
    pub amount: Option<&'a str>,
    /// Currency label, if applicable.
    pub currency: Option<&'a str>,
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
    tx: &mut Transaction<'_, Postgres>,
    row: &NewBlockchainTx<'_>,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO blockchain_transactions (transaction_hash, deploy_hash, block_number, transaction_type, from_address, amount, currency, status, metadata, confirmed_at)
            VALUES ($1, $1, $2, $3, $4, $5, $6, 'confirmed', $7, NOW())
            ON CONFLICT (transaction_hash, transaction_type) DO NOTHING
        ",
        row.deploy_hash,
        row.block_number,
        row.transaction_type,
        row.from_address,
        row.amount,
        row.currency,
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
    tx: &mut Transaction<'_, Postgres>,
    user_address: &str,
    token_type: ContractType,
    update: BalanceUpdate<'_>,
) -> IndexerResult<()> {
    let token_name = match token_type {
        ContractType::Big => "BIG",
        ContractType::Usdc => "USDC",
        ContractType::Usdt => "USDT",
        _ => return Ok(()), // non-token contracts — no-op
    };

    match update {
        BalanceUpdate::Decrease(amount) => {
            sqlx::query!(
                r"
                    INSERT INTO token_holdings as th (user_address, token_type, balance, last_updated_at)
                    VALUES ($1, $2, '0', NOW())
                    ON CONFLICT (user_address, token_type) DO UPDATE SET
                        balance         = (th.balance::NUMERIC - $3::TEXT::NUMERIC)::TEXT,
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
    pub price: &'a str,
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
    tx: &mut Transaction<'_, Postgres>,
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
