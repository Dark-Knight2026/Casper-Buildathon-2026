//! Trait definition for indexable blockchain events.
//!
//! Each event type implements [`IndexableEvent`] to define:
//! - Its CES event name
//! - How to process and persist it to the database
//!
//! This trait-based architecture allows adding new events without modifying
//! existing code (Open-Closed Principle).

use core::fmt::Debug;
use std::{collections::HashSet, hash::RandomState};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgTransaction;

use crate::{config::ContractType, error::IndexerResult};

/// Context passed to event processors containing transaction metadata.
///
/// The `tx` field is the **outer** database transaction started by
/// [`crate::processor::process_event`]. Event handlers write to `tx` directly —
/// they must not open nested transactions. The processor commits or rolls back
/// `tx` atomically after all writes (including `mark_event_processed`) succeed.
#[derive(Debug)]
pub struct EventContext<'a> {
    /// The active database transaction shared across all writes for this event.
    pub tx: &'a mut PgTransaction<'static>,
    /// Contract package hash that emitted this event (hex, no prefix).
    pub contract_hash: &'a str,
    /// Deploy hash of the transaction containing this event.
    pub deploy_hash: &'a str,
    /// Block height where this event was included.
    pub block_height: u64,
    /// Type of contract that emitted this event.
    pub contract_type: ContractType,
    /// Block timestamp from the blockchain. `None` when unavailable (e.g. CEP-18 backfill).
    pub block_timestamp: Option<DateTime<Utc>>,
    /// Transform index within the deploy. `None` when unavailable.
    pub transform_idx: Option<i32>,
    /// Known contract hashes for `from_type`/`to_type` address lookup.
    pub known_contract_hashes: &'a HashSet<String, RandomState>,
}

/// Trait for blockchain events that can be indexed and processed.
///
/// Each smart contract event type implements this trait to define:
/// - Its canonical CES event name (e.g. `"TokensPurchased"`)
/// - Business logic for persisting it to `PostgreSQL`
///
/// # Example
///
/// ```rust,ignore
/// use indexer::{IndexableEvent, EventContext, IndexerResult};
/// use serde::{Deserialize, Serialize};
///
/// #[derive(Debug, Serialize, Deserialize)]
/// pub struct TokensPurchased {
///     pub amount: String,
///     pub currency: String,
///     pub cost: String,
/// }
///
/// impl IndexableEvent for TokensPurchased {
///     const EVENT_NAME: &'static str = "TokensPurchased";
///
///     async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
///         // Insert into ico_purchases table, etc.
///         Ok(())
///     }
/// }
/// ```
pub trait IndexableEvent: Serialize + for<'de> Deserialize<'de> + Send + Sync + Debug {
    /// CES event name as it appears in the smart contract schema.
    const EVENT_NAME: &'static str;

    /// Process this event and persist it to the database.
    ///
    /// This method is called inside the outer database transaction provided by
    /// [`crate::processor::process_event`] via [`EventContext::tx`]. All writes
    /// must go through `ctx.tx` — do **not** open nested transactions.
    /// If this method returns an error, the caller rolls back `ctx.tx` and the
    /// entire event (including `blockchain_events`) is left uncommitted.
    ///
    /// # Errors
    ///
    /// Returns [`IndexerError`](crate::error::IndexerError) on database
    /// failures or business logic errors.
    fn process(&self, ctx: &mut EventContext<'_>)
    -> impl Future<Output = IndexerResult<()>> + Send;
}
