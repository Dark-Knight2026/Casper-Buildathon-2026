//! REST backfill client for historical event synchronization.
//!
//! Fetches deploy history from the `CSPR.cloud` REST API for each tracked
//! contract, extracts CES events from the Casper Node RPC execution results,
//! and forwards them for processing.
//!
//! ## How it works
//!
//! For each contract in [`ContractRegistry`](crate::config::ContractRegistry):
//! - Load the cursor (last processed page) from the database.
//! - Fetch deploys via `GET /deploys?contract_package_hash={hash}`.
//! - For each deploy, call the Casper Node RPC (`info_get_deploy`) to
//!   obtain the execution results that contain CES events.
//! - Forward each event to the processor.
//! - Sleep between pages to respect `CSPR.cloud` rate limits.
//! After all pages are consumed the cursor is updated.

use core::time::Duration;

use reqwest::Client;
use secrecy::ExposeSecret;
use serde::Deserialize;
use sqlx::PgPool;

use crate::{
    client,
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
};

/// Top-level paginated response returned by `GET /deploys`.
#[derive(Debug, Deserialize)]
pub struct DeployListResponse {
    /// List of deploys on the current page.
    pub data: Vec<Deploy>,
    /// Total number of pages available.
    #[serde(rename = "pageCount")]
    pub page_count: u32,
    /// Total number of items across all pages.
    #[serde(rename = "itemCount")]
    pub item_count: u32,
}

/// A single deploy (transaction) returned by the `CSPR.cloud` REST API.
#[derive(Debug, Deserialize)]
pub struct Deploy {
    /// Hex-encoded deploy hash (64 characters).
    pub deploy_hash: String,
    /// Hash of the block that includes this deploy.
    pub block_hash: String,
    /// Block height at which the deployment was included.
    pub block_height: u64,
    /// ISO-8601 timestamp of the deployment.
    pub timestamp: String,
    /// Public key of the account that submitted the deployment.
    pub caller_public_key: String,
    /// Contract package hash called by this deploy.
    pub contract_package_hash: Option<String>,
    /// Deploy execution status (`executed`, etc.).
    pub status: Option<String>,
    /// Human-readable error if the deployment failed.
    pub error_message: Option<String>,
}

/// Maximum number of characters kept from an error response body.
const ERROR_BODY_LIMIT: usize = 512;
/// Number of deploys fetched per page.
const PAGE_SIZE: u32 = 100;

/// Run backfill for **all** active contracts in the registry.
///
/// Iterates over every configured contract, fetches its full deploy history
/// from the `CSPR.cloud` REST API, and processes the CES events found in each
/// deploys execution results.
///
/// # Errors
///
/// Returns [`IndexerError::Http`] if a `CSPR.cloud` request fails,
/// [`IndexerError::Api`] on non-2xx responses, or [`IndexerError::Database`]
/// on cursor / event persistence failures.
#[inline]
pub async fn run_backfill(config: &IndexerConfig, db: &PgPool) -> IndexerResult<()> {
    let client = Client::builder().timeout(Duration::from_secs(30)).build()?;

    for contract in config.contracts.active_contracts() {
        tracing::info!(
            contract = %contract.contract_type,
            hash = %contract.hash,
            "Starting backfill"
        );

        backfill_contract(&client, config, db, contract.contract_type, contract.hash).await?;
        tracing::info!(contract = %contract.contract_type, "Backfill complete");
    }

    Ok(())
}

/// Backfill a single contract by paginating through its deploy history.
#[allow(unused_variables)]
async fn backfill_contract(
    client: &Client,
    config: &IndexerConfig,
    db: &PgPool,
    contract_type: ContractType,
    contract_hash: &str,
) -> IndexerResult<()> {
    // TODO (step 7): load starting page from cursor
    //   let cursor = cursor::get_cursor(db, &format!("backfill_{contract_type}")).await?;
    let mut page: u32 = 1;

    loop {
        let response = fetch_deploys(client, config, contract_hash, page).await?;
        if response.data.is_empty() {
            break;
        }
        for deploy in &response.data {
            // Skip failed deploys — they did not emit events.
            if deploy.error_message.is_some() {
                tracing::debug!(
                    deploy_hash = %deploy.deploy_hash,
                    "Skipping failed deploy"
                );
                continue;
            }

            tracing::debug!(
                deploy_hash = %deploy.deploy_hash,
                block_height = deploy.block_height,
                contract = %contract_type,
                "Processing deploy"
            );

            let envelopes = client::extract_events(client, config, deploy, contract_type).await?;
            if !envelopes.is_empty() {
                tracing::info!(
                    deploy_hash = %deploy.deploy_hash,
                    count = envelopes.len(),
                    "Extracted CES events"
                );
            }

            // TODO (step 7): process each event.
            //   for envelope in envelopes {
            //       processor::process_event(db, envelope).await?;
            //   }
        }

        tracing::info!(
            contract = %contract_type,
            page,
            total_pages = response.page_count,
            "Backfill page processed"
        );

        // Respect rate limits.
        tokio::time::sleep(Duration::from_millis(config.backfill_rate_limit_ms)).await;

        if page >= response.page_count {
            break;
        }
        page += 1;
    }

    // TODO (step 7): update cursor
    //   cursor::update_cursor(db, &format!("backfill_{contract_type}"), page as i64).await?;

    Ok(())
}

/// Fetch a single page of deploys for a given contract package hash.
async fn fetch_deploys(
    client: &Client,
    config: &IndexerConfig,
    contract_hash: &str,
    page: u32,
) -> IndexerResult<DeployListResponse> {
    let url = format!(
        "{}/deploys?contract_package_hash={}&page={page}&limit={PAGE_SIZE}&order_direction=ASC",
        config.cspr_cloud_rest_url, contract_hash,
    );

    let response = client
        .get(&url)
        .header("authorization", config.cspr_cloud_api_token.expose_secret())
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response
            .text()
            .await
            .unwrap_or_default()
            .chars()
            .take(ERROR_BODY_LIMIT)
            .collect();
        return Err(IndexerError::Api(ApiErrorResponse { status, body }));
    }

    Ok(response.json().await?)
}
