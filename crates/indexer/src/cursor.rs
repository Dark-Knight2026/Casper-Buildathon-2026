//! Event stream cursor management.
//!
//! Each indexer stream (e.g. `backfill_ico`, `wss`) stores its progress as a
//! single `last_event_id` value in the `event_cursors` table.  On startup the
//! stream loads its cursor to resume from the last known position, and after
//! each batch it persists the new position so progress is never lost.

use sqlx::PgPool;

use crate::error::IndexerResult;

/// Retrieve the last processed position for the given stream.
///
/// Returns `None` if the stream has never been checkpointed.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// if the query fails.
#[inline]
pub async fn get_cursor(db: &PgPool, stream_type: &str) -> IndexerResult<Option<i64>> {
    let row: Option<(i64,)> =
        sqlx::query_as("SELECT last_event_id FROM event_cursors WHERE stream_type = $1")
            .bind(stream_type)
            .fetch_optional(db)
            .await?;

    Ok(row.map(|(id,)| id))
}

/// Persist the stream position (upsert).
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
    stream_type: &str,
    last_event_id: i64,
) -> IndexerResult<()> {
    sqlx::query(
        r"
        INSERT INTO event_cursors (stream_type, last_event_id, last_updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (stream_type) DO UPDATE SET
            last_event_id  = $2,
            last_updated_at = NOW()
        ",
    )
    .bind(stream_type)
    .bind(last_event_id)
    .execute(db)
    .await?;

    Ok(())
}
