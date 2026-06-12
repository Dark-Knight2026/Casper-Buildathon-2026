//! Auto-expiry worker for listings.
//!
//! Wakes on an hourly tick to (1) refresh `days_on_market` for live listings
//! and (2) flip any `active` listing past its `expires_at` to `expired`. It has
//! no external dependency, so it runs unconditionally - spawned by
//! [`crate::server::main`] via [`crate::workers::spawn_all`].

pub mod db;

use core::time::Duration;

use sqlx::{PgPool, Result as SqlxResult};
use tokio::{sync::broadcast, time};

/// Cadence at which due listings are expired and `days_on_market` refreshed.
///
/// `days_on_market` has day granularity and `expires_at` is a 90-day window, so
/// an hourly pass is ample - it keeps the public surface fresh without polling
/// the table tightly.
const EXPIRY_TICK: Duration = Duration::from_secs(3600);

/// Runs the auto-expiry worker until the shutdown broadcast resolves.
///
/// `tokio::time::interval` fires immediately on its first tick, so one pass runs
/// at startup - this drains anything that expired while the process was down.
#[inline]
pub async fn run(pool: PgPool, mut shutdown_rx: broadcast::Receiver<()>) {
    let mut tick = time::interval(EXPIRY_TICK);
    tracing::info!("listing_expiry worker started");
    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => {
                tracing::info!("listing_expiry worker shutting down");
                break;
            }
            _ = tick.tick() => {
                if let Err(err) = process_expiry(&pool).await {
                    tracing::error!(?err, "listing_expiry tick failed");
                }
            }
        }
    }
}

/// Runs one expiry pass: refresh days-on-market, then expire due listings.
///
/// Public so tests can drive a single pass without waiting on the hourly
/// `tokio::time::interval` inside [`run`].
///
/// # Errors
///
/// Propagates `sqlx::Error` from either statement.
#[inline]
pub async fn process_expiry(pool: &PgPool) -> SqlxResult<()> {
    let touched = db::refresh_days_on_market(pool).await?;
    let expired = db::expire_due_listings(pool).await?;
    if expired > 0 {
        tracing::info!(expired, touched, "listing_expiry tick");
    }
    Ok(())
}
