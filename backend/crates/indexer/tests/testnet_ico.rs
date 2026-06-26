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

#![cfg(feature = "integration")]

use core::time::Duration;
use std::{process::Command, sync::Once, thread};

use serde_json::{Value, json};

/// CSPR.cloud node RPC endpoint (requires API token in Authorization header).
const CSPR_CLOUD_RPC: &str = "https://node.testnet.cspr.cloud/rpc";
/// Public Casper testnet node (no auth required).
const PUBLIC_NODE: &str = "http://65.109.89.219:7777";
/// Casper testnet chain name.
const CHAIN: &str = "casper-test";

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

/// Read a `CONTRACT_*` env var and return it as `hash-{hex}` (package hash).
fn package_hash(env_var: &str) -> String {
    load_env();
    format!(
        "hash-{}",
        std::env::var(env_var).unwrap_or_else(|_| panic!("Set {env_var} in .env"))
    )
}

/// Resolve a contract package hash to the latest entity (contract) hash via RPC.
///
/// `CONTRACT_*` env vars store **package hashes**, but `casper-client put-transaction
/// invocable-entity --contract-hash` requires an **entity hash** (a specific contract
/// version). This function queries the chain to find the latest version.
fn resolve_entity_hash(package_hash: &str) -> String {
    let resp = rpc_query("query_global_state", &json!({ "key": package_hash }));
    let v: Value = serde_json::from_str(&resp).expect("invalid RPC JSON response");

    // Casper 1.x: result.stored_value.ContractPackage.versions[].contract_hash
    if let Some(versions) = v.pointer("/result/stored_value/ContractPackage/versions") {
        let arr = versions.as_array().expect("versions is not an array");
        let last = arr.last().expect("versions array is empty");
        let hash = last["contract_hash"]
            .as_str()
            .expect("missing contract_hash in version entry");
        // "contract-{hex}" -> "hash-{hex}"
        return format!("hash-{}", hash.strip_prefix("contract-").unwrap_or(hash));
    }

    // Casper 2.x: result.stored_value.Package.versions[].entity_hash
    if let Some(versions) = v.pointer("/result/stored_value/Package/versions") {
        let arr = versions.as_array().expect("versions is not an array");
        let last = arr.last().expect("versions array is empty");
        let hash = last["entity_hash"]
            .as_str()
            .or_else(|| last["contract_hash"].as_str())
            .expect("missing entity_hash in version entry");
        return format!(
            "hash-{}",
            hash.strip_prefix("entity-contract-").unwrap_or(hash)
        );
    }

    panic!(
        "Cannot resolve entity hash from package {package_hash}. \
         RPC response has no ContractPackage or Package. \
         Full response:\n{resp}"
    );
}

/// ICO entity hash resolved from `CONTRACT_ICO` package hash.
fn ico_contract() -> String {
    resolve_entity_hash(&package_hash("CONTRACT_ICO"))
}

/// ICO package hash (for `Key::Hash` references, e.g. as spender in approve).
fn ico_package() -> String {
    package_hash("CONTRACT_ICO")
}

/// BIG token entity hash resolved from `CONTRACT_BIG` package hash.
fn big_contract() -> String {
    resolve_entity_hash(&package_hash("CONTRACT_BIG"))
}

/// tUSDT entity hash resolved from `CONTRACT_USDT` package hash.
fn usdt_contract() -> String {
    resolve_entity_hash(&package_hash("CONTRACT_USDT"))
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
    cmd.args(["--payment-amount", "10000000000"]);
    cmd.args(["--standard-payment", "true"]);
    cmd.args(["--gas-price-tolerance", "10"]);
    cmd.args(["--contract-hash", &ico_contract()]);
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
        &json!({ "key": ico_contract(), "path": ["state"] }),
    );
}

#[test]
#[ignore = "testnet RPC - free, needs network"]
fn query_ico_events_length() {
    rpc_query(
        "query_global_state",
        &json!({ "key": ico_contract(), "path": ["__events_length"] }),
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
    contract_call(
        &big_contract(),
        "approve",
        &[&spender_arg, "amount:u256='0'"],
    );
}

#[test]
#[ignore = "testnet transaction - costs gas, triggers TokensPurchased"]
fn buy_big_with_1_usdt() {
    // Purchase BIG with 1 tUSDT (6 decimals -> 1_000_000, currency=2).
    // Requires approve on USDT contract first, then purchase on ICO.
    // NOTE: requires an active ICO schedule on-chain (admin must call `add_ico_schedule` first).

    // Step 1: approve ICO contract to spend 1 tUSDT
    let ico_pkg = ico_package();
    let spender_arg = format!("spender:key='{ico_pkg}'");
    let approve_out = contract_call(
        &usdt_contract(),
        "approve",
        &[&spender_arg, "amount:u256='1000000'"],
    );
    let approve_hash = extract_tx_hash(&approve_out).expect("failed to extract approve tx hash");
    println!("Approve tx: {approve_hash}");
    wait_for_deploy(&approve_hash);

    // Step 2: purchase BIG with 1 tUSDT
    let out = ico_call(
        "purchase",
        &["amount_to_spend:u256='1000000'", "currency:u8='2'"],
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
    let recipient_arg = format!(
        "recipient:key='account-hash-{}'",
        &wallet2["account-hash-".len()..]
    );

    let out = contract_call(
        &usdt_contract(),
        "transfer",
        &[&recipient_arg, "amount:u256='1000000'"],
    );
    let hash = extract_tx_hash(&out).expect("failed to extract transfer tx hash");
    println!("Transfer tx: {hash}");
    wait_for_deploy(&hash);
}
