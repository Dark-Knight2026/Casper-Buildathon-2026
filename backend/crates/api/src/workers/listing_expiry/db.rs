//! SQL for the listing auto-expiry worker.

use sqlx::{PgPool, Result as SqlxResult};

/// Flips every `active` listing past its `expires_at` to `expired`. Returns the
/// number of rows expired this pass.
///
/// # Errors
///
/// Returns [`sqlx::Error`] on any database failure.
#[inline]
pub async fn expire_due_listings(pool: &PgPool) -> SqlxResult<u64> {
    let result = sqlx::query!(
        r"
            UPDATE listings
            SET state = 'expired'
            WHERE state = 'active'
              AND deleted_at IS NULL
              AND expires_at IS NOT NULL
              AND expires_at <= now()
        "
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}

/// Refreshes `days_on_market` for live (`active`/`pending`) listings, never
/// decreasing it. Returns the number of rows touched.
///
/// Counts from `created_at` (no separate `activated_at` is tracked at MVP);
/// `GREATEST` makes the column monotonic. A NULL `created_at` yields a NULL day
/// count, which `GREATEST` ignores - the stored value is then left as-is.
///
/// # Errors
///
/// Returns [`sqlx::Error`] on any database failure.
#[inline]
pub async fn refresh_days_on_market(pool: &PgPool) -> SqlxResult<u64> {
    let result = sqlx::query!(
        r"
            UPDATE listings
            SET days_on_market = GREATEST(days_on_market, (now()::date - created_at::date))
            WHERE state IN ('active', 'pending')
              AND deleted_at IS NULL
        "
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}
