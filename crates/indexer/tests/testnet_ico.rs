//! Manual testnet tests for ICO contract interaction.
//!
//! All tests are `#[ignore]` to avoid spending tokens during regular development.
//!
//! Run a specific test:
//! ```sh
//! cargo nextest run -p indexer --test testnet_ico <test_name> --run-ignored ignored-only --nocapture
//! ```
//!
//! Required env vars (autoloaded from `.env`):
//! - `CSPR_CLOUD_API_TOKEN` - CSPR.cloud API token (for free RPC queries)
//! - `CASPER_SECRET_KEY` - path to your `.pem` secret key file (for paid deploys)

use std::process::Command;
use std::sync::Once;

const CSPR_CLOUD_RPC: &str = "https://node.testnet.cspr.cloud/rpc";
const PUBLIC_NODE: &str = "http://65.109.89.219:7777";
const CHAIN: &str = "casper-test";
const ICO_CONTRACT: &str = "hash-47a75578aca035ff390338b2fc3fe4f35cc989a00826591b387157735f1135bf";

const BIG_CONTRACT: &str = "hash-66bde004c898228ed46fe60743d4f68638670425b71f4ab56477f17edcc4da29";

static INIT: Once = Once::new();

fn load_env() {
    INIT.call_once(|| {
        dotenv::dotenv().ok();
    });
}

fn api_token() -> String {
    load_env();
    std::env::var("CSPR_CLOUD_API_TOKEN").expect("Set CSPR_CLOUD_API_TOKEN in .env")
}

fn secret_key() -> String {
    load_env();
    std::env::var("CASPER_SECRET_KEY").expect("Set CASPER_SECRET_KEY in .env")
}

fn ico_package() -> String {
    load_env();
    format!(
        "hash-{}",
        std::env::var("CONTRACT_ICO").expect("Set CONTRACT_ICO in .env")
    )
}

/// JSON-RPC query via curl to CSPR.cloud (free, no gas).
fn rpc_query(method: &str, params: &serde_json::Value) -> String {
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    });

    let out = Command::new("curl")
        .args([
            "-s",
            "-m",
            "15",
            "-X",
            "POST",
            CSPR_CLOUD_RPC,
            "-H",
            "Content-Type: application/json",
            "-H",
            &format!("Authorization: {}", api_token()),
            "-d",
            &body.to_string(),
        ])
        .output()
        .expect("failed to run curl");

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    println!("{stdout}");
    assert!(out.status.success(), "curl failed");
    stdout
}

/// Call ICO contract entry point via casper-client (costs gas).
fn ico_call(entry_point: &str, session_args: &[&str]) -> String {
    let key = secret_key();
    let mut cmd = Command::new("casper-client");
    cmd.args(["put-transaction", "invocable-entity"]);
    cmd.args(["--node-address", PUBLIC_NODE]);
    cmd.args(["--chain-name", CHAIN]);
    cmd.args(["--secret-key", &key]);
    cmd.args(["--payment-amount", "25000000000"]);
    cmd.args(["--standard-payment", "true"]);
    cmd.args(["--gas-price-tolerance", "10"]);
    cmd.args(["--contract-hash", ICO_CONTRACT]);
    cmd.args(["--session-entry-point", entry_point]);
    for arg in session_args {
        cmd.args(["--session-arg", arg]);
    }

    let out = cmd
        .output()
        .expect("failed to run casper-client (is it installed?)");
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();

    if !stderr.is_empty() {
        eprintln!("stderr:\n{stderr}");
    }
    println!("stdout:\n{stdout}");

    assert!(out.status.success(), "casper-client failed: {stderr}");
    stdout
}

/// Call any contract entry point via casper-client (costs gas).
fn contract_call(contract_hash: &str, entry_point: &str, session_args: &[&str]) -> String {
    let key = secret_key();
    let mut cmd = Command::new("casper-client");
    cmd.args(["put-transaction", "invocable-entity"]);
    cmd.args(["--node-address", PUBLIC_NODE]);
    cmd.args(["--chain-name", CHAIN]);
    cmd.args(["--secret-key", &key]);
    cmd.args(["--payment-amount", "5000000000"]);
    cmd.args(["--standard-payment", "true"]);
    cmd.args(["--gas-price-tolerance", "10"]);
    cmd.args(["--contract-hash", contract_hash]);
    cmd.args(["--session-entry-point", entry_point]);
    for arg in session_args {
        cmd.args(["--session-arg", arg]);
    }

    let out = cmd
        .output()
        .expect("failed to run casper-client (is it installed?)");
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();

    if !stderr.is_empty() {
        eprintln!("stderr:\n{stderr}");
    }
    println!("stdout:\n{stdout}");

    assert!(out.status.success(), "casper-client failed: {stderr}");
    stdout
}

// Free queries (no gas, no secret key)

#[test]
#[ignore = "testnet RPC - free, needs network"]
fn query_ico_state() {
    rpc_query(
        "query_global_state",
        &serde_json::json!({ "key": ICO_CONTRACT, "path": ["state"] }),
    );
}

#[test]
#[ignore = "testnet RPC - free, needs network"]
fn query_ico_events_length() {
    rpc_query(
        "query_global_state",
        &serde_json::json!({ "key": ICO_CONTRACT, "path": ["__events_length"] }),
    );
}

#[test]
#[ignore = "testnet transaction - costs gas"]
fn purchase_10_cspr() {
    // 10 CSPR = 10_000_000_000 motes
    ico_call(
        "purchase",
        &["amount_to_spend:u256='10000000000'", "currency:u8='0'"],
    );
}

// Paid transactions (cost gas)

#[test]
#[ignore = "testnet transaction - costs gas, triggers SetAllowance event"]
fn approve_big_zero() {
    // Approve 0 BIG to ICO contract - should emit SetAllowance event.
    // spender = ICO contract package hash as Key::Hash
    let ico_pkg = ico_package();
    let spender_arg = format!("spender:key='{ico_pkg}'");
    contract_call(BIG_CONTRACT, "approve", &[&spender_arg, "amount:u256='0'"]);
}
