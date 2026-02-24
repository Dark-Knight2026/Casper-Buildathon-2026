//! ICO backfill via CSPR.cloud `/deploys` + Casper Node RPC `info_get_deploy`.
//!
//! `TokensPurchased` event data is reconstructed from:
//! - deploy session args (`amount_to_spend`, `currency`) fetched from the node
//! - BIG Transfer amount fetched directly from CSPR.cloud `/ft-token-actions`
//!   (filtered by `from_hash = ICO contract package hash`)

use core::time::Duration;
use std::collections::HashMap;

use reqwest::Client;
use secrecy::ExposeSecret;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;

use super::db;
use crate::{
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
    events::EventRegistry,
    processor::{self, RawEvent},
};

// -----------------------------------------------------------------------------
// CSPR.cloud /ft-token-actions response types (BIG transfers)
// -----------------------------------------------------------------------------

/// Top-level response from the `/ft-token-actions` endpoint.
#[derive(Debug, Deserialize)]
struct BigTransferPage {
    data: Vec<BigTransferItem>,
    /// Total number of pages for the current query (used for pagination).
    page_count: u32,
}

/// Minimal fields needed to identify a BIG transfer triggered by the ICO.
#[derive(Debug, Deserialize)]
struct BigTransferItem {
    /// Hash of the deploy that triggered this transfer.
    deploy_hash: String,
    /// Sender — for ICO-initiated transfers this is the ICO contract package hash.
    from_hash: Option<String>,
    /// Token amount as a decimal string.
    amount: String,
}

// -----------------------------------------------------------------------------
// CSPR.cloud /deploys response types
// -----------------------------------------------------------------------------

/// Top-level response from the `/deploys` endpoint.
#[derive(Debug, Deserialize)]
struct DeployListPage {
    data: Vec<DeployListItem>,
    /// Total number of pages for the current query (used for pagination).
    page_count: u32,
}

/// A single deploy entry returned by CSPR.cloud.
#[derive(Debug, Deserialize)]
pub(super) struct DeployListItem {
    /// Deploy hash (hex).
    pub(super) deploy_hash: String,
    /// Block height at which the deploy was included.
    pub(super) block_height: u64,
    /// `None` on success, non-`None` if the deploy failed.
    pub(super) error_message: Option<String>,
}

// -----------------------------------------------------------------------------
// Casper Node RPC response types
// -----------------------------------------------------------------------------

/// Top-level JSON-RPC response from the Casper node.
#[derive(Debug, Deserialize)]
struct CasperRpcResponse {
    /// Populated on success; `None` when the node returns a JSON-RPC error.
    result: Option<CasperRpcResult>,
    /// Populated when the node returns a JSON-RPC error (e.g. deploy not found).
    error: Option<serde_json::Value>,
}

/// `result` field of a successful `info_get_deploy` response.
#[derive(Debug, Deserialize)]
struct CasperRpcResult {
    /// The full deploy object returned by `info_get_deploy`.
    deploy: CasperDeploy,
}

/// Relevant fields of a Casper deploy object.
#[derive(Debug, Deserialize)]
struct CasperDeploy {
    /// Block context: caller account and timestamp.
    header: CasperDeployHeader,
    /// Session body — contains `entry_point` and `args`.
    session: serde_json::Value,
}

/// Deploy header fields used by the ICO backfill.
#[derive(Debug, Deserialize)]
struct CasperDeployHeader {
    /// ISO-8601 timestamp of when the deploy was created.
    timestamp: String,
    /// Hex-encoded public key of the account that submitted the deploy.
    account: String,
}

// -----------------------------------------------------------------------------
// Shared context
// -----------------------------------------------------------------------------

/// Shared dependencies for ICO backfill operations.
pub(super) struct IcoBackfillCtx<'a> {
    /// HTTP client used for CSPR.cloud and Casper Node RPC requests.
    pub(super) client: &'a Client,
    /// Indexer configuration (API token, URLs, rate limit).
    pub(super) config: &'a IndexerConfig,
    /// Database connection pool for reading and writing events.
    pub(super) db_pool: &'a PgPool,
    /// Event registry for dispatching processed events.
    pub(super) registry: &'a EventRegistry,
    /// BIG token contract package hash — used to look up purchase amounts in DB.
    pub(super) big_hash: &'a str,
}

// -----------------------------------------------------------------------------
// Public-to-parent API
// -----------------------------------------------------------------------------

/// Backfill the ICO contract by reconstructing `TokensPurchased` events.
///
/// For each successful `purchase` deploy:
/// 1. Fetches the deploy list from CSPR.cloud `/deploys`.
/// 2. Calls Casper Node RPC `info_get_deploy` to get session args
///    (`amount_to_spend`, `currency`).
/// 3. Looks up the corresponding BIG Transfer amount from the database
///    (already stored by the CEP-18 backfill using the same `deploy_hash`).
/// 4. Reconstructs and processes a `TokensPurchased` event.
///
/// Deploys older than ~2–3 days are not accessible on the node and are
/// skipped with a `WARN` log.
pub(super) async fn backfill_ico(
    ctx: &IcoBackfillCtx<'_>,
    contract_type: ContractType,
    contract_hash: &str,
    start_block: u64,
) -> IndexerResult<()> {
    // Pre-fetch all BIG transfers from CSPR.cloud once, keyed by deploy_hash.
    // ICO-initiated transfers are identified by from_hash == ICO contract package hash.
    tracing::info!(%contract_hash, "Pre-fetching BIG transfers from CSPR.cloud");
    let big_amounts =
        load_big_transfers(ctx.client, ctx.config, ctx.big_hash, contract_hash).await?;
    tracing::info!(count = big_amounts.len(), "BIG transfer map ready");

    let mut page = 1u32;
    let mut total_events = 0u64;

    // Resume from the last saved block instead of re-processing the whole history.
    let cursor_block = db::get_cursor(ctx.db_pool, contract_hash).await?;
    let effective_start = cursor_block
        .map_or(0, |b| b.cast_unsigned().saturating_add(1))
        .max(start_block);
    if let Some(b) = cursor_block {
        tracing::info!(block = b, %contract_hash, "Resuming ICO backfill from cursor");
    }

    loop {
        let url = format!(
            "{}/deploys?contract_package_hash={contract_hash}&page={page}&limit=100&order_by=block_height&order_direction=ASC",
            ctx.config.casper.rest_url,
        );
        tracing::debug!(%url, "Fetching ICO deploy list page {page}");

        let response = ctx
            .client
            .get(&url)
            .header("authorization", ctx.config.casper.api_token.expose_secret())
            .timeout(Duration::from_secs(30))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(IndexerError::Api(ApiErrorResponse {
                status: status.as_u16(),
                body,
            }));
        }

        let page_data = response.json::<DeployListPage>().await?;
        let page_count = page_data.page_count;
        let mut page_max_block: Option<u64> = None;

        for deploy_item in &page_data.data {
            if deploy_item.block_height < effective_start || deploy_item.error_message.is_some() {
                continue;
            }

            match process_ico_deploy(ctx, contract_type, contract_hash, deploy_item, &big_amounts)
                .await
            {
                Ok(true) => total_events += 1,
                Ok(false) => {}
                Err(e) => {
                    tracing::warn!(
                        error = %e,
                        deploy = %deploy_item.deploy_hash,
                        "Failed to process ICO deploy, skipping"
                    );
                }
            }

            page_max_block = Some(page_max_block.unwrap_or(0).max(deploy_item.block_height));
            tokio::time::sleep(Duration::from_millis(ctx.config.backfill_rate_limit_ms)).await;
        }

        // Persist progress so restarts resume from here instead of block 0.
        if let Some(max_block) = page_max_block {
            db::update_cursor(ctx.db_pool, contract_hash, max_block.cast_signed()).await?;
        }

        if page >= page_count {
            break;
        }
        page += 1;
    }

    tracing::info!(
        contract = ?contract_type,
        events = total_events,
        "ICO backfill complete"
    );

    Ok(())
}

/// Process a single ICO deploy — fetch from node, parse, and emit event.
///
/// Returns `Ok(true)` if a `TokensPurchased` event was successfully processed,
/// `Ok(false)` if the deploy was skipped (not a `purchase`, node unavailable,
/// or BIG amount not found in DB).
async fn process_ico_deploy(
    ctx: &IcoBackfillCtx<'_>,
    contract_type: ContractType,
    contract_hash: &str,
    deploy_item: &DeployListItem,
    big_amounts: &HashMap<String, String>,
) -> IndexerResult<bool> {
    let deploy_hash = &deploy_item.deploy_hash;

    // 1. fetch deploy from Casper node
    let rpc_body = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "info_get_deploy",
        "params": { "deploy_hash": deploy_hash }
    });

    let rpc_response = ctx
        .client
        .post(&ctx.config.casper.node_url)
        .json(&rpc_body)
        .timeout(Duration::from_secs(15))
        .send()
        .await?
        .json::<CasperRpcResponse>()
        .await?;

    // Node returns a JSON-RPC error when the deploy is too old or unknown.
    if rpc_response.error.is_some() {
        tracing::warn!(
            deploy = %deploy_hash,
            "Deploy not found on Casper node (too old or unknown) — skipping"
        );
        return Ok(false);
    }

    let Some(result) = rpc_response.result else {
        return Ok(false);
    };

    let deploy = result.deploy;

    // 2. check entry_point
    let entry_point = deploy
        .session
        .get("StoredVersionedContractByHash")
        .and_then(|s| s.get("entry_point"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if entry_point != "purchase" {
        return Ok(false);
    }

    // 3. parse args (amount_to_spend, currency)
    let Some((cost, currency_id)) = parse_purchase_args(&deploy.session) else {
        tracing::warn!(deploy = %deploy_hash, "Could not parse purchase args, skipping");
        return Ok(false);
    };

    // 4. look up BIG transfer amount from pre-fetched map
    let Some(big_amount) = big_amounts.get(deploy_hash.as_str()) else {
        tracing::warn!(
            deploy = %deploy_hash,
            "BIG Transfer not found in CSPR.cloud for this deploy — skipping"
        );
        return Ok(false);
    };

    // 5. build and process TokensPurchased event
    let currency_name = ico_currency_name(currency_id);

    let event_data = json!({
        "amount":    big_amount,
        "currency":  currency_name,
        "cost":      cost,
        "timestamp": deploy.header.timestamp,
    });

    let raw = RawEvent {
        contract_hash: contract_hash.to_owned(),
        deploy_hash: deploy_hash.clone(),
        block_height: deploy_item.block_height,
        caller: deploy.header.account.clone(),
        contract_type,
        event_name: "TokensPurchased".to_owned(),
        event_data,
    };

    processor::process_event(ctx.db_pool, ctx.registry, &raw).await?;

    tracing::debug!(
        deploy = %deploy_hash,
        amount = %big_amount,
        currency = %currency_name,
        cost = %cost,
        "ICO TokensPurchased processed"
    );

    Ok(true)
}

/// Extract `(amount_to_spend, currency_id)` from the deploy session args.
///
/// Returns `None` if the expected args are missing or malformed.
#[inline]
pub fn parse_purchase_args(session: &serde_json::Value) -> Option<(String, u8)> {
    let args = session
        .get("StoredVersionedContractByHash")?
        .get("args")?
        .as_array()?;

    let mut cost: Option<String> = None;
    let mut currency_id: Option<u8> = None;

    for arg in args {
        let pair = arg.as_array()?;
        let name = pair.first()?.as_str()?;
        let value = pair.get(1)?;

        match name {
            "amount_to_spend" => {
                // `parsed` is a decimal string for U256
                cost = value.get("parsed").and_then(|v| {
                    // It may be a number or string depending on the node version
                    if let Some(s) = v.as_str() {
                        Some(s.to_owned())
                    } else {
                        v.as_u64().map(|n| n.to_string())
                    }
                });
            }
            "currency" => {
                // ICO Currency enum: CSPR=0, USDC=1, USDT=2 (serialised as U8)
                currency_id = value
                    .get("parsed")
                    .and_then(serde_json::Value::as_u64)
                    .and_then(|n| u8::try_from(n).ok());
            }
            _ => {}
        }
    }

    Some((cost?, currency_id?))
}

/// Map the ICO `Currency` enum variant index to a human-readable string.
///
/// Matches the Rust enum order: `CSPR = 0`, `USDC = 1`, `USDT = 2`.
#[inline]
#[must_use]
pub fn ico_currency_name(id: u8) -> &'static str {
    match id {
        0 => "CSPR",
        1 => "USDC",
        2 => "USDT",
        _ => "UNKNOWN",
    }
}

/// Fetch all BIG token transfers initiated by the ICO contract from CSPR.cloud.
///
/// Paginates through `/ft-token-actions` for the BIG contract, keeping only
/// entries where `from_hash` matches the ICO contract package hash.
///
/// Returns a map of `deploy_hash → amount` for use during ICO backfill.
///
/// # Errors
///
/// Returns [`IndexerError`] on HTTP transport failures or non-2xx API responses.
#[inline]
pub async fn load_big_transfers(
    client: &Client,
    config: &IndexerConfig,
    big_hash: &str,
    ico_hash: &str,
) -> IndexerResult<HashMap<String, String>> {
    let mut map = HashMap::new();
    let mut page = 1u32;

    loop {
        let url = format!(
            "{}/ft-token-actions?contract_package_hash={big_hash}&page={page}&limit=100&order_by=block_height&order_direction=ASC",
            config.casper.rest_url,
        );
        tracing::debug!(%url, "Fetching BIG ft-token-actions page {page}");

        let response = client
            .get(&url)
            .header("authorization", config.casper.api_token.expose_secret())
            .timeout(Duration::from_secs(30))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(IndexerError::Api(ApiErrorResponse {
                status: status.as_u16(),
                body,
            }));
        }

        let page_data = response.json::<BigTransferPage>().await?;
        let page_count = page_data.page_count;

        for item in page_data.data {
            if item.from_hash.as_deref() == Some(ico_hash) {
                map.insert(item.deploy_hash, item.amount);
            }
        }

        tokio::time::sleep(Duration::from_millis(config.backfill_rate_limit_ms)).await;

        if page >= page_count {
            break;
        }
        page += 1;
    }

    Ok(map)
}
