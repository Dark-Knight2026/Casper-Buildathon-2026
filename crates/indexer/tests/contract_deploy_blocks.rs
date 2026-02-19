//! Manual helper test for discovering the first deploy block of each contract.
//!
//! Marked `#[ignore]` so it never runs in CI. Run on demand with:
//!
//! ```bash
//! cargo nextest run -p indexer --run-ignored ignored-only --no-capture
//! ```
//!
//! Requires the following env vars (loaded from `.env` automatically):
//! - `CSPR_CLOUD_REST_URL`
//! - `CSPR_CLOUD_API_TOKEN`
//! - At least one `CONTRACT_*` variable

use std::env;

use indexer::config::ContractRegistry;
use reqwest::Client;
use serde::Deserialize;

#[derive(Deserialize)]
struct DeployListResponse {
    data: Vec<DeployInfo>,
}

#[derive(Deserialize)]
struct DeployInfo {
    block_height: u64,
    deploy_hash: String,
}

/// Fetch and print the first deploy block for a contract package hash.
async fn fetch_first_deploy_block(
    client: &Client,
    rest_url: &str,
    api_token: &str,
    contract_name: &str,
    hash: &str,
) {
    let url = format!(
        "{rest_url}/deploys?contract_package_hash={hash}&page=1&limit=1&order_by=block_height&order_direction=ASC"
    );

    let response = client
        .get(&url)
        .header("authorization", api_token)
        .send()
        .await
        .unwrap_or_else(|e| panic!("HTTP request failed for {contract_name}: {e}"));

    assert!(
        response.status().is_success(),
        "API error for {contract_name}: {}",
        response.status()
    );

    let body: DeployListResponse = response
        .json()
        .await
        .unwrap_or_else(|e| panic!("Failed to parse response for {contract_name}: {e}"));

    let first = body.data.into_iter().next().unwrap_or_else(|| {
        panic!("No deploys found for {contract_name} ({hash}) — is the hash correct?")
    });

    println!(
        "START_BLOCK_CONTRACT_{name}={block}\t# deploy_hash={deploy_hash}",
        name = contract_name.to_uppercase(),
        block = first.block_height,
        deploy_hash = first.deploy_hash,
    );
}

#[tokio::test]
#[ignore = "makes live CSPR.cloud API calls — run manually with: cargo nextest run -p indexer --run-ignored ignored-only --no-capture"]
async fn print_first_deploy_blocks_for_all_contracts() {
    dotenv::dotenv().ok();

    let rest_url = env::var("CSPR_CLOUD_REST_URL").expect("CSPR_CLOUD_REST_URL must be set");
    let api_token = env::var("CSPR_CLOUD_API_TOKEN").expect("CSPR_CLOUD_API_TOKEN must be set");

    let registry = ContractRegistry::from_env();
    let contracts = registry.active_contracts();

    assert!(
        !contracts.is_empty(),
        "No CONTRACT_* env vars are set — nothing to check"
    );
    println!("\n# Copy these into your .env file:\n");

    let client = Client::new();
    for contract in contracts {
        fetch_first_deploy_block(
            &client,
            &rest_url,
            &api_token,
            &contract.contract_type.to_string(),
            contract.hash,
        )
        .await;
    }
}
