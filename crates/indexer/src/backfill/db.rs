//! Database access layer for the backfill pipeline.
//!
//! Manages per-contract cursors in `event_cursors` so the backfill can resume
//! from the last processed block after an indexer restart.

use sqlx::PgPool;

use crate::error::IndexerResult;

/// Retrieve the last processed block height for a specific contract.
///
/// Returns `None` if this contract has never been backfilled (i.e. it should
/// start from `start_block` defined in config).
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// if the query fails.
#[inline]
pub async fn get_cursor(db: &PgPool, contract_hash: &str) -> IndexerResult<Option<i64>> {
    let row = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = $1
        ",
        contract_hash
    )
    .fetch_optional(db)
    .await?;

    Ok(row)
}

/// Persist the backfill position for a specific contract (upsert).
///
/// `last_block` is the highest block height successfully processed so far.
/// On the next indexer start the backfill will resume from `last_block + 1`
/// instead of repeating already-processed history.
///
/// # Errors
///
/// Returns [`IndexerError::Database`](crate::error::IndexerError::Database)
/// if the upsert fails.
#[inline]
pub async fn update_cursor(db: &PgPool, contract_hash: &str, last_block: i64) -> IndexerResult<()> {
    sqlx::query!(
        r"
            INSERT INTO event_cursors (stream_type, contract_hash, cursor_value, last_updated_at)
            VALUES ('backfill', $1, $2, NOW())
            ON CONFLICT (stream_type, contract_hash) DO UPDATE SET
                cursor_value   = $2,
                last_updated_at = NOW()
        ",
        contract_hash,
        last_block,
    )
    .execute(db)
    .await?;

    Ok(())
}
