//! REST backfill client for historical event synchronization.
//!
//! Fetches deploy history from the CSPR.cloud Deploy API and processes events
//! through the same trait-based processor as the streaming client, ensuring
//! identical handling for both historical and live events.

use core::time::Duration;

use reqwest::Client;
use secrecy::ExposeSecret;
use serde::Deserialize;
use sqlx::PgPool;

use crate::{
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
    events::EventRegistry,
    processor::{self, RawEvent},
};

// -----------------------------------------------------------------------------
// CSPR.cloud API response types
// -----------------------------------------------------------------------------

/// Top-level response from the `/deploys` endpoint.
#[derive(Debug, Deserialize)]
struct DeployListResponse {
    data: Vec<DeployInfo>,
}

/// Metadata for a single deploy returned by the API.
#[derive(Debug, Deserialize)]
struct DeployInfo {
    deploy_hash: String,
    block_height: u64,
    caller_public_key: String,
    execution_results: Vec<ExecutionResult>,
}

/// Execution result of a deployment (may contain CES event transforms).
#[derive(Debug, Deserialize)]
struct ExecutionResult {
    #[serde(default)]
    transforms: Vec<Transform>,
}

/// A single state transform produced by a deployment.
#[derive(Debug, Deserialize)]
struct Transform {
    #[allow(dead_code)]
    key: String,
    transform: TransformValue,
}

/// Discriminated transform payload — only `WriteCLValue` carries CES events.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum TransformValue {
    /// A `CLValue` write — CES events are stored here with `cl_type = "Any"`.
    WriteCLValue {
        #[serde(rename = "WriteCLValue")]
        write_cl_value: ClValueData,
    },
    /// Any other transform kind (ignored by the indexer).
    #[allow(dead_code)]
    Other(serde_json::Value),
}

/// Parsed `CLValue` with its type tag and optional JSON representation.
#[derive(Debug, Deserialize)]
struct ClValueData {
    cl_type: String,
    #[serde(default)]
    parsed: Option<serde_json::Value>,
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/// Run backfill for all configured contracts.
///
/// Fetches every deploy from `start_block` onwards for each active contract
/// and processes events through the shared [`processor`].
///
/// # Errors
///
/// Returns [`IndexerError`] on HTTP, API, or database failures.
#[inline]
pub async fn run_backfill(config: &IndexerConfig, db_pool: &PgPool) -> IndexerResult<()> {
    let client = Client::new();
    let registry = EventRegistry::new();

    tracing::info!("Starting backfill for all contracts");

    for contract in config.contracts.active_contracts() {
        tracing::info!(
            contract = ?contract.contract_type,
            hash = %contract.hash,
            start_block = contract.start_block,
            "Backfilling contract"
        );

        backfill_contract(
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

    tracing::info!("Backfill completed successfully");
    Ok(())
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

/// Backfill a single contract by paginating through the CSPR.cloud deploy API.
async fn backfill_contract(
    client: &Client,
    config: &IndexerConfig,
    db_pool: &PgPool,
    registry: &EventRegistry,
    contract_type: ContractType,
    contract_hash: &str,
    start_block: u64,
) -> IndexerResult<()> {
    let mut page = 1u32;
    let mut total_events = 0u64;

    loop {
        let url = format!(
            "{}/deploys?contract_hash={}&page={}&limit=100&order_direction=ASC",
            config.cspr_cloud_rest_url, contract_hash, page
        );
        tracing::debug!(%url, "Fetching deploys page {page}");

        let response = client
            .get(&url)
            .header(
                "authorization",
                config.cspr_cloud_api_token.expose_secret(),
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

        let deploy_list = response.json::<DeployListResponse>().await?;
        let page_len = deploy_list.data.len();

        for deploy in &deploy_list.data {
            if deploy.block_height < start_block {
                continue;
            }

            let events = extract_ces_events(&deploy.execution_results);

            for (event_name, event_data) in events {
                let raw = RawEvent {
                    contract_hash: contract_hash.to_owned(),
                    deploy_hash: deploy.deploy_hash.clone(),
                    block_height: deploy.block_height,
                    caller: deploy.caller_public_key.clone(),
                    contract_type,
                    event_name: event_name.clone(),
                    event_data,
                };

                match processor::process_event(db_pool, registry, &raw).await {
                    Ok(()) => total_events += 1,
                    Err(e) => {
                        tracing::warn!(
                            error = %e,
                            deploy = %deploy.deploy_hash,
                            event = %event_name,
                            "Failed to process event, skipping"
                        );
                    }
                }
            }
        }

        tokio::time::sleep(Duration::from_millis(config.backfill_rate_limit_ms)).await;

        if page_len < 100 {
            break;
        }

        page += 1;
    }

    tracing::info!(
        contract = ?contract_type,
        events = total_events,
        "Contract backfill complete"
    );

    Ok(())
}

/// Extract CES events from a deployment execution results.
///
/// CES events are stored as `WriteCLValue` transforms with `cl_type = "Any"`
/// and a parsed JSON payload of the form `{ "event_name": "...", "data": {...} }`.
fn extract_ces_events(results: &[ExecutionResult]) -> Vec<(String, serde_json::Value)> {
    let mut events = Vec::new();

    for result in results {
        for transform in &result.transforms {
            let TransformValue::WriteCLValue { write_cl_value } = &transform.transform else {
                continue;
            };

            if write_cl_value.cl_type != "Any" {
                continue;
            }

            let Some(parsed) = &write_cl_value.parsed else {
                continue;
            };

            let Some(obj) = parsed.as_object() else {
                continue;
            };

            let Some(event_name) = obj.get("event_name").and_then(|v| v.as_str()) else {
                continue;
            };

            let Some(data) = obj.get("data") else {
                continue;
            };

            events.push((event_name.to_owned(), data.clone()));
        }
    }

    events
}
