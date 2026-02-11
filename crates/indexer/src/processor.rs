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
    db,
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
pub async fn process_event(db_pool: &PgPool, envelope: &EventEnvelope) -> IndexerResult<()> {
    let mut tx = db_pool.begin().await?;

    // 1. Store raw event (idempotent)
    let event_json =
        serde_json::to_value(&envelope.event).map_err(|e| IndexerError::Parse(e.to_string()))?;

    let is_new = db::insert_blockchain_event(
        &mut tx,
        &envelope.event_name,
        &envelope.contract_hash,
        &envelope.deploy_hash,
        envelope.block_height.cast_signed(),
        &event_json,
    )
    .await?;

    if !is_new {
        // Duplicate — already processed, nothing to do.
        return Ok(());
    }

    // 2. Business logic per event type
    let block_height = envelope.block_height.cast_signed();

    match &envelope.event {
        IndexedEvent::TokensPurchased(e) => {
            db::insert_ico_purchase(
                &mut tx,
                &db::NewIcoPurchase {
                    transaction_hash: &envelope.deploy_hash,
                    block_height,
                    buyer_address: &envelope.caller,
                    amount: &e.amount,
                    currency: e.currency.as_str(),
                    price: &e.price,
                    cost: &e.cost,
                    event_timestamp: e.timestamp.cast_signed(),
                },
            )
            .await?;

            db::insert_blockchain_transaction(
                &mut tx,
                &db::NewBlockchainTx {
                    deploy_hash: &envelope.deploy_hash,
                    block_number: block_height,
                    transaction_type: "token_purchase",
                    from_address: &envelope.caller,
                    amount: Some(&e.cost),
                    currency: Some(e.currency.as_str()),
                    metadata: &event_json,
                },
            )
            .await?;
        }

        IndexedEvent::Cep18Transfer(e) => {
            db::insert_blockchain_transaction(
                &mut tx,
                &db::NewBlockchainTx {
                    deploy_hash: &envelope.deploy_hash,
                    block_number: block_height,
                    transaction_type: "token_transfer",
                    from_address: &e.sender,
                    amount: Some(&e.amount),
                    currency: None,
                    metadata: &event_json,
                },
            )
            .await?;
        }

        IndexedEvent::Cep18TransferFrom(e) => {
            db::insert_blockchain_transaction(
                &mut tx,
                &db::NewBlockchainTx {
                    deploy_hash: &envelope.deploy_hash,
                    block_number: block_height,
                    transaction_type: "token_transfer",
                    from_address: &e.owner,
                    amount: Some(&e.amount),
                    currency: None,
                    metadata: &event_json,
                },
            )
            .await?;
        }

        // Phase 1 MVP: remaining events are stored in blockchain_events only.
        // Business-logic handlers for Lease, NFT, Treasury, etc. will be added
        // in later phases.
        _ => {}
    }

    // 3. Mark event as processed
    db::mark_event_processed(
        &mut tx,
        &envelope.deploy_hash,
        &envelope.event_name,
        &envelope.contract_hash,
    )
    .await?;

    tx.commit().await?;

    tracing::debug!(
        deploy = %envelope.deploy_hash,
        event  = %envelope.event_name,
        "Event processed"
    );

    Ok(())
}
