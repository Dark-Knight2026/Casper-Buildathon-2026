//! Tests for CEP-18 backfill logic.
//!
//! Covers two areas:
//!
//! 1. **`ft_action_to_event` mapping** — pure unit tests, no I/O.
//!    CSPR.cloud `/ft-token-action-types` reference (verified against testnet):
//!    * 1 = Mint
//!    * 2 = Transfer
//!    * 3 = Approve  (mapped to `SetAllowance` for our event system)
//!    * 4 = Burn     (no handler — skipped)
//!
//! 2. **`fetch_ft_token_actions_page` HTTP layer** — wiremock tests that verify
//!    correct URL construction, authorization header, response parsing, and
//!    error propagation without requiring a real database or CSPR.cloud access.

mod common;

use common::payloads;
use reqwest::Client;
use serde_json::json;
use wiremock::{Mock, MockServer, ResponseTemplate, matchers};

use indexer::{
    backfill::cep18::{self, FtTokenAction},
    config::{Casper, ContractRegistry, IndexerConfig},
};

// Shared helpers

/// Minimal `IndexerConfig` pointing at the given mock server URL.
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

/// Helper: build a minimal `FtTokenAction` with given fields.
fn action(
    ft_action_type_id: u8,
    from_hash: Option<&str>,
    to_hash: Option<&str>,
    amount: &str,
) -> FtTokenAction {
    FtTokenAction::new(
        "deploy_hash",
        100,
        from_hash,
        to_hash,
        amount,
        ft_action_type_id,
    )
}

// fetch_ft_token_actions_page — HTTP layer

#[tokio::test]
async fn fetch_page_returns_error_on_5xx_response() {
    let server = MockServer::start().await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &test_config(server.uri()),
        "contract_hash",
        1,
    )
    .await;

    assert!(result.is_err(), "5xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "error must include status code: {err}");
}

#[tokio::test]
async fn fetch_page_returns_error_on_4xx_response() {
    let server = MockServer::start().await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(401).set_body_string("Unauthorized"))
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &test_config(server.uri()),
        "contract_hash",
        1,
    )
    .await;

    assert!(result.is_err(), "4xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("401"), "error must include status code: {err}");
}

#[tokio::test]
async fn fetch_page_sends_correct_query_params() {
    let server = MockServer::start().await;

    // Wiremock validates all required query params are present with correct values.
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::query_param(
            "contract_package_hash",
            "my_contract",
        ))
        .and(matchers::query_param("page", "3"))
        .and(matchers::query_param("limit", "100"))
        .and(matchers::query_param("order_by", "block_height"))
        .and(matchers::query_param("order_direction", "ASC"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &test_config(server.uri()),
        "my_contract",
        3,
    )
    .await;

    assert!(
        result.is_ok(),
        "correct query params must succeed: {:?}",
        result.err()
    );
}

#[tokio::test]
async fn fetch_page_sends_authorization_header() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::header_exists("authorization"))
        .and(matchers::header("authorization", "test-token"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &test_config(server.uri()),
        "any_hash",
        1,
    )
    .await;

    assert!(
        result.is_ok(),
        "request with correct auth header must succeed: {:?}",
        result.err()
    );
}

#[tokio::test]
async fn fetch_page_parses_data_and_page_count() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(payloads::ft_actions_one_transfer_page()))
        .mount(&server)
        .await;

    let page = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &test_config(server.uri()),
        "any_hash",
        1,
    )
    .await
    .unwrap();

    assert_eq!(page.page_count, 5);
    assert_eq!(page.data.len(), 1);
    let act = &page.data[0];
    assert_eq!(act.deploy_hash, "deploy_abc");
    assert_eq!(act.block_height, 1234);
    assert_eq!(act.amount, "9999");
    assert_eq!(act.ft_action_type_id, 2);
}

#[tokio::test]
async fn fetch_page_parses_empty_response() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let page = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &test_config(server.uri()),
        "any_hash",
        1,
    )
    .await
    .unwrap();

    assert!(page.data.is_empty());
    assert_eq!(page.page_count, 1);
}

// ft_action_to_event — mapping unit tests

// ft_action_type_id = 1 (Mint)

#[test]
fn mint_produces_mint_event_name() {
    let (name, _) = cep18::ft_action_to_event(&action(1, None, Some("recipient"), "5000")).unwrap();
    assert_eq!(name, "Mint");
}

#[test]
fn mint_includes_recipient_and_amount() {
    let (_, data) =
        cep18::ft_action_to_event(&action(1, None, Some("addr_recipient"), "42")).unwrap();
    assert_eq!(data["recipient"], "addr_recipient");
    assert_eq!(data["amount"], "42");
}

#[test]
fn mint_with_null_recipient_falls_back_to_empty_string() {
    // to_hash = None → recipient field must be ""
    let (_, data) = cep18::ft_action_to_event(&action(1, None, None, "1000")).unwrap();
    assert_eq!(data["recipient"], "");
}

// ft_action_type_id = 2 (Transfer)

#[test]
fn transfer_type2_produces_transfer_event_name() {
    let (name, _) =
        cep18::ft_action_to_event(&action(2, Some("sender"), Some("recipient"), "1000")).unwrap();
    assert_eq!(name, "Transfer");
}

#[test]
fn transfer_type2_includes_sender_recipient_and_amount() {
    let (_, data) =
        cep18::ft_action_to_event(&action(2, Some("sender_addr"), Some("recv_addr"), "999"))
            .unwrap();
    assert_eq!(data["sender"], "sender_addr");
    assert_eq!(data["recipient"], "recv_addr");
    assert_eq!(data["amount"], "999");
}

#[test]
fn transfer_type2_with_null_hashes_falls_back_to_empty_string() {
    let (_, data) = cep18::ft_action_to_event(&action(2, None, None, "1")).unwrap();
    assert_eq!(data["sender"], "");
    assert_eq!(data["recipient"], "");
}

// ft_action_type_id = 3 (Approve → "SetAllowance")

#[test]
fn approve_type3_produces_set_allowance_event_name() {
    let (name, _) =
        cep18::ft_action_to_event(&action(3, Some("owner"), Some("spender"), "200")).unwrap();
    assert_eq!(name, "SetAllowance");
}

#[test]
fn approve_type3_includes_owner_spender_and_amount() {
    let (_, data) =
        cep18::ft_action_to_event(&action(3, Some("owner_addr"), Some("spender_addr"), "200"))
            .unwrap();
    assert_eq!(data["owner"], "owner_addr");
    assert_eq!(data["spender"], "spender_addr");
    assert_eq!(data["amount"], "200");
}

#[test]
fn approve_type3_with_null_hashes_falls_back_to_empty_string() {
    let (_, data) = cep18::ft_action_to_event(&action(3, None, None, "0")).unwrap();
    assert_eq!(data["owner"], "");
    assert_eq!(data["spender"], "");
}

// ft_action_type_id = 4 (Burn) and unknowns — all return None

#[test]
fn burn_type4_returns_none() {
    assert!(cep18::ft_action_to_event(&action(4, Some("holder"), None, "500")).is_none());
}

#[test]
fn unknown_action_types_return_none() {
    assert!(cep18::ft_action_to_event(&action(0, None, None, "0")).is_none());
    assert!(cep18::ft_action_to_event(&action(5, None, None, "0")).is_none());
    assert!(cep18::ft_action_to_event(&action(99, None, None, "0")).is_none());
    assert!(cep18::ft_action_to_event(&action(255, None, None, "0")).is_none());
}
