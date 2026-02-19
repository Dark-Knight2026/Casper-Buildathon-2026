//! CEP-18 token backfill via CSPR.cloud `/ft-token-actions`.

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
// CSPR.cloud /ft-token-actions response types
// -----------------------------------------------------------------------------

/// Top-level response from the `/ft-token-actions` endpoint.
#[derive(Debug, Deserialize)]
struct FtTokenActionPage {
    data: Vec<FtTokenAction>,
}

/// A single fungible-token action returned by CSPR.cloud.
#[derive(Debug, Deserialize)]
struct FtTokenAction {
    /// Hash of the deploy that triggered this action.
    deploy_hash: String,
    /// Block in which the deploy was included.
    block_height: u64,
    /// Sender account/contract hash. `None` for Mint actions.
    from_hash: Option<String>,
    /// Recipient account/contract hash.
    to_hash: Option<String>,
    /// Token amount as a decimal string.
    amount: String,
    /// `1` = Mint, `2` = Approve, `3` = Transfer.
    ft_action_type_id: u8,
}

// -----------------------------------------------------------------------------
// Public-to-parent API
// -----------------------------------------------------------------------------

/// Backfill a CEP-18 token contract using the `/ft-token-actions` endpoint.
///
/// Paginates through all token actions in ascending block order, filtering
/// out anything before `start_block`, and feeds each action into the shared
/// [`processor`] pipeline.
pub(super) async fn backfill_cep18(
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
            "{}/ft-token-actions?contract_package_hash={contract_hash}&page={page}&limit=100&order_by=block_height&order_direction=ASC",
            config.cspr_cloud_rest_url,
        );
        tracing::debug!(%url, "Fetching ft-token-actions page {page}");

        let response = client
            .get(&url)
            .header("authorization", config.cspr_cloud_api_token.expose_secret())
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

        let page_data = response.json::<FtTokenActionPage>().await?;
        let page_len = page_data.data.len();

        for action in &page_data.data {
            if action.block_height < start_block {
                continue;
            }

            let Some((event_name, event_data)) = ft_action_to_event(action) else {
                continue;
            };

            // caller is not available in /ft-token-actions — same as streaming
            let raw = RawEvent {
                contract_hash: contract_hash.to_owned(),
                deploy_hash: action.deploy_hash.clone(),
                block_height: action.block_height,
                caller: String::new(),
                contract_type,
                event_name: event_name.to_owned(),
                event_data,
            };

            match processor::process_event(db_pool, registry, &raw).await {
                Ok(()) => total_events += 1,
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

        tokio::time::sleep(Duration::from_millis(config.backfill_rate_limit_ms)).await;

        if page_len < 100 {
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
fn ft_action_to_event(action: &FtTokenAction) -> Option<(&'static str, serde_json::Value)> {
    match action.ft_action_type_id {
        // Mint — new tokens created, no sender
        1 => {
            let recipient = action.to_hash.as_deref().unwrap_or_default();
            Some((
                "Mint",
                json!({ "recipient": recipient, "amount": action.amount }),
            ))
        }

        // Approve — allowance set; stored as raw data (no dedicated handler yet)
        2 => {
            let owner = action.from_hash.as_deref().unwrap_or_default();
            let spender = action.to_hash.as_deref().unwrap_or_default();
            Some((
                "SetAllowance",
                json!({ "owner": owner, "spender": spender, "amount": action.amount }),
            ))
        }

        // Transfer — the primary CEP-18 action with a dedicated handler
        3 => {
            let sender = action.from_hash.as_deref().unwrap_or_default();
            let recipient = action.to_hash.as_deref().unwrap_or_default();
            Some((
                "Transfer",
                json!({ "sender": sender, "recipient": recipient, "amount": action.amount }),
            ))
        }

        other => {
            tracing::warn!(
                ft_action_type_id = other,
                "Unknown ft_action_type_id, skipping"
            );
            None
        }
    }
}
