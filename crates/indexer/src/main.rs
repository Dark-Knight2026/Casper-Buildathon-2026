//! Casper Network event indexer entry point.

use indexer::IndexerConfig;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    dotenv::dotenv().ok();

    let config = match IndexerConfig::from_env() {
        Ok(config) => config,
        Err(e) => {
            tracing::error!(error = %e, "Failed to load configuration");
            std::process::exit(1);
        }
    };

    let active = config.contracts.active_contracts();
    tracing::info!(
        contracts = active.len(),
        "Indexer started, tracking {} contract(s)",
        active.len()
    );

    for (contract_type, hash) in &active {
        tracing::info!(contract = %contract_type, hash = %hash, "Tracking contract");
    }
}
