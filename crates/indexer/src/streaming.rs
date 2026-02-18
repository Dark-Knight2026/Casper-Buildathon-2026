//! WebSocket streaming client for real-time event ingestion.
//!
//! Connects to the CSPR.cloud Streaming API and processes contract-level
//! events as they are emitted on-chain, using the same [`processor`] pipeline
//! as the REST backfill client.
//!
//! [`processor`]: crate::processor

use std::collections::HashMap;

use serde::Deserialize;

use crate::config::{ContractRegistry, ContractType};

// -----------------------------------------------------------------------------
// CSPR.cloud WebSocket message types
// -----------------------------------------------------------------------------

/// Top-level message received from the CSPR.cloud Streaming API.
///
/// Every contract-level event arrives as a JSON object of this shape.
/// Unknown fields (e.g. `timestamp`) are ignored by serde automatically.
#[derive(Debug, Deserialize)]
pub struct WssMessage {
    /// CES event payload.
    pub data: WssData,
    /// Blockchain context for the event (deploy hash, block height, etc.).
    pub extra: WssExtra,
}

/// Payload of a single CES event inside a [`WssMessage`].
#[derive(Debug, Deserialize)]
pub struct WssData {
    /// Contract package hash that emitted this event (hex, no prefix).
    ///
    /// Used to resolve the [`ContractType`] via the contract map.
    pub contract_package_hash: String,
    /// CES event name (e.g. `"TokensPurchased"`, `"Transfer"`).
    pub name: String,
    /// Raw event fields as a JSON object — passed directly to the processor.
    pub data: serde_json::Value,
}

/// Blockchain context attached to every streaming event.
#[derive(Debug, Deserialize)]
pub struct WssExtra {
    /// Deploy hash of the transaction that emitted this event.
    pub deploy_hash: String,
    /// Globally monotonically increasing event ID assigned by CSPR.cloud.
    ///
    /// Stored as the streaming cursor after each successful event.
    pub event_id: i64,
    /// Block height at which the event was included.
    pub block_height: u64,
}

// -----------------------------------------------------------------------------
// Contract registry helpers
// -----------------------------------------------------------------------------

/// Build a lookup map from contract package hash to [`ContractType`].
///
/// Used on every incoming message to resolve the contract type in O(1).
#[inline]
#[must_use]
pub fn build_contract_map(registry: &ContractRegistry) -> HashMap<String, ContractType> {
    registry
        .active_contracts()
        .into_iter()
        .map(|c| (c.hash.to_owned(), c.contract_type))
        .collect()
}

/// Build a comma-separated list of contract package hashes for the
/// `contract_package_hash` query parameter required by the Streaming API.
#[inline]
#[must_use]
pub fn build_hashes_csv(registry: &ContractRegistry) -> String {
    registry
        .active_contracts()
        .into_iter()
        .map(|c| c.hash.to_owned())
        .collect::<Vec<_>>()
        .join(",")
}
