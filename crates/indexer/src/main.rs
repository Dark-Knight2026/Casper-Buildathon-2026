//! Indexer entrypoint — runs backfill and WebSocket streaming concurrently.
//!
//! Both tasks run as independent Tokio spawned tasks so that backfill
//! completing normally does not cancel streaming. A shutdown signal
//! (Ctrl+C or SIGTERM) aborts both tasks and exits cleanly.
//!
//! # Usage
//!
//! ```bash
//! cargo run -p indexer --release
//! ```

use secrecy::ExposeSecret;
use sqlx::postgres::PgPoolOptions;

use indexer::{
    backfill,
    config::IndexerConfig,
    error::{IndexerError, IndexerResult},
    events::EventRegistry,
    streaming,
};

#[tokio::main]
async fn main() -> IndexerResult<()> {
    // rustls 0.23 requires explicit crypto provider selection when multiple
    // providers are present in the dependency tree (sqlx, reqwest, tokio-tungstenite).
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("failed to install rustls crypto provider");

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

    let backfill_task = {
        let config = config.clone();
        let db_pool = db_pool.clone();
        tokio::spawn(async move {
            if let Err(e) = backfill::run_backfill(&config, &db_pool).await {
                tracing::error!(error = %e, "Backfill failed");
            }
        })
    };

    let streaming_task = {
        let config = config.clone();
        let db_pool = db_pool.clone();
        tokio::spawn(async move {
            if let Err(e) =
                streaming::run_streaming(&config, &db_pool, &EventRegistry::new()).await
            {
                tracing::error!(error = %e, "Streaming failed");
            }
        })
    };

    shutdown_signal().await;
    tracing::info!("Shutdown signal received");

    backfill_task.abort();
    streaming_task.abort();

    Ok(())
}

/// Resolves on Ctrl+C (SIGINT) or SIGTERM (Docker stop).
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    // Windows does not have SIGTERM — use a future that never resolves.
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {}
        () = terminate => {}
    }
}
