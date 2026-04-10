//! WebSocket streaming client for real-time event ingestion.
//!
//! Connects to the CSPR.cloud Streaming API and processes contract-level
//! events as they are emitted on-chain, using the same [`processor`] pipeline
//! as the REST backfill client.

pub mod db;

use core::{fmt::Write as _, time::Duration};
use std::{
    collections::{HashMap, HashSet},
    hash::RandomState,
};

use chrono::DateTime;
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
    error::{IndexerError, IndexerResult},
    events::EventRegistry,
    processor::{self, ProcessResult, RawEvent},
};
use db::StreamType;

// CSPR.cloud WebSocket message types ------------------------------------------

/// Top-level message received from the CSPR.cloud Streaming API.
///
/// Every contract-level event arrives as a JSON object of this shape.
#[derive(Debug, Deserialize)]
pub struct WssMessage {
    /// CES event payload.
    pub data: WssData,
    /// Blockchain context for the event (deploy hash, block height, etc.).
    pub extra: WssExtra,
    /// ISO 8601 block timestamp (e.g. `"2025-01-01T12:00:00.000Z"`).
    #[serde(default)]
    pub timestamp: Option<String>,
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
    /// Transform index within the deploy.
    #[serde(default)]
    pub transform_id: Option<i64>,
}

// Contract registry helpers ---------------------------------------------------

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

// Connection ------------------------------------------------------------------

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

    let mut url = format!("{}?contract_package_hash={hashes}", config.casper.wss_url);

    if let Some(id) = last_event_id {
        write!(url, "&last_event_id={id}").expect("String write is infallible");
    }

    // Build a WebSocket request via IntoClientRequest so that tungstenite
    // fills in the required handshake headers (Sec-WebSocket-Key, Upgrade, etc.).
    // Then inject the authorization header that CSPR.cloud requires.
    let mut request = url
        .as_str()
        .into_client_request()
        .map_err(|e| IndexerError::Parse(format!("Failed to build WebSocket request: {e}")))?;
    request.headers_mut().insert(
        "authorization",
        config
            .casper
            .api_token
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

    // Build lookup maps once for this connection lifetime.
    let contract_map = build_contract_map(&config.contracts);
    let known_hashes = config.contracts.contract_hash_set();
    let ws_stream = connect(config, last_event_id).await?;

    // Split into independent read/write halves.
    // `_write` must stay alive for the duration of the loop - dropping it
    // would close the connection immediately.
    let (_write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        match msg? {
            Message::Text(text) => {
                handle_text_message(&text, &contract_map, &known_hashes, db_pool, registry).await?;
            }
            Message::Close(frame) => {
                tracing::info!(?frame, "WebSocket connection closed by server");
                return Ok(());
            }
            // Known limitation: with a split stream the `write` half (_write) is
            // never polled, so Pong responses queued by tungstenite in response
            // to server Ping frames will not be flushed. If CSPR.cloud starts
            // enforcing Ping/Pong keepalives, a dedicated write task will be needed.
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
#[inline]
pub async fn handle_text_message(
    text: &str,
    contract_map: &HashMap<String, ContractType, RandomState>,
    known_hashes: &HashSet<String, RandomState>,
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
            "Received event for unregistered contract - skipping"
        );
        return Ok(());
    };
    let block_timestamp = msg
        .timestamp
        .as_deref()
        .and_then(|ts| DateTime::parse_from_rfc3339(ts).ok().map(|dt| dt.to_utc()));
    // Casper's transform index is a `u32` in the node spec, so any value
    // that does not fit `i32` is either a protocol change or corruption.
    // Surface it as an explicit error: silently truncating to `None` would
    // route overflowed events to the `COALESCE(transform_idx, -1)` sentinel
    // slot, colliding with backfill rows and corrupting deduplication.
    let transform_idx = msg
        .extra
        .transform_id
        .map(|id| {
            i32::try_from(id).map_err(|_| {
                IndexerError::Parse(format!(
                    "transform_id {id} exceeds i32::MAX for deploy {}",
                    msg.extra.deploy_hash
                ))
            })
        })
        .transpose()?;

    let raw = RawEvent {
        contract_hash: msg.data.contract_package_hash,
        deploy_hash: msg.extra.deploy_hash,
        block_height: msg.extra.block_height,
        contract_type,
        event_name: msg.data.name,
        event_data: msg.data.data,
        block_timestamp,
        transform_idx,
        api_from_type: None,
        api_to_type: None,
    };

    let advance_cursor = match processor::process_event(db_pool, registry, known_hashes, &raw).await
    {
        Ok(ProcessResult::Processed) => true,
        Ok(ProcessResult::Deferred) => false,
        // Database errors are fatal (connection lost, etc.)
        Err(e @ IndexerError::Database(_)) => return Err(e),
        // All other errors (Json, Parse, etc.) are logged and skipped.
        // Cursor still advances - a malformed event won't become valid on retry.
        Err(e) => {
            tracing::error!(
                deploy = %raw.deploy_hash,
                event = %raw.event_name,
                contract = ?raw.contract_type,
                error = %e,
                "Event processing failed - skipping"
            );
            true
        }
    };

    if advance_cursor {
        db::update_cursor(db_pool, StreamType::Streaming, msg.extra.event_id).await?;
    }

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
