//! This event processor uses [`EventRegistry`] for static dispatch.
//!
//! Each event is processed inside a single database transaction:
//! 1. **Store** raw event in `blockchain_events` (idempotent)
//! 2. **Dispatch** to the event's trait implementation via [`EventRegistry`]
//! 3. **Mark** as processed
//!
//! If any step fails, the transaction is rolled back.

use chrono::{DateTime, Utc};
use sqlx::PgPool;

use crate::{
    config::ContractType,
    error::{IndexerError, IndexerResult},
    event_trait::EventContext,
    events::{EventRegistry, db},
};

/// Metadata for an event extracted from the blockchain.
#[derive(Debug, Clone)]
pub struct RawEvent {
    /// Contract package hash (hex, no prefix).
    pub contract_hash: String,
    /// Deploy hash containing this event.
    pub deploy_hash: String,
    /// Block height where event was emitted.
    pub block_height: u64,
    /// Public key of deploy caller.
    pub caller: String,
    /// Type of contract that emitted the event.
    pub contract_type: ContractType,
    /// CES event name (e.g. `TokensPurchased`).
    pub event_name: String,
    /// Raw event data as JSON.
    pub event_data: serde_json::Value,
    /// Block timestamp from the blockchain. `None` when unavailable.
    pub block_timestamp: Option<DateTime<Utc>>,
    /// Transform index within the deploy. `None` when unavailable.
    pub transform_idx: Option<i32>,
}

impl<'a> From<&'a RawEvent> for db::NewBlockchainEvent<'a> {
    #[inline]
    fn from(raw: &'a RawEvent) -> Self {
        Self {
            event_type: &raw.event_name,
            contract_address: &raw.contract_hash,
            transaction_hash: &raw.deploy_hash,
            block_number: raw.block_height.cast_signed(),
            event_data: &raw.event_data,
        }
    }
}

/// Process a single event using the trait-based architecture.
///
/// # Errors
///
/// Returns [`IndexerError`] on database or parsing failures.
#[inline]
pub async fn process_event(
    db_pool: &PgPool,
    registry: &EventRegistry,
    raw: &RawEvent,
) -> IndexerResult<()> {
    let mut tx = db_pool.begin().await?;

    // 1. Store raw event (idempotent via UNIQUE constraint)
    if !db::insert_blockchain_event(&mut tx, db::NewBlockchainEvent::from(raw)).await? {
        // Duplicate — already processed, nothing to do
        return Ok(());
    }

    // 2. Dispatch to event handler via registry.
    // ctx borrows `tx` mutably; the borrow ends after process_event returns,
    // allowing `tx` to be used again for mark_event_processed below.
    let mut ctx = EventContext {
        tx: &mut tx,
        contract_hash: &raw.contract_hash,
        deploy_hash: &raw.deploy_hash,
        block_height: raw.block_height,
        caller: &raw.caller,
        contract_type: raw.contract_type,
        block_timestamp: raw.block_timestamp,
        transform_idx: raw.transform_idx,
    };

    match registry
        .process_event(&mut ctx, &raw.event_name, raw.event_data.clone())
        .await
    {
        Ok(()) => {
            // Event processed successfully
        }
        Err(IndexerError::UnknownEvent { .. }) => {
            // Unknown event — store raw data only, don't fail
            tracing::warn!(
                contract = ?raw.contract_type,
                event = %raw.event_name,
                deploy = %raw.deploy_hash,
                "Unknown event — stored raw data in blockchain_events"
            );
        }
        Err(e) => {
            // Other errors — rollback transaction
            return Err(e);
        }
    }

    // 3. Mark event as processed
    db::mark_event_processed(
        &mut tx,
        &raw.deploy_hash,
        &raw.event_name,
        &raw.contract_hash,
    )
    .await?;

    tx.commit().await?;

    tracing::debug!(
        deploy = %raw.deploy_hash,
        event = %raw.event_name,
        contract = ?raw.contract_type,
        "Event processed"
    );

    Ok(())
}
