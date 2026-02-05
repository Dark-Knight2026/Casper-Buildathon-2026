//! Indexer error types.

/// Errors that can occur during indexer operation.
#[derive(Debug, thiserror::Error)]
pub enum IndexerError {
    /// A configuration error (missing or invalid environment variable).
    #[error("Configuration error: {0}")]
    Config(String),
}
