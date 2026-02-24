//! REST backfill client for historical event synchronization.
//!
//! Uses strategy-per-contract-type:
//!
//! - **CEP-18 tokens** (USDC, USDT, BIG): CSPR.cloud `/ft-token-actions` endpoint,
//!   which returns normalized Transfer/Mint/Approve actions with full history.
//!
//! - **ICO**: CSPR.cloud `/deploys` for deploy list + Casper Node RPC `info_get_deploy`
//!   for session args. `TokensPurchased` event data is reconstructed from deploy args
//!   (`amount_to_spend`, `currency`) and the BIG Transfer amount fetched directly from
//!   CSPR.cloud `/ft-token-actions` (filtered by `from_hash == ICO contract hash`).
//!   Only deploys accessible on the node (~last 2–3 days) are processed; older deploys
//!   are skipped with a warning.
//!
//! - **Treasury / others**: not yet implemented — rely on live WebSocket streaming.
//!
//! All events are funneled through the same [`processor`] pipeline used by
//! streaming, so balance updates and idempotency logic is shared.

mod cep18;
pub mod ico;

use reqwest::Client;
use sqlx::PgPool;

use crate::{
    config::{ContractType, IndexerConfig},
    error::IndexerResult,
    events::EventRegistry,
};

use ico::IcoBackfillCtx;

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
                    &client,
                    config,
                    db_pool,
                    &registry,
                    contract.contract_type,
                    contract.hash,
                    contract.start_block,
                )
                .await?;
            }
            // ICO: no dedicated endpoint — events are reconstructed from raw
            // deploys. Requires Casper Node RPC (`info_get_deploy`) for
            // session args + BIG transfer amounts from CSPR.cloud.
            // Node only keeps ~2–3 days of history.
            ContractType::Ico => {
                if let Some(ref big) = big_hash {
                    ico::backfill_ico(
                        &IcoBackfillCtx {
                            client: &client,
                            config,
                            db_pool,
                            registry: &registry,
                            big_hash: big,
                        },
                        contract.contract_type,
                        contract.hash,
                        contract.start_block,
                    )
                    .await?;
                } else {
                    tracing::warn!("ICO backfill skipped — BIG contract hash not configured");
                }
            }
            _ => {
                tracing::warn!(
                    contract = ?contract.contract_type,
                    "Backfill not yet implemented for this contract type — relying on live streaming"
                );
            }
        }
    }

    tracing::info!("Backfill completed successfully");
    Ok(())
}
