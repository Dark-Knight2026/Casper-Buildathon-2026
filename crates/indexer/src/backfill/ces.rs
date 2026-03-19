//! CES (Contract Event Standard) backfill via Casper node RPC.
//!
//! Reads events directly from the contract's `__events` dictionary using:
//! 1. `query_global_state` to discover `__events` `URef` and `__events_length`
//! 2. `state_get_dictionary_item` to fetch each event by index
//! 3. Binary CES parser to decode bytesrepr-serialized event data
//!
//! This approach works for any Casper contract that uses the CES library's
//! `emit()` function (which writes to the `__events` dictionary).

use core::time::Duration;

use super::{BackfillContext, db, parser};
use crate::{
    backfill::{parser::EventSchema, rpc::CasperRpc},
    config::ContractType,
    error::IndexerResult,
    events,
    processor::{self, RawEvent},
};

/// Returns CES event schemas for the given contract type.
///
/// Schema lists are defined in each event module (`events::ico`, etc.)
/// next to the event struct definitions, so adding a new event only
/// requires updating a single module.
///
/// Returns an empty slice for contract types without CES schemas.
#[inline]
#[must_use]
pub fn schemas_for(contract_type: ContractType) -> &'static [EventSchema] {
    match contract_type {
        ContractType::Ico => events::ico::CES_SCHEMAS,
        ContractType::Vesting => events::vesting::CES_SCHEMAS,
        ContractType::Staking => events::staking::CES_SCHEMAS,
        _ => &[],
    }
}

/// Per-contract context bundling shared backfill deps with contract-specific info.
struct CesContext<'a> {
    backfill: &'a BackfillContext<'a>,
    contract_type: ContractType,
    contract_hash: &'a str,
}

/// Backfill a CES-compliant contract by reading its `__events` dictionary.
///
/// # Errors
///
/// Returns [`IndexerError`] on RPC, parse, or database failures.
#[inline]
pub async fn backfill_ces(
    ctx: &BackfillContext<'_>,
    contract_type: ContractType,
    contract_hash: &str,
    _start_block: u64,
) -> IndexerResult<()> {
    let ces = CesContext {
        backfill: ctx,
        contract_type,
        contract_hash,
    };
    let rpc = CasperRpc::new(
        ctx.client,
        &ctx.config.casper.node_rpc_url,
        &ctx.config.casper.api_token,
    );
    let schemas = schemas_for(contract_type);

    if schemas.is_empty() {
        tracing::warn!(
            contract = ?contract_type,
            "CES backfill skipped - no event schemas defined"
        );
        return Ok(());
    }

    // 1. Get current state root hash.
    let state_root = rpc.get_state_root_hash().await?;
    tracing::debug!(%state_root, "Got state root hash for CES backfill");

    // 2. Discover __events URef and __events_length from named keys.
    let named_keys = rpc
        .get_contract_named_keys(&state_root, contract_hash)
        .await?;

    let Some(events_uref) = named_keys.get("__events") else {
        tracing::warn!(
            contract = ?contract_type,
            %contract_hash,
            "CES backfill skipped - __events URef not found in named keys \
             (contract may not have emitted any events yet)"
        );
        return Ok(());
    };

    let Some(events_length_uref) = named_keys.get("__events_length") else {
        tracing::warn!(
            contract = ?contract_type,
            %contract_hash,
            "CES backfill skipped - __events_length URef not found in named keys"
        );
        return Ok(());
    };

    // 3. Query total number of events.
    let total_events = rpc.query_u32(&state_root, events_length_uref).await?;
    tracing::info!(
        contract = ?contract_type,
        total_events,
        %events_uref,
        "CES dictionary discovered"
    );

    if total_events == 0 {
        tracing::info!(contract = ?contract_type, "No CES events to backfill");
        return Ok(());
    }

    // 4. Load cursor (last processed event index).
    let cursor = db::get_ces_cursor(ces.backfill.db_pool, contract_hash).await?;
    let start_index = cursor.map_or(0, |c| u32::try_from(c + 1).unwrap_or(0));

    if start_index >= total_events {
        tracing::info!(
            contract = ?contract_type,
            cursor = ?cursor,
            total_events,
            "CES backfill already up to date"
        );
        return Ok(());
    }

    tracing::info!(
        contract = ?contract_type,
        start_index,
        total_events,
        "Starting CES backfill from event index {start_index}"
    );

    let mut processed = 0u64;

    // 5. Iterate through each event by index.
    for idx in start_index..total_events {
        let key = idx.to_string();

        match process_event_at(&ces, &rpc, &state_root, events_uref, &key, schemas).await {
            Ok(event_name) => {
                processed += 1;
                tracing::debug!(index = idx, event = %event_name, "CES event processed");
            }
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    index = idx,
                    contract = ?contract_type,
                    "Failed to process CES event, skipping"
                );
            }
        }

        db::update_ces_cursor(ces.backfill.db_pool, contract_hash, i64::from(idx)).await?;

        tokio::time::sleep(Duration::from_millis(
            ces.backfill.config.backfill_rate_limit_ms,
        ))
        .await;
    }

    tracing::info!(
        contract = ?contract_type,
        processed,
        total_events,
        "CES backfill complete"
    );

    Ok(())
}

/// Fetch, parse, and dispatch a single CES event from the `__events` dictionary.
async fn process_event_at(
    ctx: &CesContext<'_>,
    rpc: &CasperRpc<'_>,
    state_root: &str,
    events_uref: &str,
    key: &str,
    schemas: &[EventSchema],
) -> IndexerResult<String> {
    let bytes = rpc
        .get_dictionary_item_bytes(state_root, events_uref, key)
        .await?;

    let (event_name, event_data) = parser::parse_ces_event(&bytes, schemas)?;

    let raw = RawEvent {
        contract_hash: ctx.contract_hash.to_owned(),
        deploy_hash: format!("ces-backfill-{}-{key}", ctx.contract_hash),
        block_height: 0,
        contract_type: ctx.contract_type,
        event_name: event_name.clone(),
        event_data,
        block_timestamp: None,
        transform_idx: None,
    };

    processor::process_event(
        ctx.backfill.db_pool,
        ctx.backfill.registry,
        ctx.backfill.known_hashes,
        &raw,
    )
    .await?;
    Ok(event_name)
}
