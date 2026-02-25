//! Indexer runner — initializes resources and runs backfill + streaming concurrently.
//!
//! Both tasks run as independent Tokio spawned tasks so that backfill
//! completing normally does not cancel streaming. A shutdown signal
//! (Ctrl+C or SIGTERM) aborts both tasks and exits cleanly.

use secrecy::ExposeSecret;
use sqlx::postgres::PgPoolOptions;

use crate::{
    backfill,
    config::IndexerConfig,
    error::{IndexerError, IndexerResult},
    events::EventRegistry,
    streaming,
};

/// Initializes all resources and runs the indexer until a shutdown signal is received.
///
/// # Errors
///
/// Returns [`IndexerError`] if:
/// - The rustls crypto provider cannot be installed
/// - Configuration cannot be loaded from environment
/// - Database connection fails
#[inline]
pub async fn run() -> IndexerResult<()> {
    // rustls 0.23 requires explicit crypto provider selection when multiple
    // providers are present in the dependency tree (sqlx, reqwest, tokio-tungstenite).
    rustls::crypto::ring::default_provider()
        .install_default()
        .map_err(|_| {
            IndexerError::Startup("failed to install rustls crypto provider".to_owned())
        })?;

    // Load .env before tracing_subscriber so that RUST_LOG defined in .env
    // is visible to EnvFilter::from_default_env().
    dotenv::dotenv().ok();
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

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
            if let Err(e) = streaming::run_streaming(&config, &db_pool, &EventRegistry::new()).await
            {
                tracing::error!(error = %e, "Streaming failed");
            }
        })
    };

    shutdown_signal().await;
    tracing::info!("Shutdown signal received");

    backfill_task.abort();
    streaming_task.abort();

    // Wait for both tasks to fully stop before dropping db_pool, so that any
    // in-flight DB operations can complete or be cleanly canceled first.
    let _ = backfill_task.await;
    let _ = streaming_task.await;

    Ok(())
}

/// Resolves on Ctrl+C (SIGINT) or SIGTERM (Docker stop).
pub(crate) async fn shutdown_signal() {
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
