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
        ContractType::UserRegistry => events::user_registry::CES_SCHEMAS,
        ContractType::Lease => events::lease::CES_SCHEMAS,
        ContractType::PropertyRegistry => events::property_registry::CES_SCHEMAS,
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

    process_event_range(
        &ces,
        &rpc,
        &state_root,
        events_uref,
        schemas,
        start_index,
        total_events,
    )
    .await
}

/// Iterate through CES events in `[start_index, total_events)`, processing
/// each one and advancing the cursor on success.
async fn process_event_range(
    ces: &CesContext<'_>,
    rpc: &CasperRpc<'_>,
    state_root: &str,
    events_uref: &str,
    schemas: &[EventSchema],
    start_index: u32,
    total_events: u32,
) -> IndexerResult<()> {
    let mut processed = 0u64;

    for idx in start_index..total_events {
        let key = idx.to_string();

        match process_event_at(ces, rpc, state_root, events_uref, &key, schemas).await {
            Ok(Some(event_name)) => {
                processed += 1;
                db::update_ces_cursor(ces.backfill.db_pool, ces.contract_hash, i64::from(idx))
                    .await?;
                tracing::debug!(index = idx, event = %event_name, "CES event processed");
            }
            Ok(None) => {
                db::update_ces_cursor(ces.backfill.db_pool, ces.contract_hash, i64::from(idx))
                    .await?;
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    index = idx,
                    contract = ?ces.contract_type,
                    "Failed to process CES event - stopping backfill to avoid data loss"
                );
                return Err(e);
            }
        }

        tokio::time::sleep(Duration::from_millis(
            ces.backfill.config.backfill_rate_limit_ms,
        ))
        .await;
    }

    tracing::info!(
        contract = ?ces.contract_type,
        processed,
        total_events,
        "CES backfill complete"
    );

    Ok(())
}

/// Fetch, parse, and dispatch a single CES event from the `__events` dictionary.
///
/// Returns `Ok(None)` for admin/framework events (e.g. `OwnershipTransferred`)
/// that have no schema and don't need indexing.
async fn process_event_at(
    ctx: &CesContext<'_>,
    rpc: &CasperRpc<'_>,
    state_root: &str,
    events_uref: &str,
    key: &str,
    schemas: &[EventSchema],
) -> IndexerResult<Option<String>> {
    let bytes = rpc
        .get_dictionary_item_bytes(state_root, events_uref, key)
        .await?;

    let (event_name, remainder) = parser::parse_event_name(&bytes)?;

    let Some(schema) = schemas.iter().find(|s| s.name == event_name) else {
        tracing::warn!(
            event = %event_name,
            index = %key,
            contract = ?ctx.contract_type,
            "Skipping unindexed CES event"
        );
        return Ok(None);
    };

    let event_data = parser::parse_event_fields(remainder, schema)?;

    // CES dictionary items (`state_get_dictionary_item`) contain only the
    // binary event payload - the block height that produced the event is not
    // available.  We use `0` as a sentinel so that monotonicity guards
    // (e.g. `snapshot_block_height`) let streaming events (real height > 0)
    // always take precedence over backfill, while repeated backfill runs are
    // idempotently rejected (0 < 0 = false).
    let raw = RawEvent {
        contract_hash: ctx.contract_hash.to_owned(),
        deploy_hash: format!(
            "ces-backfill-{:.34}-{:016x}",
            ctx.contract_hash,
            key.parse::<u64>().unwrap_or(0),
        ),
        block_height: 0,
        contract_type: ctx.contract_type,
        event_name: event_name.clone(),
        event_data,
        block_timestamp: None,
        transform_idx: None,
        api_from_type: None,
        api_to_type: None,
    };

    processor::process_event(
        ctx.backfill.db_pool,
        ctx.backfill.registry,
        ctx.backfill.known_hashes,
        &raw,
    )
    .await?;
    Ok(Some(event_name))
}
