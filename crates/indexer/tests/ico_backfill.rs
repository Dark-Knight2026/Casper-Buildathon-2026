//! Tests for ICO backfill BIG transfer loading logic.

use reqwest::Client;
use serde_json::json;
use wiremock::matchers::{method, path, query_param};
use wiremock::{Mock, MockServer, ResponseTemplate};

use indexer::backfill::ico::load_big_transfers;
use indexer::config::{ContractRegistry, IndexerConfig};

/// Builds a minimal `IndexerConfig` pointing at the given mock server URL.
fn test_config(rest_url: String) -> IndexerConfig {
    IndexerConfig {
        database_url: "postgres://localhost/test".to_owned().into(),
        cspr_cloud_api_token: "test-token".to_owned().into(),
        cspr_cloud_rest_url: rest_url,
        cspr_cloud_wss_url: "wss://test".to_owned(),
        casper_node_url: "https://node.test".to_owned(),
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
async fn paginates_until_page_has_fewer_than_100_items() {
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
