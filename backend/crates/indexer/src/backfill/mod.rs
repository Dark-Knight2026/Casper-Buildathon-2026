//! Backfill client for historical event synchronization.
//!
//! Uses strategy-per-contract-type:
//!
//! - **CEP-18 tokens** (USDC, USDT, BIG): CSPR.cloud `/ft-token-actions` endpoint,
//!   which returns normalized Transfer/Mint/Approve actions with full history.
//!
//! - **CES contracts** (all others): Casper node RPC reads the `__events`
//!   dictionary directly via `state_get_dictionary_item`, then parses bytesrepr
//!   binary CES events with hardcoded field schemas. Contracts without schemas
//!   are skipped with a warning.
//!
//! All events are funneled through the same [`processor`] pipeline used by
//! streaming, so balance updates and idempotency logic is shared.

pub mod cep18;
pub mod ces;
pub mod db;
pub mod parser;
mod rpc;

use std::collections::HashSet;

use reqwest::Client;
use sqlx::PgPool;

use crate::{config::IndexerConfig, error::IndexerResult, events::EventRegistry};

/// Shared dependencies for backfill operations (CES and CEP-18).
#[derive(Debug)]
pub struct BackfillContext<'a> {
    /// HTTP client used for CSPR.cloud API requests.
    pub client: &'a Client,
    /// Indexer configuration (API token, URLs, rate limit).
    pub config: &'a IndexerConfig,
    /// Database connection pool for reading and writing events.
    pub db_pool: &'a PgPool,
    /// Event registry for dispatching processed events.
    pub registry: &'a EventRegistry,
    /// Known contract package hashes for address type lookup.
    pub known_hashes: &'a HashSet<String>,
}

/// Run backfill for all configured contracts.
///
/// Dispatches to the appropriate backfill strategy based on contract type.
/// Contracts without a backfill strategy log a warning and are skipped.
///
/// # Errors
///
/// Returns [`IndexerError`] on HTTP, API, or database failures.
#[inline]
pub async fn run_backfill(config: &IndexerConfig, db_pool: &PgPool) -> IndexerResult<()> {
    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = config.contracts.contract_hash_set();
    let context = BackfillContext {
        client: &client,
        config,
        db_pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };

    tracing::info!("Starting backfill for all contracts");

    for contract in config.contracts.active_contracts() {
        tracing::info!(
            contract = ?contract.contract_type,
            hash = %contract.hash,
            start_block = contract.start_block,
            "Backfilling contract"
        );

        match contract.contract_type {
            // CEP-18: CSPR.cloud exposes a dedicated `/ft-token-actions`
            // endpoint that returns normalized `Transfer/Mint/Approve` records,
            // no RPC calls needed.
            ct if ct.is_cep18_token() => {
                cep18::backfill_cep18(
                    &context,
                    contract.contract_type,
                    contract.hash,
                    contract.start_block,
                )
                .await?;
            }
            // All other contracts: backfill via CES RPC (__events dictionary).
            // Contracts without defined schemas are skipped with a warning
            // inside `backfill_ces`.
            _ => {
                ces::backfill_ces(&context, contract.contract_type, contract.hash).await?;
            }
        }
    }

    tracing::info!("Backfill completed successfully");
    Ok(())
}
