//! Casper Network event indexer for the `LeaseFi` platform.
//!
//! Subscribes to smart contract events via `CSPR.cloud` APIs
//! and persists them to the database for the backend API to serve.

/// REST backfill client for historical event synchronization.
pub mod backfill;
/// HTTP/RPC client for fetching deploy execution results from the Casper node.
pub mod client;
/// Indexer configuration and contract registry.
pub mod config;
/// Database access layer — all SQL queries centralized here.
pub mod db;
/// Indexer error types.
pub mod error;
/// Rust types for all smart contract events.
pub mod events;
/// CES event parser (event name + JSON payload -> typed [`IndexedEvent`]).
pub mod parser;
/// Event processor — persists events into PostgreSQL with business logic.
pub mod processor;

pub use config::{ActiveContract, ContractRegistry, ContractType, IndexerConfig};
pub use error::IndexerError;
pub use events::{EventEnvelope, IndexedEvent};
