//! ICO backfill via CSPR.cloud `/deploys` endpoint.
//!
//! `TokensPurchased` event data is reconstructed from:
//! - deploy session args (`amount_to_spend`, `currency`) returned inline by CSPR.cloud
//! - BIG Transfer amount fetched directly from CSPR.cloud `/ft-token-actions`
//!   (filtered by `from_hash = ICO contract package hash`)

use core::time::Duration;
use std::collections::HashMap;

use chrono::DateTime;
use reqwest::Client;
use secrecy::ExposeSecret;
use serde::Deserialize;

use super::{BackfillContext, db};
use crate::{
    address,
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
    events::ico::{TokensPurchased, tokens_purchased::Currency},
    processor::{self, RawEvent},
};

// CSPR.cloud /ft-token-actions response types (BIG transfers) -----------------

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

// CSPR.cloud /deploys response types ------------------------------------------

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
    /// Session args returned inline by CSPR.cloud (object keyed by arg name).
    #[serde(default)]
    pub(super) args: serde_json::Value,
    /// Hex-encoded public key of the account that submitted the deploy.
    pub(super) caller_public_key: String,
    /// ISO-8601 timestamp of when the deploy was created.
    pub(super) timestamp: String,
}

// Public API ------------------------------------------------------------------

/// Backfill the ICO contract by reconstructing `TokensPurchased` events.
///
/// For each successful `purchase` deploy:
/// 1. Fetches the deploy list from CSPR.cloud `/deploys` (includes session args inline).
/// 2. Parses `amount_to_spend` and `currency` from the deploy's `args` object.
/// 3. Looks up the corresponding BIG Transfer amount from the pre-fetched CSPR.cloud map.
/// 4. Reconstructs and processes a `TokensPurchased` event.
///
/// # Errors
///
/// Returns [`IndexerError`] on HTTP, API, or database failures.
#[inline]
pub async fn backfill_ico(
    ctx: &BackfillContext<'_>,
    big_hash: &str,
    contract_type: ContractType,
    contract_hash: &str,
    start_block: u64,
) -> IndexerResult<()> {
    // Pre-fetch all BIG transfers from CSPR.cloud once, keyed by deploy_hash.
    // ICO-initiated transfers are identified by from_hash == ICO contract package hash.
    tracing::info!(%contract_hash, "Pre-fetching BIG transfers from CSPR.cloud");
    let big_amounts =
        load_big_transfers(ctx.client, ctx.config, big_hash, contract_hash, start_block).await?;
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
            "{}/deploys?contract_package_hash={contract_hash}&page={page}&page_size=100&order_by=block_height&order_direction=ASC",
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
                Ok(success) => {
                    if success {
                        total_events += 1;
                    }
                    page_max_block =
                        Some(page_max_block.unwrap_or(0).max(deploy_item.block_height));
                }
                Err(e) => {
                    tracing::warn!(
                        error = %e,
                        deploy = %deploy_item.deploy_hash,
                        block = deploy_item.block_height,
                        "Failed to process ICO deploy - cursor NOT advanced"
                    );
                }
            }
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

/// Process a single ICO deploy — parse inline args and emit event.
///
/// Returns `Ok(true)` if a `TokensPurchased` event was successfully processed,
/// `Ok(false)` if the deploy was skipped (not a `purchase` call or BIG amount
/// not found in pre-fetched map).
async fn process_ico_deploy(
    ctx: &BackfillContext<'_>,
    contract_type: ContractType,
    contract_hash: &str,
    deploy_item: &DeployListItem,
    big_amounts: &HashMap<String, String>,
) -> IndexerResult<bool> {
    let deploy_hash = &deploy_item.deploy_hash;

    // 1. parse args (amount_to_spend, currency) from inline CSPR.cloud data
    let Some((cost, currency_id)) = parse_purchase_args(&deploy_item.args) else {
        // Not a `purchase` call or args are malformed — skip silently.
        return Ok(false);
    };

    // 2. look up BIG transfer amount from pre-fetched map
    let Some(big_amount) = big_amounts.get(deploy_hash.as_str()) else {
        tracing::warn!(
            deploy = %deploy_hash,
            "BIG Transfer not found in CSPR.cloud for this deploy — skipping"
        );
        return Ok(false);
    };

    // 3. build and process TokensPurchased event
    let currency_name = ico_currency_name(currency_id);

    // Convert ISO-8601 timestamp to Unix epoch seconds (u64).
    let timestamp_secs: u64 = DateTime::parse_from_rfc3339(&deploy_item.timestamp).map_or_else(
        |e| {
            tracing::warn!(
                deploy = %deploy_hash,
                raw = %deploy_item.timestamp,
                error = %e,
                "Failed to parse deploy timestamp — storing 0"
            );
            0
        },
        |dt| dt.timestamp().max(0).cast_unsigned(),
    );

    // `price` is None: not available during backfill.
    let typed_event = TokensPurchased {
        amount: big_amount.clone(),
        currency: Currency::from(currency_id),
        price: None,
        cost: cost.clone(),
        timestamp: timestamp_secs,
    };
    let event_data = serde_json::to_value(&typed_event)?;

    let block_timestamp = DateTime::parse_from_rfc3339(&deploy_item.timestamp)
        .ok()
        .map(|dt| dt.to_utc());

    let raw = RawEvent {
        contract_hash: contract_hash.to_owned(),
        deploy_hash: deploy_hash.clone(),
        block_height: deploy_item.block_height,
        caller: address::normalize_to_account_hash(&deploy_item.caller_public_key)?,
        contract_type,
        event_name: "TokensPurchased".to_owned(),
        event_data,
        block_timestamp,
        transform_idx: None,
    };

    processor::process_event(ctx.db_pool, ctx.registry, ctx.known_hashes, &raw).await?;

    tracing::debug!(
        deploy = %deploy_hash,
        amount = %big_amount,
        currency = %currency_name,
        cost = %cost,
        "ICO TokensPurchased processed"
    );

    Ok(true)
}

/// Extract `(amount_to_spend, currency_id)` from the deploy args object.
///
/// CSPR.cloud returns args as `{ "arg_name": { "cl_type": "…", "parsed": … } }`.
/// Returns `None` if the expected args are missing or malformed.
#[inline]
#[must_use]
pub fn parse_purchase_args(args: &serde_json::Value) -> Option<(String, u8)> {
    let cost = args.get("amount_to_spend")?.get("parsed").and_then(|v| {
        // `parsed` may be a string or number depending on the type
        v.as_str()
            .map(ToOwned::to_owned)
            .or_else(|| v.as_u64().map(|n| n.to_string()))
    })?;
    let currency_id = args
        .get("currency")?
        .get("parsed")?
        .as_u64()
        .and_then(|n| u8::try_from(n).ok())?;
    Some((cost, currency_id))
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
/// Returns a map of `deploy_hash -> amount` for use during ICO backfill.
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
    start_block: u64,
) -> IndexerResult<HashMap<String, String>> {
    let mut map = HashMap::new();
    let mut page = 1u32;

    loop {
        let url = format!(
            "{}/ft-token-actions?contract_package_hash={big_hash}&page={page}&page_size=100&order_by=block_height&order_direction=ASC&block_height[gte]={start_block}",
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
