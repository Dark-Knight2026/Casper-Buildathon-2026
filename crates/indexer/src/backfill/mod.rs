//! REST backfill client for historical event synchronization.
//!
//! Uses strategy-per-contract-type:
//!
//! - **CEP-18 tokens** (USDC, USDT, BIG): CSPR.cloud `/ft-token-actions` endpoint,
//!   which returns normalized Transfer/Mint/Approve actions with full history.
//!
//! - **ICO**: CSPR.cloud `/deploys` endpoint returns deploy session args inline.
//!   `TokensPurchased` event data is reconstructed from deploy args
//!   (`amount_to_spend`, `currency`) and the BIG Transfer amount fetched from
//!   CSPR.cloud `/ft-token-actions` (filtered by `from_hash == ICO contract hash`).
//!
//! - **Treasury / others**: not yet implemented — rely on live WebSocket streaming.
//!
//! All events are funneled through the same [`processor`] pipeline used by
//! streaming, so balance updates and idempotency logic is shared.

pub mod cep18;
pub mod db;
pub mod ico;

use std::collections::HashSet;

use reqwest::Client;
use sqlx::PgPool;

use crate::{
    config::{ContractType, IndexerConfig},
    error::IndexerResult,
    events::EventRegistry,
};

/// Shared dependencies for backfill operations (ICO and CEP-18).
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

    // BIG contract hash is needed by the ICO backfill to fetch transfer amounts from CSPR.cloud.
    let big_hash = config
        .contracts
        .active_contracts()
        .into_iter()
        .find(|c| c.contract_type == ContractType::Big)
        .map(|c| c.hash.to_owned());

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
            // ICO: events are reconstructed from `/deploys` (session args inline)
            // + BIG transfer amounts from CSPR.cloud `/ft-token-actions`.
            ContractType::Ico => {
                if let Some(ref big) = big_hash {
                    ico::backfill_ico(
                        &context,
                        big,
                        contract.contract_type,
                        contract.hash,
                        contract.start_block,
                    )
                    .await?;
                } else {
                    tracing::warn!("ICO backfill skipped - BIG contract hash not configured");
                }
            }
            _ => {
                tracing::warn!(
                    contract = ?contract.contract_type,
                    "Backfill not yet implemented for this contract type - relying on live streaming"
                );
            }
        }
    }

    tracing::info!("Backfill completed successfully");
    Ok(())
}
