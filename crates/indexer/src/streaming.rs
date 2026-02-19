//! WebSocket streaming client for real-time event ingestion.
//!
//! Connects to the CSPR.cloud Streaming API and processes contract-level
//! events as they are emitted on-chain, using the same [`processor`] pipeline
//! as the REST backfill client.

use core::fmt::Write as _;
use core::time::Duration;
use std::collections::HashMap;

use futures_util::StreamExt;
use secrecy::ExposeSecret;
use serde::Deserialize;
use sqlx::PgPool;
use tokio::net::TcpStream;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream,
    tungstenite::{self, Message, client::IntoClientRequest},
};

use crate::{
    config::{ContractRegistry, ContractType, IndexerConfig},
    db::{self, StreamType},
    error::{IndexerError, IndexerResult},
    events::EventRegistry,
    processor,
};

// -----------------------------------------------------------------------------
// CSPR.cloud WebSocket message types
// -----------------------------------------------------------------------------

/// Top-level message received from the CSPR.cloud Streaming API.
///
/// Every contract-level event arrives as a JSON object of this shape.
/// Unknown fields (e.g. `timestamp`) are ignored by serde automatically.
#[derive(Debug, Deserialize)]
pub struct WssMessage {
    /// CES event payload.
    pub data: WssData,
    /// Blockchain context for the event (deploy hash, block height, etc.).
    pub extra: WssExtra,
}

/// Payload of a single CES event inside a [`WssMessage`].
#[derive(Debug, Deserialize)]
pub struct WssData {
    /// Contract package hash that emitted this event (hex, no prefix).
    ///
    /// Used to resolve the [`ContractType`] via the contract map.
    pub contract_package_hash: String,
    /// CES event name (e.g. `"TokensPurchased"`, `"Transfer"`).
    pub name: String,
    /// Raw event fields as a JSON object — passed directly to the processor.
    pub data: serde_json::Value,
}

/// Blockchain context attached to every streaming event.
#[derive(Debug, Deserialize)]
pub struct WssExtra {
    /// Deploy hash of the transaction that emitted this event.
    pub deploy_hash: String,
    /// Globally monotonically increasing event ID assigned by CSPR.cloud.
    ///
    /// Stored as the streaming cursor after each successful event.
    pub event_id: i64,
    /// Block height at which the event was included.
    pub block_height: u64,
}

// -----------------------------------------------------------------------------
// Contract registry helpers
// -----------------------------------------------------------------------------

/// Build a lookup map from contract package hash to [`ContractType`].
///
/// Used on every incoming message to resolve the contract type in O(1).
#[inline]
#[must_use]
pub fn build_contract_map(registry: &ContractRegistry) -> HashMap<String, ContractType> {
    registry
        .active_contracts()
        .into_iter()
        .map(|c| (c.hash.to_owned(), c.contract_type))
        .collect()
}

/// Build a comma-separated list of contract package hashes for the
/// `contract_package_hash` query parameter required by the Streaming API.
#[inline]
#[must_use]
pub fn build_hashes_csv(registry: &ContractRegistry) -> String {
    registry
        .active_contracts()
        .into_iter()
        .map(|c| c.hash.to_owned())
        .collect::<Vec<_>>()
        .join(",")
}

// -----------------------------------------------------------------------------
// Connection
// -----------------------------------------------------------------------------

/// Establish an authenticated WebSocket connection to the CSPR.cloud
/// Streaming API, subscribed to all configured contracts.
///
/// CSPR.cloud expects the API token as a raw `authorization` header value
/// (no `Bearer` prefix) and a comma-separated list of contract package hashes
/// as the `contract_package_hash` query parameter.
///
/// If `last_event_id` is `Some`, it is appended as `&last_event_id={id}` so
/// the server replays any events that arrived while the client was offline.
///
/// The returned stream is split into `(write, read)` halves by the caller so
/// that the read loop and optional write operations borrow independently.
///
/// # Errors
///
/// Returns [`IndexerError::Ws`] if the TCP connection or TLS handshake fails,
/// or [`IndexerError::Parse`] if the URL cannot be constructed.
pub(crate) async fn connect(
    config: &IndexerConfig,
    last_event_id: Option<i64>,
) -> IndexerResult<WebSocketStream<MaybeTlsStream<TcpStream>>> {
    let hashes = build_hashes_csv(&config.contracts);

    let mut url = format!(
        "{}?contract_package_hash={hashes}",
        config.cspr_cloud_wss_url
    );

    if let Some(id) = last_event_id {
        write!(url, "&last_event_id={id}").expect("String write is infallible");
    }

    // Build a WebSocket request via IntoClientRequest so that tungstenite
    // fills in the required handshake headers (Sec-WebSocket-Key, Upgrade, etc.).
    // Then inject the authorization header that CSPR.cloud requires.
    let mut request = url
        .clone()
        .into_client_request()
        .map_err(|e| IndexerError::Parse(format!("Failed to build WebSocket request: {e}")))?;
    request.headers_mut().insert(
        "authorization",
        config
            .cspr_cloud_api_token
            .expose_secret()
            .parse()
            .map_err(|e| IndexerError::Parse(format!("Invalid authorization header value: {e}")))?,
    );

    tracing::debug!(%url, "Connecting to CSPR.cloud WebSocket");
    let (ws_stream, _response) = tokio_tungstenite::connect_async(request).await?;
    tracing::info!("WebSocket connection established");

    Ok(ws_stream)
}

/// Connect to the CSPR.cloud WebSocket and run the event loop until the
/// connection closes or an unrecoverable error occurs.
///
/// On graceful server-side close ([`Message::Close`]) returns `Ok(())`.
/// On any other error (IO, protocol, EOF) returns `Err` so that the caller
/// ([`run_streaming`]) can apply exponential backoff and reconnect.
///
/// # Errors
///
/// Returns [`IndexerError::Ws`] on connection drop or protocol errors.
pub(crate) async fn connect_and_stream(
    config: &IndexerConfig,
    db_pool: &PgPool,
    registry: &EventRegistry,
) -> IndexerResult<()> {
    if config.contracts.active_contracts().is_empty() {
        tracing::warn!("No contracts configured — streaming client has nothing to subscribe to");
        return Ok(());
    }

    // Resume from the last processed event so no events are lost on reconnect.
    let last_event_id = db::get_cursor(db_pool, StreamType::Streaming).await?;
    if let Some(id) = last_event_id {
        tracing::info!(last_event_id = id, "Resuming streaming from last cursor");
    }

    // Build the hash (contract type lookup map) once for this connection lifetime.
    let contract_map = build_contract_map(&config.contracts);
    let ws_stream = connect(config, last_event_id).await?;

    // Split into independent read/write halves.
    // `_write` must stay alive for the duration of the loop — dropping it
    // would close the connection immediately.
    let (_write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        match msg? {
            Message::Text(text) => {
                handle_text_message(&text, &contract_map, db_pool, registry).await?;
            }
            Message::Close(frame) => {
                tracing::info!(?frame, "WebSocket connection closed by server");
                return Ok(());
            }
            // Ping responses are handled automatically by tokio-tungstenite.
            // Binary and other frame types are not used by CSPR.cloud.
            _ => {}
        }
    }

    // Stream ended without a Close frame — treat as a connection drop.
    tracing::warn!("WebSocket stream ended unexpectedly (EOF)");
    Err(IndexerError::Ws(tungstenite::Error::ConnectionClosed))
}

/// Parse a single WebSocket text frame and dispatch it to the processor.
///
/// Skips events from unregistered contracts with a warning. Updates the
/// streaming cursor in [`db`] after each successfully processed event.
///
/// # Errors
///
/// Returns [`IndexerError`] on JSON parse, processor, or database failures.
async fn handle_text_message(
    text: &str,
    contract_map: &HashMap<String, ContractType>,
    db_pool: &PgPool,
    registry: &EventRegistry,
) -> IndexerResult<()> {
    tracing::debug!(%text, "WSS message received");

    // CSPR.cloud sends periodic non-JSON keepalive text frames (e.g. empty strings).
    // Treat any parse failure as a non-event and skip silently.
    let Ok(msg) = serde_json::from_str::<WssMessage>(text) else {
        tracing::debug!("Ignoring non-JSON WSS text frame");
        return Ok(());
    };
    let Some(&contract_type) = contract_map.get(&msg.data.contract_package_hash) else {
        tracing::warn!(
            hash = %msg.data.contract_package_hash,
            event = %msg.data.name,
            "Received event for unregistered contract — skipping"
        );
        return Ok(());
    };
    // Not available in streaming events; backfill fills this via REST.
    let caller = String::new();
    let raw = processor::RawEvent {
        contract_hash: msg.data.contract_package_hash,
        deploy_hash: msg.extra.deploy_hash,
        block_height: msg.extra.block_height,
        caller,
        contract_type,
        event_name: msg.data.name,
        event_data: msg.data.data,
    };

    processor::process_event(db_pool, registry, &raw).await?;
    db::update_cursor(db_pool, StreamType::Streaming, msg.extra.event_id).await?;

    Ok(())
}

/// Run the streaming client forever, reconnecting with exponential backoff.
///
/// On a graceful server-initiated close ([`Message::Close`]) the backoff
/// delay is reset and the connection is re-established immediately.
/// All transient errors (network drops, timeouts) are logged and retried
/// with increasing delays up to 60 seconds.
///
/// The reconnect delay starts at [`IndexerConfig::wss_reconnect_delay_ms`]
/// and doubles on every failure: 1s - 2s - 4s - ... - 60s (max).
///
/// # Errors
///
/// Currently infallible — errors are caught and retried. The signature
/// returns [`IndexerResult`] for consistency with [`run_backfill`]
/// so that both can be driven by `tokio::select!` in `bin/indexer`.
///
/// [`run_backfill`]: crate::backfill::run_backfill
#[inline]
pub async fn run_streaming(
    config: &IndexerConfig,
    db_pool: &PgPool,
    registry: &EventRegistry,
) -> IndexerResult<()> {
    let initial_delay = Duration::from_millis(config.wss_reconnect_delay_ms);
    let max_delay = Duration::from_secs(60);
    let mut delay = initial_delay;

    loop {
        tracing::info!("Connecting to CSPR.cloud WebSocket");

        match connect_and_stream(config, db_pool, registry).await {
            Ok(()) => {
                // Graceful server-side close — reconnect immediately with reset backoff.
                tracing::info!("WebSocket connection closed gracefully — reconnecting");
                delay = initial_delay;
            }
            Err(e) => {
                tracing::error!(error = %e, ?delay, "WebSocket error — reconnecting");
                tokio::time::sleep(delay).await;
                delay = (delay * 2).min(max_delay);
            }
        }
    }
}
