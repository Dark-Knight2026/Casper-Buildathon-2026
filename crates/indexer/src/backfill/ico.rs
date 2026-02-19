//! ICO backfill via CSPR.cloud `/deploys` + Casper Node RPC `info_get_deploy`.
//!
//! `TokensPurchased` event data is reconstructed from:
//! - deploy session args (`amount_to_spend`, `currency`) fetched from the node
//! - BIG Transfer amount already stored in DB by the CEP-18 backfill

use core::time::Duration;

use reqwest::Client;
use secrecy::ExposeSecret;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;

use crate::{
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
    events::EventRegistry,
    processor::{self, RawEvent},
};

// -----------------------------------------------------------------------------
// CSPR.cloud /deploys response types
// -----------------------------------------------------------------------------

/// Top-level response from the `/deploys` endpoint.
#[derive(Debug, Deserialize)]
struct DeployListPage {
    data: Vec<DeployListItem>,
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
    let mut page = 1u32;
    let mut total_events = 0u64;

    loop {
        let url = format!(
            "{}/deploys?contract_package_hash={contract_hash}&page={page}&limit=100&order_by=block_height&order_direction=ASC",
            ctx.config.cspr_cloud_rest_url,
        );
        tracing::debug!(%url, "Fetching ICO deploy list page {page}");

        let response = ctx
            .client
            .get(&url)
            .header(
                "authorization",
                ctx.config.cspr_cloud_api_token.expose_secret(),
            )
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
        let page_len = page_data.data.len();

        for deploy_item in &page_data.data {
            if deploy_item.block_height < start_block || deploy_item.error_message.is_some() {
                continue;
            }

            match process_ico_deploy(ctx, contract_type, contract_hash, deploy_item).await {
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

            tokio::time::sleep(Duration::from_millis(ctx.config.backfill_rate_limit_ms)).await;
        }

        if page_len < 100 {
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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

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
) -> IndexerResult<bool> {
    let deploy_hash = &deploy_item.deploy_hash;

    // --- Step 1: fetch deploy from Casper node ---
    let rpc_body = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "info_get_deploy",
        "params": { "deploy_hash": deploy_hash }
    });

    let rpc_response = ctx
        .client
        .post(&ctx.config.casper_node_url)
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

    // --- Step 2: check entry_point ---
    let entry_point = deploy
        .session
        .get("StoredVersionedContractByHash")
        .and_then(|s| s.get("entry_point"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if entry_point != "purchase" {
        return Ok(false);
    }

    // --- Step 3: parse args (amount_to_spend, currency) ---
    let Some((cost, currency_id)) = parse_purchase_args(&deploy.session) else {
        tracing::warn!(deploy = %deploy_hash, "Could not parse purchase args, skipping");
        return Ok(false);
    };

    // --- Step 4: look up BIG transfer amount from DB ---
    let Some(big_amount) = find_big_transfer_amount(ctx.db_pool, deploy_hash, ctx.big_hash).await
    else {
        tracing::warn!(
            deploy = %deploy_hash,
            "BIG Transfer not found in DB for this deploy — CEP-18 backfill may not have run yet"
        );
        return Ok(false);
    };

    // --- Step 5: build and process TokensPurchased event ---
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
fn parse_purchase_args(session: &serde_json::Value) -> Option<(String, u8)> {
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
                    // May be a number or string depending on the node version
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
fn ico_currency_name(id: u8) -> &'static str {
    match id {
        0 => "CSPR",
        1 => "USDC",
        2 => "USDT",
        _ => "UNKNOWN",
    }
}

/// Look up the BIG token transfer amount for a given deploy from the database.
///
/// The CEP-18 backfill stores BIG `Transfer` events keyed by `deploy_hash`.
/// Since every ICO `purchase` triggers exactly one BIG `Transfer` (ICO → buyer),
/// this cross-reference reliably gives us the purchased token amount.
async fn find_big_transfer_amount(
    db_pool: &PgPool,
    deploy_hash: &str,
    big_hash: &str,
) -> Option<String> {
    let row = sqlx::query!(
        r#"
        SELECT event_data->>'amount' AS amount
        FROM   blockchain_events
        WHERE  transaction_hash  = $1
          AND  contract_address  = $2
          AND  event_type        = 'Transfer'
        LIMIT  1
        "#,
        deploy_hash,
        big_hash,
    )
    .fetch_optional(db_pool)
    .await
    .ok()??;

    row.amount
}
