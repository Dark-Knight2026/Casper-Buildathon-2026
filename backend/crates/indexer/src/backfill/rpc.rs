//! Casper node JSON-RPC client for reading on-chain state.
//!
//! Provides low-level wrappers around the Casper node RPC methods needed for
//! CES backfill: reading named keys, querying U32 values, and fetching
//! dictionary items by seed `URef` + key.

use std::collections::HashMap;

use reqwest::Client;
use secrecy::{ExposeSecret, SecretString};
use serde::Deserialize;
use serde_json::{Value, json};

use crate::error::{IndexerError, IndexerResult};

/// JSON-RPC 2.0 response envelope.
#[derive(Debug, Deserialize)]
struct RpcResponse {
    result: Option<Value>,
    error: Option<Value>,
}

/// A thin wrapper around the Casper node JSON-RPC interface.
#[derive(Debug)]
pub struct CasperRpc<'a> {
    client: &'a Client,
    url: &'a str,
    api_token: &'a SecretString,
}

impl<'a> CasperRpc<'a> {
    /// Create a new RPC client pointing at `url` with the given auth token.
    #[inline]
    #[must_use]
    pub fn new(client: &'a Client, url: &'a str, api_token: &'a SecretString) -> Self {
        Self {
            client,
            url,
            api_token,
        }
    }

    /// Fetch the latest state root hash from the node.
    #[inline]
    pub async fn get_state_root_hash(&self) -> IndexerResult<String> {
        let result = self.call("info_get_status", Value::Null).await?;

        result["last_added_block_info"]["state_root_hash"]
            .as_str()
            .map(String::from)
            .ok_or_else(|| IndexerError::Parse("missing state_root_hash in info_get_status".into()))
    }

    /// Resolve a contract package hash to the latest contract (entity) hash.
    ///
    /// Casper 1.x stores versions under `ContractPackage.versions[].contract_hash`,
    /// Casper 2.x under `Package.versions[].entity_hash`.
    #[inline]
    pub async fn resolve_contract_hash(
        &self,
        state_root: &str,
        package_hash: &str,
    ) -> IndexerResult<String> {
        let params = json!({
            "state_identifier": { "StateRootHash": state_root },
            "key": format!("hash-{package_hash}"),
            "path": []
        });

        let result = self.call("query_global_state", params).await?;
        let stored = &result["stored_value"];

        // Casper 1.x: ContractPackage.versions[].contract_hash
        if let Some(versions) = stored["ContractPackage"]["versions"].as_array()
            && let Some(hash) = versions.last().and_then(|v| v["contract_hash"].as_str())
        {
            return Ok(hash.strip_prefix("contract-").unwrap_or(hash).to_owned());
        }

        // Casper 2.x: Package.versions[].entity_hash
        if let Some(versions) = stored["Package"]["versions"].as_array()
            && let Some(hash) = versions.last().and_then(|v| {
                v["entity_hash"]
                    .as_str()
                    .or_else(|| v["contract_hash"].as_str())
            })
        {
            return Ok(hash
                .strip_prefix("entity-contract-")
                .or_else(|| hash.strip_prefix("contract-"))
                .unwrap_or(hash)
                .to_owned());
        }

        Err(IndexerError::Parse(format!(
            "Cannot resolve contract hash from package {package_hash}: \
             no ContractPackage or Package in stored_value"
        )))
    }

    /// Query named keys of a contract by its package hash.
    ///
    /// Automatically resolves the package hash to the latest contract hash,
    /// since named keys (including `__events`) live on the contract, not the package.
    ///
    /// Returns a map of `name -> hex URef string` (e.g. `"uref-abcd...-007"`).
    #[inline]
    pub async fn get_contract_named_keys(
        &self,
        state_root: &str,
        package_hash: &str,
    ) -> IndexerResult<HashMap<String, String>> {
        let contract_hash = self.resolve_contract_hash(state_root, package_hash).await?;

        tracing::debug!(
            %package_hash,
            %contract_hash,
            "Resolved package hash to contract hash"
        );

        let params = json!({
            "state_identifier": { "StateRootHash": state_root },
            "key": format!("hash-{contract_hash}"),
            "path": []
        });

        let result = self.call("query_global_state", params).await?;
        let stored = &result["stored_value"];

        // Casper 1.x stores contracts under "Contract", while Casper 2.x
        // uses "AddressableEntity". Try both paths.
        let named_keys = stored["Contract"]["named_keys"]
            .as_array()
            .or_else(|| stored["AddressableEntity"]["named_keys"].as_array());

        let Some(arr) = named_keys else {
            tracing::error!(
                contract = %contract_hash,
                "named_keys not found in stored_value (neither Contract nor AddressableEntity)"
            );
            return Ok(HashMap::new());
        };

        let mut map = HashMap::new();
        for entry in arr {
            if let (Some(name), Some(key)) = (entry["name"].as_str(), entry["key"].as_str()) {
                map.insert(name.to_owned(), key.to_owned());
            }
        }

        Ok(map)
    }

    /// Read a U32 `CLValue` stored at the given key (e.g. a `URef`).
    #[inline]
    pub async fn query_u32(&self, state_root: &str, uref: &str) -> IndexerResult<u32> {
        let params = json!({
            "state_identifier": { "StateRootHash": state_root },
            "key": uref,
            "path": []
        });

        let result = self.call("query_global_state", params).await?;
        let bytes_hex = result["stored_value"]["CLValue"]["bytes"]
            .as_str()
            .ok_or_else(|| IndexerError::Parse("missing CLValue bytes for U32".into()))?;

        let bytes =
            hex::decode(bytes_hex).map_err(|e| IndexerError::Parse(format!("hex decode: {e}")))?;

        let len = bytes.len();
        let arr = bytes
            .try_into()
            .map_err(|_| IndexerError::Parse(format!("U32 CLValue expected 4 bytes, got {len}")))?;
        Ok(u32::from_le_bytes(arr))
    }

    /// Fetch raw CES event bytes from a dictionary item.
    ///
    /// CES events are stored as `CLType::Bytes` in the `__events` dictionary.
    /// The `CLValue.bytes` field contains the bytesrepr-serialized `Bytes` value:
    /// `u32_length ++ raw_event_data`. This method strips the 4-byte length
    /// prefix and returns only the raw event data.
    #[inline]
    pub async fn get_dictionary_item_bytes(
        &self,
        state_root: &str,
        seed_uref: &str,
        key: &str,
    ) -> IndexerResult<Vec<u8>> {
        let params = json!({
            "state_root_hash": state_root,
            "dictionary_identifier": {
                "URef": {
                    "seed_uref": seed_uref,
                    "dictionary_item_key": key
                }
            }
        });

        let result = self.call("state_get_dictionary_item", params).await?;
        let bytes_hex = result["stored_value"]["CLValue"]["bytes"]
            .as_str()
            .ok_or_else(|| {
                IndexerError::Parse("missing CLValue bytes in dictionary item".into())
            })?;

        let raw =
            hex::decode(bytes_hex).map_err(|e| IndexerError::Parse(format!("hex decode: {e}")))?;

        // Strip the outer Bytes wrapper (u32 length prefix).
        if raw.len() < 4 {
            return Err(IndexerError::Parse(format!(
                "CLValue bytes too short for Bytes wrapper: {} bytes",
                raw.len()
            )));
        }
        let inner_len = u32::from_le_bytes([raw[0], raw[1], raw[2], raw[3]]) as usize;
        let event_data = &raw[4..];
        if event_data.len() < inner_len {
            return Err(IndexerError::Parse(format!(
                "Bytes wrapper length {inner_len} exceeds available data {}",
                event_data.len()
            )));
        }
        Ok(event_data[..inner_len].to_vec())
    }

    /// Send a JSON-RPC 2.0 request and return the `result` field.
    ///
    /// Pass `Value::Null` for methods that take no parameters (e.g. `info_get_status`).
    async fn call(&self, method: &str, params: Value) -> IndexerResult<Value> {
        let mut body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
        });
        if !params.is_null() {
            body["params"] = params;
        }

        let response = self
            .client
            .post(self.url)
            .header("authorization", self.api_token.expose_secret())
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(IndexerError::Parse(format!(
                "RPC {method} HTTP {status}: {text}"
            )));
        }

        let rpc = response.json::<RpcResponse>().await?;

        if let Some(err) = rpc.error {
            return Err(IndexerError::Parse(format!(
                "RPC {method} error {}: {}",
                err["code"], err["message"]
            )));
        }

        rpc.result
            .ok_or_else(|| IndexerError::Parse(format!("RPC {method}: no result field")))
    }
}
