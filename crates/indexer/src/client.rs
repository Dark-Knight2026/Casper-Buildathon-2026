//! HTTP/RPC client for fetching deploy execution results from the Casper node
//! via `CSPR.cloud`.
//!
//! Encapsulates all network I/O required to obtain CES events from a single
//! deploy.  The actual event parsing is delegated to [`parser::parse_event`].

use reqwest::Client;
use secrecy::ExposeSecret;
use serde::{Deserialize, Serialize};
use serde_json::{Value, value};

use crate::{
    backfill::Deploy,
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
    events::EventEnvelope,
    parser,
};

/// Maximum characters kept from an RPC error response body.
const RPC_ERROR_BODY_LIMIT: usize = 512;

/// Extract CES events from a single deploy by fetching its execution results
/// from the Casper node RPC (proxied through `CSPR.cloud`).
///
/// # Flow
///
/// 1. Call `info_get_deploy` via `CSPR.cloud` REST proxy.
/// 2. Walk the execution result transforms looking for CES event entries.
/// 3. Parse each discovered event with [`parser::parse_event`].
/// 4. Wrap every parsed event in an [`EventEnvelope`] with deploy metadata.
///
/// # Errors
///
/// Returns [`IndexerError::Http`] if the RPC call fails,
/// [`IndexerError::Api`] on non-2xx responses, or
/// [`IndexerError::Parse`] if event data cannot be deserialized.
#[inline]
pub async fn extract_events(
    client: &Client,
    config: &IndexerConfig,
    deploy: &Deploy,
    contract_type: ContractType,
) -> IndexerResult<Vec<EventEnvelope>> {
    let rpc_result = fetch_deploy_rpc(client, config, &deploy.deploy_hash).await?;
    let Some(execution_results) = rpc_result.execution_results else {
        return Ok(Vec::new());
    };
    let mut envelopes = Vec::new();
    for exec in &execution_results {
        for transform in &exec.transforms {
            // CES events are stored under dictionary keys that contain the
            // event schema.  CSPR.cloud RPC returns them with `WriteCLValue`
            // transforms whose key starts with "dictionary-".
            let Some(ref event_data) = transform.value else {
                continue;
            };
            let Some(ref event_name) = event_data.event_name else {
                continue;
            };

            let data = event_data
                .data
                .clone()
                .unwrap_or(Value::Object(value::Map::default()));
            let event = parser::parse_event(event_name, contract_type, data)?;

            envelopes.push(EventEnvelope {
                contract_type,
                contract_hash: deploy.contract_package_hash.clone().unwrap_or_default(),
                deploy_hash: deploy.deploy_hash.clone(),
                block_height: deploy.block_height,
                caller: deploy.caller_public_key.clone(),
                event_name: event_name.clone(),
                event,
            });
        }
    }

    Ok(envelopes)
}

/// JSON-RPC 2.0 request sent to the Casper node via `CSPR.cloud`.
#[derive(Debug, Serialize)]
struct RpcRequest<'a> {
    /// Protocol version — always `"2.0"`.
    jsonrpc: &'static str,
    /// Request identifier.
    id: u32,
    /// RPC method name.
    method: &'static str,
    /// Positional parameters for the method.
    params: [&'a str; 1],
}

impl Default for RpcRequest<'_> {
    fn default() -> Self {
        Self {
            jsonrpc: "2.0",
            id: 1,
            method: "info_get_deploy",
            params: [""],
        }
    }
}

/// Fetch deploy execution results from the Casper node RPC via `CSPR.cloud`.
async fn fetch_deploy_rpc(
    client: &Client,
    config: &IndexerConfig,
    deploy_hash: &str,
) -> IndexerResult<RpcDeployResult> {
    let url = format!("{}/rpc", config.cspr_cloud_rest_url);
    let body = RpcRequest {
        params: [deploy_hash],
        ..Default::default()
    };

    let response = client
        .post(&url)
        .header("authorization", config.cspr_cloud_api_token.expose_secret())
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response
            .text()
            .await
            .unwrap_or_default()
            .chars()
            .take(RPC_ERROR_BODY_LIMIT)
            .collect();
        return Err(IndexerError::Api(ApiErrorResponse { status, body }));
    }

    let rpc = response
        .json::<RpcResponse>()
        .await
        .map_err(|e| IndexerError::Parse(format!("Failed to deserialize RPC response: {e}")))?;

    Ok(rpc.result)
}

/// Top-level JSON-RPC 2.0 response wrapper.
#[derive(Debug, Deserialize)]
struct RpcResponse {
    /// The `result` field of the JSON-RPC response.
    result: RpcDeployResult,
}

/// Subset of `info_get_deploy` result we care about.
#[derive(Debug, Deserialize)]
struct RpcDeployResult {
    /// Execution results for this deploy (one per block inclusion).
    execution_results: Option<Vec<RpcExecutionResult>>,
}

/// A single execution result from the Casper node.
#[derive(Debug, Deserialize)]
struct RpcExecutionResult {
    /// State transforms produced by the deploy execution.
    #[serde(default)]
    transforms: Vec<RpcTransform>,
}

/// A single state transform entry.
#[derive(Debug, Deserialize)]
struct RpcTransform {
    /// The parsed CES event data (if this transform represents a CES event).
    value: Option<CesEventCandidate>,
}

/// A potential CES event extracted from a transform value.
///
/// The exact JSON shape depends on how `CSPR.cloud` surfaces CES events
/// in the RPC proxy response.  Fields are optional so that non-event
/// transforms are silently skipped.
#[derive(Debug, Deserialize)]
struct CesEventCandidate {
    /// CES event name (e.g. `"TokensPurchased"`).
    event_name: Option<String>,
    /// Event payload as arbitrary JSON.
    data: Option<Value>,
}
