//! Casper Network event indexer v2 — Trait-based modular architecture.
//!
//! This is a complete rewrite of the indexer using a trait-based event system
//! for better modularity, extensibility, and zero-cost abstractions.
//!
//! ## Architecture
//!
//! - **Trait-based events**: Each event implements [`IndexableEvent`]
//! - **Modular structure**: Events organized in separate modules
//! - **Compile-time dispatch**: Zero-cost abstraction via generics
//! - **Self-contained**: No dependencies on legacy indexer
//!
//! ## Usage
//!
//! ```rust,ignore
//! use indexer_v2::{EventRegistry, processor, config::ContractType};
//!
//! let registry = EventRegistry::new();
//! let raw_event = processor::RawEvent {
//!     contract_type: ContractType::Ico,
//!     event_name: "TokensPurchased".to_owned(),
//!     // ... other fields
//! };
//!
//! processor::process_event(&db_pool, &registry, &raw_event).await?;
//! ```

/// Indexer configuration and contract registry.
pub mod config;
/// Database access layer — all SQL queries.
pub mod db;
/// Indexer error types.
pub mod error;
/// Trait definition for indexable events.
pub mod event_trait;
/// Modular event implementations with trait-based dispatch.
pub mod events;
/// Event processor — persists events into PostgreSQL.
pub mod processor;

// Re-exports for convenience
pub use config::{ActiveContract, ContractRegistry, ContractType, IndexerConfig};
pub use error::{IndexerError, IndexerResult};
pub use event_trait::{EventContext, IndexableEvent};
pub use events::EventRegistry;
