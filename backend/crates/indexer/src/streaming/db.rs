//! Database access layer for the streaming pipeline.
//!
//! Manages the global streaming cursor in `event_cursors` so the WebSocket
//! client can resume from the last received event after reconnect or restart.

use sqlx::PgPool;

use crate::error::IndexerResult;

/// Identifies the streaming client's cursor row in `event_cursors`.
///
/// Using a typed enum instead of a raw `&str` prevents typos from causing
/// silent cursor mismatches.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreamType {
    /// Live-streaming cursor — tracks the last WebSocket event ID.
    Streaming,
}

impl StreamType {
    /// Returns the canonical string stored in `event_cursors.stream_type`.
    #[inline]
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Streaming => "streaming",
        }
    }
}

/// Retrieve the last processed event ID for the streaming client.
///
/// Returns `None` if the stream has never been checkpointed (fresh start).
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// if the query fails.
#[inline]
pub async fn get_cursor(db: &PgPool, stream: StreamType) -> IndexerResult<Option<i64>> {
    let row = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = $1 AND contract_hash = ''
        ",
        stream.as_str()
    )
    .fetch_optional(db)
    .await?;

    Ok(row)
}

/// Persist the streaming cursor position (upsert).
///
/// Creates a new cursor row on the first call; subsequent calls update the
/// existing row in place.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// if the upsert fails.
#[inline]
pub async fn update_cursor(
    db: &PgPool,
    stream: StreamType,
    cursor_value: i64,
) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO event_cursors (stream_type, contract_hash, cursor_value, last_updated_at)
            VALUES ($1, '', $2, NOW())
            ON CONFLICT (stream_type, contract_hash) DO UPDATE SET
                cursor_value   = $2,
                last_updated_at = NOW()
        ",
        stream.as_str(),
        cursor_value,
    )
    .execute(db)
    .await?;

    Ok(())
}
