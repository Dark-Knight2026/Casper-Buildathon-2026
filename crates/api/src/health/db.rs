//! Database operations for health checks.

use sqlx::PgPool;

/// Performs a database heartbeat check.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database is unreachable.
#[inline]
pub async fn heartbeat(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query!("SELECT 1 AS heartbeat")
        .fetch_one(pool)
        .await?;

    Ok(())
}
