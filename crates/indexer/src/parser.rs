//! CES (Contract Event Standard) event parser.
//!
//! Maps event names and JSON payloads received from the `CSPR.cloud` API
//! into strongly-typed [`IndexedEvent`] variants.
//!
//! ## Disambiguation
//!
//! Several CES event names are shared across contract types — for example,
//! `Transfer` appears in both CEP-18 tokens and CEP-95 NFTs with entirely
//! different field schemas.  The parser uses [`ContractType`] to select the
//! correct deserialization target.

use reqwest::Client;
use secrecy::ExposeSecret;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Value, value};

use crate::{
    backfill::Deploy,
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
    events::{EventEnvelope, IndexedEvent},
};

/// Parse a CES event into a strongly-typed [`IndexedEvent`].
///
/// # Arguments
///
/// * `event_name` — CES event name as reported by the contract (e.g. `"TokensPurchased"`).
/// * `contract_type` — which contract emitted the event; used for disambiguation.
/// * `data` — JSON payload of the event (consumed during deserialization).
///
/// Unknown events are preserved as [`IndexedEvent::Unknown`] so no data is lost.
///
/// # Errors
///
/// Returns [`IndexerError::Parse`] if the JSON payload does not match the
/// expected schema for the given `(contract_type, event_name)` pair.
#[inline]
pub fn parse_event(
    event_name: &str,
    contract_type: ContractType,
    data: Value,
) -> IndexerResult<IndexedEvent> {
    match (contract_type, event_name) {
        // ICO
        (ContractType::Ico, "TokensPurchased") => try_parse(data, IndexedEvent::TokensPurchased),
        (ContractType::Ico, "ICOScheduleAdded") => try_parse(data, IndexedEvent::IcoScheduleAdded),
        (ContractType::Ico, "CurrencyAdded") => try_parse(data, IndexedEvent::CurrencyAdded),
        (ContractType::Ico, "CurrencyRemoved") => try_parse(data, IndexedEvent::CurrencyRemoved),
        (ContractType::Ico, "UnsoldTokensWithdrawn") => {
            try_parse(data, IndexedEvent::UnsoldTokensWithdrawn)
        }

        // Escrow
        (ContractType::Escrow, "InvoiceCreated") => try_parse(data, IndexedEvent::InvoiceCreated),
        (ContractType::Escrow, "InvoicePaid") => try_parse(data, IndexedEvent::InvoicePaid),
        (ContractType::Escrow, "MinDeadlineSet") => try_parse(data, IndexedEvent::MinDeadlineSet),

        // Lease
        (ContractType::Lease, "LeaseAgreementCreated") => {
            try_parse(data, IndexedEvent::LeaseAgreementCreated)
        }
        (ContractType::Lease, "LeaseAgreementFinished") => {
            try_parse(data, IndexedEvent::LeaseAgreementFinished)
        }
        (ContractType::Lease, "LeaseAgreementProlonged") => {
            try_parse(data, IndexedEvent::LeaseAgreementProlonged)
        }

        // NFT (CEP-95)
        (ContractType::Nft, "Mint") => try_parse(data, IndexedEvent::NftMint),
        (ContractType::Nft, "Burn") => try_parse(data, IndexedEvent::NftBurn),
        (ContractType::Nft, "Transfer") => try_parse(data, IndexedEvent::NftTransfer),
        (ContractType::Nft, "Approval") => try_parse(data, IndexedEvent::NftApproval),
        (ContractType::Nft, "ApprovalForAll") => try_parse(data, IndexedEvent::NftApprovalForAll),
        (ContractType::Nft, "RevokeApproval") => try_parse(data, IndexedEvent::NftRevokeApproval),
        (ContractType::Nft, "RevokeApprovalForAll") => {
            try_parse(data, IndexedEvent::NftRevokeApprovalForAll)
        }
        (ContractType::Nft, "MetadataUpdate") => try_parse(data, IndexedEvent::NftMetadataUpdate),
        (ContractType::Nft, "MinterAdded") => try_parse(data, IndexedEvent::NftMinterAdded),
        (ContractType::Nft, "MinterRemoved") => try_parse(data, IndexedEvent::NftMinterRemoved),
        (ContractType::Nft, "BurnerAdded") => try_parse(data, IndexedEvent::NftBurnerAdded),
        (ContractType::Nft, "BurnerRemoved") => try_parse(data, IndexedEvent::NftBurnerRemoved),

        // CEP-18 tokens (BIG / tUSDC / tUSDT)
        (ct, "Transfer") if ct.is_cep18_token() => try_parse(data, IndexedEvent::Cep18Transfer),
        (ct, "TransferFrom") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18TransferFrom)
        }
        (ct, "Mint") if ct.is_cep18_token() => try_parse(data, IndexedEvent::Cep18Mint),
        (ct, "Burn") if ct.is_cep18_token() => try_parse(data, IndexedEvent::Cep18Burn),
        (ct, "SetAllowance") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18SetAllowance)
        }
        (ct, "IncreaseAllowance") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18IncreaseAllowance)
        }
        (ct, "DecreaseAllowance") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18DecreaseAllowance)
        }

        // Treasury
        (ContractType::Treasury, "RewardsDeposited") => {
            try_parse(data, IndexedEvent::RewardsDeposited)
        }
        (ContractType::Treasury, "ReservesWithdrawn") => {
            try_parse(data, IndexedEvent::ReservesWithdrawn)
        }
        (ContractType::Treasury, "TokenWithdrawn") => try_parse(data, IndexedEvent::TokenWithdrawn),

        // Roles
        (ContractType::Roles, "RoleGranted") => try_parse(data, IndexedEvent::RoleGranted),
        (ContractType::Roles, "RoleRevoked") => try_parse(data, IndexedEvent::RoleRevoked),
        (ContractType::Roles, "RoleAdminChanged") => {
            try_parse(data, IndexedEvent::RoleAdminChanged)
        }

        // Shared: OwnershipTransferred (emitted by many contracts)
        (_, "OwnershipTransferred") => try_parse(data, IndexedEvent::OwnershipTransferred),

        // Unknown / unrecognized event
        _ => {
            tracing::warn!(
                contract = %contract_type,
                event = event_name,
                "Unknown CES event, preserving raw data"
            );
            Ok(IndexedEvent::Unknown {
                event_name: event_name.to_owned(),
                raw_data: data,
            })
        }
    }
}

/// Deserialize a [`Value`] into a concrete event struct and wrap
/// it in the corresponding [`IndexedEvent`] variant.
fn try_parse<T: DeserializeOwned>(
    data: Value,
    wrap: fn(T) -> IndexedEvent,
) -> IndexerResult<IndexedEvent> {
    serde_json::from_value(data)
        .map(wrap)
        .map_err(|e| IndexerError::Parse(e.to_string()))
}

/// Maximum characters kept from an RPC error response body.
const RPC_ERROR_BODY_LIMIT: usize = 512;

/// Extract CES events from a single deploy by fetching its execution results
/// from the Casper node RPC (proxied through `CSPR.cloud`).
///
/// # Flow
///
/// 1. Call `info_get_deploy` via `CSPR.cloud` REST proxy.
/// 2. Walk the execution result transforms looking for CES event entries.
/// 3. Parse each discovered event with [`parse_event`].
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
            let event = parse_event(event_name, contract_type, data)?;

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
