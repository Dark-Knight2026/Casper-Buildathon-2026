//! Tests for `IndexerConfig::from_env()` validation logic.
//!
//! All tests are `#[serial]` because `from_env()` reads process-global env vars.
//! The `unsafe` blocks are sound: `serial_test` guarantees no concurrent access.

#![allow(unsafe_code)]

use secrecy::ExposeSecret;
use serial_test::serial;

use indexer::{ContractRegistry, ContractType, IndexerConfig};

/// All env var keys used by `IndexerConfig::from_env()`.
const CONFIG_ENV_VARS: [&str; 7] = [
    "DATABASE_URL",
    "CSPR_CLOUD_API_TOKEN",
    "CSPR_CLOUD_REST_URL",
    "CSPR_CLOUD_WSS_URL",
    "BACKFILL_RATE_LIMIT_MS",
    "WSS_RECONNECT_DELAY_MS",
    "RUST_LOG",
];

/// Contract env var keys.
const CONTRACT_ENV_VARS: [&str; 10] = [
    "CONTRACT_USDC",
    "CONTRACT_USDT",
    "CONTRACT_BIG",
    "CONTRACT_TREASURY",
    "CONTRACT_ICO",
    "CONTRACT_LEASE",
    "CONTRACT_ESCROW",
    "CONTRACT_NFT",
    "CONTRACT_ROLES",
    "CONTRACT_STAKING",
];

/// Removes all indexer-related env vars to ensure test isolation.
///
/// # Safety
///
/// Must only be called when no other threads read these env vars (ensured by `#[serial]`).
unsafe fn clear_all_env_vars() {
    for key in CONFIG_ENV_VARS {
        // SAFETY: #[serial] ensures no concurrent env var access.
        unsafe { std::env::remove_var(key) };
    }
    for key in CONTRACT_ENV_VARS {
        // SAFETY: #[serial] ensures no concurrent env var access.
        unsafe { std::env::remove_var(key) };
    }
}

/// Sets the required env vars with valid values.
///
/// # Safety
///
/// Must only be called when no other threads read these env vars (ensured by `#[serial]`).
unsafe fn set_required_env_vars() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");
        std::env::set_var("CSPR_CLOUD_API_TOKEN", "test-token-123");
        std::env::set_var("CSPR_CLOUD_REST_URL", "https://api.testnet.cspr.cloud");
        std::env::set_var("CSPR_CLOUD_WSS_URL", "wss://streaming.testnet.cspr.cloud");
    }
}

// -- IndexerConfig tests --

#[test]
#[serial]
fn from_env_succeeds_with_all_required_vars() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
    }

    let config = IndexerConfig::from_env().expect("Should succeed with all required vars");

    assert_eq!(
        config.database_url.expose_secret(),
        "postgres://localhost/test"
    );
    assert_eq!(config.cspr_cloud_rest_url, "https://api.testnet.cspr.cloud");
    assert_eq!(
        config.cspr_cloud_wss_url,
        "wss://streaming.testnet.cspr.cloud"
    );
    assert_eq!(config.backfill_rate_limit_ms, 200, "Default rate limit");
    assert_eq!(
        config.wss_reconnect_delay_ms, 1000,
        "Default reconnect delay"
    );
}

#[test]
#[serial]
fn from_env_fails_without_database_url() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::remove_var("DATABASE_URL");
    }

    let err = IndexerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("DATABASE_URL must be set"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_without_api_token() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::remove_var("CSPR_CLOUD_API_TOKEN");
    }

    let err = IndexerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("CSPR_CLOUD_API_TOKEN must be set"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_without_rest_url() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::remove_var("CSPR_CLOUD_REST_URL");
    }

    let err = IndexerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("CSPR_CLOUD_REST_URL must be set"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_with_invalid_rest_url_scheme() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::set_var("CSPR_CLOUD_REST_URL", "http://api.cspr.cloud");
    }

    let err = IndexerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("CSPR_CLOUD_REST_URL must start with https://"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_with_invalid_wss_url_scheme() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::set_var("CSPR_CLOUD_WSS_URL", "ws://streaming.cspr.cloud");
    }

    let err = IndexerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("CSPR_CLOUD_WSS_URL must start with wss://"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_rejects_invalid_rate_limit() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::set_var("BACKFILL_RATE_LIMIT_MS", "not_a_number");
    }

    let err = IndexerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("BACKFILL_RATE_LIMIT_MS must be a valid number"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_rejects_invalid_reconnect_delay() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::set_var("WSS_RECONNECT_DELAY_MS", "abc");
    }

    let err = IndexerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("WSS_RECONNECT_DELAY_MS must be a valid number"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_loads_custom_rate_limit_and_reconnect_delay() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_env_vars();
        set_required_env_vars();
        std::env::set_var("BACKFILL_RATE_LIMIT_MS", "500");
        std::env::set_var("WSS_RECONNECT_DELAY_MS", "3000");
    }

    let config = IndexerConfig::from_env().expect("Should succeed");
    assert_eq!(config.backfill_rate_limit_ms, 500);
    assert_eq!(config.wss_reconnect_delay_ms, 3000);
}

// -- ContractRegistry tests --

#[test]
fn active_contracts_returns_empty_for_default_registry() {
    let registry = ContractRegistry::default();
    assert!(registry.active_contracts().is_empty());
}

#[test]
fn active_contracts_returns_only_configured_contracts() {
    let registry = ContractRegistry {
        ico: Some("abc123".to_owned()),
        treasury: Some("def456".to_owned()),
        ..ContractRegistry::default()
    };

    let active = registry.active_contracts();
    assert_eq!(active.len(), 2);
    assert!(
        active
            .iter()
            .any(|c| c.contract_type == ContractType::Ico && c.hash == "abc123")
    );
    assert!(
        active
            .iter()
            .any(|c| c.contract_type == ContractType::Treasury && c.hash == "def456")
    );
}

#[test]
fn active_contracts_returns_all_when_fully_configured() {
    let registry = ContractRegistry {
        usdc: Some("1".to_owned()),
        usdt: Some("2".to_owned()),
        big: Some("3".to_owned()),
        treasury: Some("4".to_owned()),
        ico: Some("5".to_owned()),
        lease: Some("6".to_owned()),
        escrow: Some("7".to_owned()),
        nft: Some("8".to_owned()),
        roles: Some("9".to_owned()),
        staking: Some("10".to_owned()),
    };

    assert_eq!(registry.active_contracts().len(), 10);
}

// -- ContractType tests --

#[test]
fn contract_type_as_str_matches_display() {
    let types = [
        ContractType::Usdc,
        ContractType::Usdt,
        ContractType::Big,
        ContractType::Treasury,
        ContractType::Ico,
        ContractType::Lease,
        ContractType::Escrow,
        ContractType::Nft,
        ContractType::Roles,
        ContractType::Staking,
    ];

    for ct in types {
        assert_eq!(ct.as_str(), ct.to_string());
    }
}
