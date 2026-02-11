//! Event processor — persists [`EventEnvelope`]s into PostgreSQL.
//!
//! Each event is processed inside a single database transaction:
//!
//! 1. **Store** the raw event in `blockchain_events` (idempotent via UNIQUE
//!    constraint — duplicates are silently skipped).
//! 2. **Apply business logic** depending on the event type (e.g. record an ICO
//!    purchase, log a token transfer).
//! 3. **Mark** the event as processed.
//!
//! If any step fails the whole transaction is rolled back, so the event will be
//! retried on the next indexer run.

use sqlx::PgPool;

use crate::{
    error::{IndexerError, IndexerResult},
    events::{EventEnvelope, IndexedEvent},
};

/// Process a single event inside a database transaction.
///
/// The function is **idempotent**: calling it twice with the same envelope is a
/// no-op because the `blockchain_events` UNIQUE constraint prevents duplicate
/// inserts.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](IndexerError::Database)
/// on SQL failures or [`IndexerError::Parse`](IndexerError::Parse)
/// if the event cannot be serialized to JSON.
#[inline]
pub async fn process_event(db: &PgPool, envelope: &EventEnvelope) -> IndexerResult<()> {
    let mut tx = db.begin().await?;

    // 1. Store raw event (idempotent)
    let event_json =
        serde_json::to_value(&envelope.event).map_err(|e| IndexerError::Parse(e.to_string()))?;

    let inserted: Option<(sqlx::types::Uuid,)> = sqlx::query_as(
        r"
            INSERT INTO blockchain_events
                (event_type, contract_address, transaction_hash, block_number, event_data)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (transaction_hash, event_type, contract_address) DO NOTHING
            RETURNING id
        ",
    )
    .bind(&envelope.event_name)
    .bind(&envelope.contract_hash)
    .bind(&envelope.deploy_hash)
    .bind(envelope.block_height.cast_signed())
    .bind(&event_json)
    .fetch_optional(&mut *tx)
    .await?;

    if inserted.is_none() {
        // Duplicate — already processed, nothing to do.
        return Ok(());
    }

    // 2. Business logic per event type
    match &envelope.event {
        IndexedEvent::TokensPurchased(e) => {
            insert_ico_purchase(&mut tx, envelope, e).await?;
            insert_blockchain_transaction(
                &mut tx,
                &envelope.deploy_hash,
                envelope.block_height,
                "token_purchase",
                &envelope.caller,
                Some(&e.cost),
                Some(e.currency.as_str()),
                &event_json,
            )
            .await?;
        }

        IndexedEvent::Cep18Transfer(e) => {
            insert_blockchain_transaction(
                &mut tx,
                &envelope.deploy_hash,
                envelope.block_height,
                "token_transfer",
                &e.sender,
                Some(&e.amount),
                None,
                &event_json,
            )
            .await?;
        }

        IndexedEvent::Cep18TransferFrom(e) => {
            insert_blockchain_transaction(
                &mut tx,
                &envelope.deploy_hash,
                envelope.block_height,
                "token_transfer",
                &e.owner,
                Some(&e.amount),
                None,
                &event_json,
            )
            .await?;
        }

        // Phase 1 MVP: remaining events are stored in blockchain_events only.
        // Business-logic handlers for Lease, NFT, Treasury, etc. will be added
        // in later phases.
        _ => {}
    }

    // 3. Mark event as processed
    sqlx::query(
        r"
            UPDATE blockchain_events
            SET    processed    = TRUE,
                   processed_at = NOW()
            WHERE  transaction_hash = $1
              AND  event_type       = $2
              AND  contract_address = $3
        ",
    )
    .bind(&envelope.deploy_hash)
    .bind(&envelope.event_name)
    .bind(&envelope.contract_hash)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    tracing::debug!(
        deploy = %envelope.deploy_hash,
        event  = %envelope.event_name,
        "Event processed"
    );

    Ok(())
}

/// Insert a row into `ico_purchases` for a `TokensPurchased` event.
async fn insert_ico_purchase(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    envelope: &EventEnvelope,
    e: &crate::events::TokensPurchased,
) -> IndexerResult<()> {
    sqlx::query(
        r"
            INSERT INTO ico_purchases (transaction_hash, block_height, buyer_address, amount, currency, price, cost, event_timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (transaction_hash) DO NOTHING
        ",
    )
    .bind(&envelope.deploy_hash)
    .bind(envelope.block_height.cast_signed())
    .bind(&envelope.caller)
    .bind(&e.amount)
    .bind(e.currency.as_str())
    .bind(&e.price)
    .bind(&e.cost)
    .bind(e.timestamp.cast_signed())
    .execute(&mut **tx)
    .await?;

    Ok(())
}

/// Insert a row into `blockchain_transactions`.
///
/// Uses `ON CONFLICT DO NOTHING` on `transaction_hash` so re-processing the
/// same deploy is safe.
#[allow(clippy::too_many_arguments)]
async fn insert_blockchain_transaction(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    deploy_hash: &str,
    block_height: u64,
    tx_type: &str,
    from_address: &str,
    amount: Option<&str>,
    currency: Option<&str>,
    metadata: &serde_json::Value,
) -> IndexerResult<()> {
    sqlx::query(
        r"
            INSERT INTO blockchain_transactions (transaction_hash, deploy_hash, block_number, transaction_type, from_address, amount, currency, status, metadata, confirmed_at)
            VALUES ($1, $1, $2, $3, $4, $5::DECIMAL, $6, 'confirmed', $7, NOW())
            ON CONFLICT (transaction_hash) DO NOTHING
        ",
    )
    .bind(deploy_hash)
    .bind(block_height.cast_signed())
    .bind(tx_type)
    .bind(from_address)
    .bind(amount)
    .bind(currency)
    .bind(metadata)
    .execute(&mut **tx)
    .await?;

    Ok(())
}
