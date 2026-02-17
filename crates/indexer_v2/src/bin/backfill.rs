//! Backfill tool — fetches historical events from CSPR.cloud and indexes them.
//!
//! Run once before starting the streaming client to synchronize all past events
//! from `start_block` for each configured contract.
//!
//! # Usage
//!
//! ```bash
//! cargo run -p indexer_v2 --bin backfill --release
//! ```

use secrecy::ExposeSecret;
use sqlx::postgres::PgPoolOptions;

use indexer_v2::{
    backfill,
    config::IndexerConfig,
    error::{IndexerError, IndexerResult},
};

#[tokio::main]
async fn main() -> IndexerResult<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .init();
    dotenv::dotenv().ok();

    let config = IndexerConfig::from_env()?;
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(config.database_url.expose_secret())
        .await
        .map_err(IndexerError::Database)?;

    tracing::info!("Database connected");
    backfill::run_backfill(&config, &db_pool).await?;
    tracing::info!("Backfill finished successfully");

    Ok(())
}
