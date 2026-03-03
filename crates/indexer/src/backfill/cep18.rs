//! CEP-18 token backfill via CSPR.cloud `/ft-token-actions`.

use core::time::Duration;

use reqwest::Client;
use secrecy::ExposeSecret;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::PgPool;

use super::db;
use crate::{
    config::{ContractType, IndexerConfig},
    error::{ApiErrorResponse, IndexerError, IndexerResult},
    events::EventRegistry,
    processor::{self, RawEvent},
};

/// Top-level response from the `/ft-token-actions` endpoint.
///
/// Exposed as `pub` so tests can inspect the deserialized response returned by
/// [`fetch_ft_token_actions_page`].
#[derive(Debug, Deserialize)]
pub struct FtTokenActionPage {
    /// Token actions on this page.
    pub data: Vec<FtTokenAction>,
    /// Total number of pages for the current query (used for pagination).
    pub page_count: u32,
}

/// Type of fungible-token action as returned by CSPR.cloud `/ft-token-action-types`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "u8", into = "u8")]
pub enum FtActionType {
    /// New tokens created (no sender).
    Mint,
    /// Direct transfer between accounts.
    Transfer,
    /// Allowance approval (owner authorizes spender).
    Approve,
    /// Any action type not explicitly handled (e.g. Burn = 4).
    Unknown(u8),
}

impl From<u8> for FtActionType {
    #[inline]
    fn from(value: u8) -> Self {
        match value {
            1 => Self::Mint,
            2 => Self::Transfer,
            3 => Self::Approve,
            other => Self::Unknown(other),
        }
    }
}

impl From<FtActionType> for u8 {
    #[inline]
    fn from(value: FtActionType) -> Self {
        match value {
            FtActionType::Mint => 1,
            FtActionType::Transfer => 2,
            FtActionType::Approve => 3,
            FtActionType::Unknown(v) => v,
        }
    }
}

/// A single fungible-token action returned by CSPR.cloud.
#[derive(Debug, Deserialize)]
pub struct FtTokenAction {
    /// Hash of the deploy that triggered this action.
    pub deploy_hash: String,
    /// Block in which the deploy was included.
    pub block_height: u64,
    /// Sender account/contract hash. `None` for Mint actions.
    pub from_hash: Option<String>,
    /// Recipient account/contract hash.
    pub to_hash: Option<String>,
    /// Token amount as a decimal string.
    pub amount: String,
    /// Action type - deserialized from the numeric `ft_action_type_id` JSON field.
    #[serde(rename = "ft_action_type_id")]
    pub ft_action_type: FtActionType,
    /// Address type of the sender (0=Account, 1=Contract).
    #[serde(default)]
    pub from_type: Option<u8>,
    /// Address type of the recipient (0=Account, 1=Contract).
    #[serde(default)]
    pub to_type: Option<u8>,
}

impl FtTokenAction {
    /// Construct a token action — intended for use in tests.
    #[inline]
    #[must_use]
    pub fn new(
        deploy_hash: impl Into<String>,
        block_height: u64,
        from_hash: Option<impl Into<String>>,
        to_hash: Option<impl Into<String>>,
        amount: impl Into<String>,
        ft_action_type: FtActionType,
    ) -> Self {
        Self {
            deploy_hash: deploy_hash.into(),
            block_height,
            from_hash: from_hash.map(Into::into),
            to_hash: to_hash.map(Into::into),
            amount: amount.into(),
            ft_action_type,
            from_type: None,
            to_type: None,
        }
    }
}

/// Fetch a single page of ft-token-actions from CSPR.cloud.
///
/// Returns a [`FtTokenActionPage`] containing the actions on this page and the
/// total `page_count` (used by the caller to drive pagination).
///
/// Exposed as `pub` so integration tests can exercise the HTTP layer directly,
/// following the same pattern as `backfill::ico::load_big_transfers`.
///
/// # Errors
///
/// Returns [`IndexerError::Api`] on non-2xx HTTP responses, or
/// [`IndexerError::Http`] on network/timeout failures.
#[inline]
pub async fn fetch_ft_token_actions_page(
    client: &Client,
    config: &IndexerConfig,
    contract_hash: &str,
    page: u32,
) -> IndexerResult<FtTokenActionPage> {
    let url = format!(
        "{}/ft-token-actions?contract_package_hash={contract_hash}&page={page}&page_size=100&order_by=block_height&order_direction=ASC",
        config.casper.rest_url,
    );

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

    Ok(response.json::<FtTokenActionPage>().await?)
}

/// Backfill a CEP-18 token contract using the `/ft-token-actions` endpoint.
///
/// Paginates through all token actions in ascending block order, filtering
/// out anything before `start_block`, and feeds each action into the shared
/// [`processor`] pipeline.
///
/// # Errors
///
/// Returns [`IndexerError`] on HTTP, API, or database failures.
#[inline]
pub async fn backfill_cep18(
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

    // Resume from the last saved block instead of re-processing the whole history.
    let cursor_block = db::get_cursor(db_pool, contract_hash).await?;
    let effective_start = cursor_block
        .map_or(0, |b| b.cast_unsigned().saturating_add(1))
        .max(start_block);
    if let Some(b) = cursor_block {
        tracing::info!(block = b, %contract_hash, "Resuming CEP-18 backfill from cursor");
    }

    loop {
        tracing::debug!(%contract_hash, page, "Fetching ft-token-actions page");

        let page_data = fetch_ft_token_actions_page(client, config, contract_hash, page).await?;
        let page_count = page_data.page_count;
        let mut page_max_block: Option<u64> = None;

        for action in &page_data.data {
            if action.block_height < effective_start {
                continue;
            }

            let Some((event_name, event_data)) = ft_action_to_event(action) else {
                continue;
            };

            // caller is not available in /ft-token-actions - same as streaming.
            // block_timestamp and transform_idx are not available from this endpoint.
            let raw = RawEvent {
                contract_hash: contract_hash.to_owned(),
                deploy_hash: action.deploy_hash.clone(),
                block_height: action.block_height,
                caller: String::new(),
                contract_type,
                event_name: event_name.to_owned(),
                event_data,
                block_timestamp: None,
                transform_idx: None,
            };

            match processor::process_event(db_pool, registry, &raw).await {
                Ok(()) => {
                    total_events += 1;
                    // Advance cursor only on success — a transient DB error must
                    // not silently skip this event on the next restart.
                    page_max_block = Some(page_max_block.unwrap_or(0).max(action.block_height));
                }
                Err(e) => {
                    tracing::warn!(
                        error = %e,
                        deploy = %action.deploy_hash,
                        event = %event_name,
                        "Failed to process ft-token-action, skipping"
                    );
                }
            }
        }

        // Persist progress so restarts resume from here instead of block 0.
        if let Some(max_block) = page_max_block {
            db::update_cursor(db_pool, contract_hash, max_block.cast_signed()).await?;
        }
        tokio::time::sleep(Duration::from_millis(config.backfill_rate_limit_ms)).await;

        if page >= page_count {
            break;
        }
        page += 1;
    }

    tracing::info!(
        contract = ?contract_type,
        events = total_events,
        "CEP-18 backfill complete"
    );

    Ok(())
}

/// Map a raw CSPR.cloud `FtTokenAction` to a `(event_name, event_data)` pair
/// suitable for the shared event processor.
///
/// Returns `None` for action types that should be skipped entirely.
#[inline]
pub fn ft_action_to_event(action: &FtTokenAction) -> Option<(&'static str, serde_json::Value)> {
    match action.ft_action_type {
        // Mint — stored as raw data only. TailorCoin (BIG) has a fixed supply
        // minted once at deploy; `mint()` is not exported. Mint records from
        // CSPR.cloud represent the initial deployment allocation, not
        // user-facing operations, so no `token_holdings` update is needed.
        FtActionType::Mint => {
            let Some(recipient) = action.to_hash.as_deref() else {
                tracing::warn!(deploy = %action.deploy_hash, "Mint action missing to_hash — skipping");
                return None;
            };
            Some((
                "Mint",
                json!({ "recipient": recipient, "amount": action.amount }),
            ))
        }

        FtActionType::Transfer => {
            let Some(sender) = action.from_hash.as_deref() else {
                tracing::warn!(deploy = %action.deploy_hash, "Transfer action missing from_hash — skipping");
                return None;
            };
            let Some(recipient) = action.to_hash.as_deref() else {
                tracing::warn!(deploy = %action.deploy_hash, "Transfer action missing to_hash — skipping");
                return None;
            };
            Some((
                "Transfer",
                json!({ "sender": sender, "recipient": recipient, "amount": action.amount }),
            ))
        }

        FtActionType::Approve => {
            let Some(owner) = action.from_hash.as_deref() else {
                tracing::warn!(deploy = %action.deploy_hash, "SetAllowance action missing from_hash — skipping");
                return None;
            };
            let Some(spender) = action.to_hash.as_deref() else {
                tracing::warn!(deploy = %action.deploy_hash, "SetAllowance action missing to_hash — skipping");
                return None;
            };
            Some((
                "SetAllowance",
                json!({ "owner": owner, "spender": spender, "amount": action.amount }),
            ))
        }

        FtActionType::Unknown(id) => {
            tracing::warn!(
                ft_action_type_id = id,
                "Unknown ft_action_type_id, skipping"
            );
            None
        }
    }
}
