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

use core::time::Duration;
use std::{process::Command, sync::Once, thread};

use serde_json::{Value, json};

/// CSPR.cloud node RPC endpoint (requires API token in Authorization header).
const CSPR_CLOUD_RPC: &str = "https://node.testnet.cspr.cloud/rpc";
/// Public Casper testnet node (no auth required).
const PUBLIC_NODE: &str = "http://65.109.89.219:7777";
/// Casper testnet chain name.
const CHAIN: &str = "casper-test";
/// ICO contract hash (entry points: purchase, `get_current_ico_schedule`, etc.).
const ICO_CONTRACT: &str = "hash-47a75578aca035ff390338b2fc3fe4f35cc989a00826591b387157735f1135bf";
/// BIG token CEP-18 contract hash (entry points: approve, transfer, etc.).
const BIG_CONTRACT: &str = "hash-66bde004c898228ed46fe60743d4f68638670425b71f4ab56477f17edcc4da29";
/// tUSDT CEP-18 contract entity hash (entry points: approve, transfer, etc.).
const USDT_CONTRACT: &str = "hash-4d5ac65a4bd5ea133204eee9741c96fd275e747819242bf0ea8af4d76b1b6c2a";

/// Ensures `.env` is loaded exactly once across all tests.
static INIT: Once = Once::new();

/// Load `.env` file once, even if called multiple times.
fn load_env() {
    INIT.call_once(|| {
        dotenv::dotenv().ok();
    });
}

/// CSPR.cloud API token from `CSPR_CLOUD_API_TOKEN` env var.
fn api_token() -> String {
    load_env();
    std::env::var("CSPR_CLOUD_API_TOKEN").expect("Set CSPR_CLOUD_API_TOKEN in .env")
}

/// Path to `.pem` secret key from `CASPER_SECRET_KEY` env var.
fn secret_key() -> String {
    load_env();
    std::env::var("CASPER_SECRET_KEY").expect("Set CASPER_SECRET_KEY in .env")
}

/// ICO contract package hash with `hash-` prefix, from `CONTRACT_ICO` env var.
fn ico_package() -> String {
    load_env();
    format!(
        "hash-{}",
        std::env::var("CONTRACT_ICO").expect("Set CONTRACT_ICO in .env")
    )
}

/// JSON-RPC query via curl to CSPR.cloud (free, no gas).
fn rpc_query(method: &str, params: &Value) -> String {
    let body = json!({
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

/// Extract transaction hash from `casper-client put-transaction` JSON output.
/// Handles both `Version1` and `Version2` transaction hash formats.
fn extract_tx_hash(output: &str) -> Option<String> {
    let v: Value = serde_json::from_str(output).ok()?;
    let th = v.get("result")?.get("transaction_hash")?;
    th.get("Version2")
        .or_else(|| th.get("Version1"))
        .and_then(|v| v.as_str())
        .map(String::from)
}

/// Poll the node until deploy is executed (max ~3 min).
fn wait_for_deploy(tx_hash: &str) {
    let max_attempts = 18; // 18 * 10s = 3 min
    for attempt in 1..=max_attempts {
        println!("[{attempt}/{max_attempts}] Checking {tx_hash} ...");

        let out = Command::new("casper-client")
            .args(["get-transaction", "--node-address", PUBLIC_NODE, tx_hash])
            .output()
            .expect("failed to run casper-client get-transaction");
        let stdout = String::from_utf8_lossy(&out.stdout).to_string();
        if let Some(result) = serde_json::from_str::<Value>(&stdout).ok().and_then(|v| {
            v.pointer("/result/execution_info/execution_result")
                .cloned()
        }) {
            // Casper 1.x format: { "Success": {...} } or { "Failure": {...} }
            if result.get("Success").is_some() {
                println!("Deploy succeeded!");
                return;
            } else if result.get("Failure").is_some() {
                panic!("Deploy FAILED: {result}");
            }
            // Casper 2.x format: { "Version2": { "error_message": null|"...", ... } }
            if let Some(v2) = result.get("Version2") {
                if v2.get("error_message").is_some_and(Value::is_null) {
                    println!("Deploy succeeded (v2)!");
                    return;
                }
                panic!("Deploy FAILED (v2): {v2}");
            }
        }
        thread::sleep(Duration::from_secs(10));
    }
    panic!("Deploy {tx_hash} not finalized after {max_attempts} attempts");
}

// Free queries (no gas, no secret key) ----------------------------------------

#[test]
#[ignore = "testnet RPC - free, needs network"]
fn query_ico_state() {
    rpc_query(
        "query_global_state",
        &json!({ "key": ICO_CONTRACT, "path": ["state"] }),
    );
}

#[test]
#[ignore = "testnet RPC - free, needs network"]
fn query_ico_events_length() {
    rpc_query(
        "query_global_state",
        &json!({ "key": ICO_CONTRACT, "path": ["__events_length"] }),
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

// Paid transactions (cost gas) ------------------------------------------------

#[test]
#[ignore = "testnet transaction - costs gas, triggers SetAllowance event"]
fn approve_big_zero() {
    // Approve 0 BIG to ICO contract - should emit SetAllowance event.
    // spender = ICO contract package hash as Key::Hash
    let ico_pkg = ico_package();
    let spender_arg = format!("spender:key='{ico_pkg}'");
    contract_call(BIG_CONTRACT, "approve", &[&spender_arg, "amount:u256='0'"]);
}

#[test]
#[ignore = "testnet transaction - costs gas, triggers TokensPurchased"]
fn buy_big_with_1_cspr() {
    // Purchase BIG with 1 CSPR (1_000_000_000 motes, currency=0).
    // No approve needed for native CSPR.
    // ICO contract will emit TokensPurchased event, indexer picks it up via WSS.
    // NOTE: requires an active ICO schedule on-chain (admin must call `add_ico_schedule` first).
    let out = ico_call(
        "purchase",
        &["amount_to_spend:u256='1000000000'", "currency:u8='0'"],
    );
    let hash = extract_tx_hash(&out).expect("failed to extract purchase tx hash");
    println!("Purchase tx: {hash}");
    wait_for_deploy(&hash);
}

#[test]
#[ignore = "testnet transaction - costs gas, triggers Transfer event"]
fn transfer_usdt_to_wallet2() {
    // Transfer 1 tUSDT (6 decimals -> 1_000_000) to wallet-2.
    // CEP-18 transfer entry point emits a Transfer event picked up by WSS indexer.
    let wallet2 = "account-hash-0dc850ac514bca537c2c2dceb12e02d754d9e4591a7d071ab67422573a414dda";
    let recipient_arg = format!("recipient:key='account-hash-{}'", &wallet2["account-hash-".len()..]);

    let out = contract_call(
        USDT_CONTRACT,
        "transfer",
        &[&recipient_arg, "amount:u256='1000000'"],
    );
    let hash = extract_tx_hash(&out).expect("failed to extract transfer tx hash");
    println!("Transfer tx: {hash}");
    wait_for_deploy(&hash);
}
