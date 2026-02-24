//! Indexer error types.

/// Details of a non-2xx response from the CSPR.cloud API.
#[derive(Debug)]
pub struct ApiErrorResponse {
    /// HTTP status code.
    pub status: u16,
    /// Response body (truncated).
    pub body: String,
}

/// Errors that can occur during indexer operation.
#[derive(Debug, thiserror::Error)]
pub enum IndexerError {
    /// A startup error (failed to initialize a required system component).
    #[error("Startup error: {0}")]
    Startup(String),

    /// A configuration error (missing or invalid environment variable).
    #[error("Configuration error: {0}")]
    Config(String),

    /// An HTTP request to the CSPR.cloud API failed.
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    /// The CSPR.cloud API returned an unexpected status code.
    #[error("API error: {} — {}", .0.status, .0.body)]
    Api(ApiErrorResponse),

    /// A database operation failed.
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    /// Failed to parse event data from the API response.
    #[error("Parse error: {0}")]
    Parse(String),

    /// JSON serialization/deserialization error.
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    /// A WebSocket connection or protocol error.
    #[error("WebSocket error: {0}")]
    Ws(#[from] tokio_tungstenite::tungstenite::Error),

    /// Encountered an event with no registered handler.
    #[error("Unknown event '{event_name}' for contract type '{contract_type}'")]
    UnknownEvent {
        /// Contract type that emitted the event.
        contract_type: String,
        /// CES event name.
        event_name: String,
    },
}

/// Shorthand for `Result<T, IndexerError>` used throughout the indexer crate.
pub type IndexerResult<T> = Result<T, IndexerError>;
