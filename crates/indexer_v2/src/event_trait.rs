//! Trait definition for indexable blockchain events.
//!
//! Each event type implements [`IndexableEvent`] to define:
//! - Its CES event name
//! - How to process and persist it to the database
//!
//! This trait-based architecture allows adding new events without modifying
//! existing code (Open-Closed Principle).

use core::fmt::Debug;

use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::{config::ContractType, error::IndexerResult};

/// Context passed to event processors containing transaction metadata.
#[derive(Debug)]
pub struct EventContext<'a> {
    /// Active database transaction (for atomic event processing).
    pub db_pool: &'a PgPool,
    /// Contract package hash that emitted this event (hex, no prefix).
    pub contract_hash: &'a str,
    /// Deploy hash of the transaction containing this event.
    pub deploy_hash: &'a str,
    /// Block height where this event was included.
    pub block_height: u64,
    /// Public key of the account that submitted the deployment.
    pub caller: &'a str,
    /// Type of contract that emitted this event.
    pub contract_type: ContractType,
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
///     async fn process(&self, ctx: &EventContext<'_>) -> IndexerResult<()> {
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
    /// This method is called inside a database transaction. If it returns an
    /// error, the transaction is rolled back and the event will be retried.
    ///
    /// # Errors
    ///
    /// Returns [`IndexerError`](crate::error::IndexerError) on database
    /// failures or business logic errors.
    fn process(&self, ctx: &EventContext<'_>) -> impl Future<Output = IndexerResult<()>> + Send;
}
