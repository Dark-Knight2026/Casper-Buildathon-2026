//! Casper Network event indexer v2 - Trait-based modular architecture.
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

#![cfg_attr(not(feature = "enabled"), allow(unused))]

/// Address normalization (all formats -> 64-char lowercase hex account hash).
#[cfg(feature = "enabled")]
pub mod address;
/// REST backfill client for historical event synchronization.
#[cfg(feature = "enabled")]
pub mod backfill;
/// Indexer configuration and contract registry.
#[cfg(feature = "enabled")]
pub mod config;
/// Indexer error types.
#[cfg(feature = "enabled")]
pub mod error;
/// Trait definition for indexable events.
#[cfg(feature = "enabled")]
pub mod event_trait;
/// Modular event implementations with trait-based dispatch.
#[cfg(feature = "enabled")]
pub mod events;
/// Event processor - persists events into PostgreSQL.
#[cfg(feature = "enabled")]
pub mod processor;
/// Indexer runner - initializes resources and orchestrates backfill + streaming.
#[cfg(feature = "enabled")]
pub mod runner;
/// WebSocket streaming client for real-time event ingestion.
#[cfg(feature = "enabled")]
pub mod streaming;
