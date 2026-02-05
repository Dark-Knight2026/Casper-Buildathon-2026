//! Casper Network event indexer for the `LeaseFi` platform.
//!
//! Subscribes to smart contract events via `CSPR.cloud` APIs
//! and persists them to the database for the backend API to serve.

/// Indexer configuration and contract registry.
pub mod config;
/// Indexer error types.
pub mod error;

pub use config::{ContractRegistry, ContractType, IndexerConfig};
pub use error::IndexerError;
