//! Tests for ICO backfill: `load_big_transfers` HTTP interaction,
//! `parse_purchase_args` session decoding, and `ico_currency_name` mapping.

use reqwest::Client;
use serde_json::json;
use wiremock::matchers::{method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

use indexer::backfill::ico::{ico_currency_name, load_big_transfers, parse_purchase_args};
use indexer::config::{Casper, ContractRegistry, IndexerConfig};

/// Builds a minimal `IndexerConfig` pointing at the given mock server URL.
fn test_config(rest_url: String) -> IndexerConfig {
    IndexerConfig {
        database_url: "postgres://localhost/test".to_owned().into(),
        casper: Casper {
            api_token: "test-token".to_owned().into(),
            rest_url,
            wss_url: "wss://test".to_owned(),
            node_url: "https://node.test".to_owned(),
        },
        contracts: ContractRegistry::default(),
        backfill_rate_limit_ms: 0,
        wss_reconnect_delay_ms: 0,
    }
}

#[tokio::test]
async fn filters_only_ico_initiated_transfers() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/ft-token-actions"))
        .and(query_param("page", "1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [
                // ICO -> buyer — must be included in the map
                { "deploy_hash": "deploy_ico", "from_hash": "ico_hash", "amount": "700" },
                // Different sender — must be ignored
                { "deploy_hash": "deploy_other", "from_hash": "other_hash", "amount": "100" },
                // Mint (from_hash = null) — must be ignored
                { "deploy_hash": "deploy_mint", "from_hash": null, "amount": "5000" }
            ],
            "item_count": 3,
            "page_count": 1
        })))
        .mount(&server)
        .await;

    let map = load_big_transfers(
        &Client::new(),
        &test_config(server.uri()),
        "big_hash",
        "ico_hash",
    )
    .await
    .unwrap();

    assert_eq!(map.len(), 1);
    assert_eq!(map["deploy_ico"], "700");
    assert!(!map.contains_key("deploy_other"));
    assert!(!map.contains_key("deploy_mint"));
}

#[tokio::test]
async fn paginates_all_pages_using_page_count_from_response() {
    let server = MockServer::start().await;

    // page=1: exactly 100 items — must trigger a request for page=2
    Mock::given(method("GET"))
        .and(path("/ft-token-actions"))
        .and(query_param("page", "1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": (0..100u32)
                .map(|i| json!({ "deploy_hash": format!("d{i}"), "from_hash": "ico_hash", "amount": "1" }))
                .collect::<Vec<_>>(),
            "item_count": 100,
            "page_count": 2
        })))
        .mount(&server)
        .await;

    // page=2: 2 items — must stop paginating
    Mock::given(method("GET"))
        .and(path("/ft-token-actions"))
        .and(query_param("page", "2"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [
                { "deploy_hash": "d100", "from_hash": "ico_hash", "amount": "2" },
                { "deploy_hash": "d101", "from_hash": "ico_hash", "amount": "3" }
            ],
            "item_count": 2,
            "page_count": 2
        })))
        .mount(&server)
        .await;

    let map = load_big_transfers(
        &Client::new(),
        &test_config(server.uri()),
        "big_hash",
        "ico_hash",
    )
    .await
    .unwrap();

    assert_eq!(map.len(), 102);
    assert!(map.contains_key("d0"));
    assert!(map.contains_key("d99"));
    assert_eq!(map["d100"], "2");
    assert_eq!(map["d101"], "3");
}

#[tokio::test]
async fn returns_empty_map_when_no_ico_transfers_exist() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/ft-token-actions"))
        .and(query_param("page", "1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [],
            "item_count": 0,
            "page_count": 0
        })))
        .mount(&server)
        .await;

    let map = load_big_transfers(
        &Client::new(),
        &test_config(server.uri()),
        "big_hash",
        "ico_hash",
    )
    .await
    .unwrap();

    assert!(map.is_empty());
}

#[tokio::test]
async fn load_big_transfers_returns_error_on_5xx_response() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let result = load_big_transfers(
        &Client::new(),
        &test_config(server.uri()),
        "big_hash",
        "ico_hash",
    )
    .await;

    assert!(result.is_err(), "5xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "Error must include status code: {err}");
}

#[tokio::test]
async fn load_big_transfers_returns_error_on_4xx_response() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(401).set_body_string("Unauthorized"))
        .mount(&server)
        .await;

    let result = load_big_transfers(
        &Client::new(),
        &test_config(server.uri()),
        "big_hash",
        "ico_hash",
    )
    .await;

    assert!(result.is_err(), "4xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("401"), "Error must include status code: {err}");
}

// parse_purchase_args

/// Helper: build a purchase session with given amount and currency.
fn purchase_session(amount: &serde_json::Value, currency: u64) -> serde_json::Value {
    json!({
        "StoredVersionedContractByHash": {
            "entry_point": "purchase",
            "args": [
                ["amount_to_spend", {"parsed": amount}],
                ["currency",        {"parsed": currency}]
            ]
        }
    })
}

#[test]
fn parse_purchase_args_extracts_string_amount_and_currency() {
    let session = purchase_session(&json!("50000000"), 0);
    let (cost, currency_id) = parse_purchase_args(&session).unwrap();
    assert_eq!(cost, "50000000");
    assert_eq!(currency_id, 0);
}

#[test]
fn parse_purchase_args_extracts_numeric_amount() {
    // Some node versions return `parsed` as a JSON number, not a string.
    let session = purchase_session(&json!(12345u64), 2);
    let (cost, currency_id) = parse_purchase_args(&session).unwrap();
    assert_eq!(cost, "12345");
    assert_eq!(currency_id, 2);
}

#[test]
fn parse_purchase_args_returns_none_when_top_level_key_missing() {
    assert!(parse_purchase_args(&json!({})).is_none());
    assert!(parse_purchase_args(&json!({ "Other": {} })).is_none());
}

#[test]
fn parse_purchase_args_returns_none_when_amount_missing() {
    let session = json!({
        "StoredVersionedContractByHash": {
            "args": [
                ["currency", {"parsed": 1u64}]
            ]
        }
    });
    assert!(parse_purchase_args(&session).is_none());
}

#[test]
fn parse_purchase_args_returns_none_when_currency_missing() {
    let session = json!({
        "StoredVersionedContractByHash": {
            "args": [
                ["amount_to_spend", {"parsed": "100"}]
            ]
        }
    });
    assert!(parse_purchase_args(&session).is_none());
}

#[test]
fn parse_purchase_args_returns_none_when_args_is_empty() {
    let session = json!({
        "StoredVersionedContractByHash": { "args": [] }
    });
    assert!(parse_purchase_args(&session).is_none());
}

// ico_currency_name

#[test]
fn ico_currency_name_maps_all_known_variants() {
    assert_eq!(ico_currency_name(0), "CSPR");
    assert_eq!(ico_currency_name(1), "USDC");
    assert_eq!(ico_currency_name(2), "USDT");
}

#[test]
fn ico_currency_name_returns_unknown_for_unrecognised_ids() {
    assert_eq!(ico_currency_name(3), "UNKNOWN");
    assert_eq!(ico_currency_name(255), "UNKNOWN");
}
