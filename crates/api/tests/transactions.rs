//! Tests for transaction history endpoints: response structure, pagination,
//! address validation, and BIG token contract filtering.

mod common;

use axum::http::StatusCode;
use serde_json::Value;
use sqlx::PgPool;

use common::TestOverrides;

/// 64-char hex address used as a valid account hash in tests.
const VALID_ADDRESS: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
/// 64-char hex hash used as the BIG token contract in tests.
const BIG_CONTRACT: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

/// Seed a blockchain transaction row for testing.
#[allow(clippy::too_many_arguments)]
async fn seed_transaction(
    pool: &PgPool,
    tx_hash: &str,
    from: &str,
    to: Option<&str>,
    contract_hash: Option<&str>,
    tx_type: &str,
    amount: Option<&str>,
    block_number: Option<i64>,
) {
    sqlx::query(
        r"
            INSERT INTO blockchain_transactions (transaction_hash, from_address, to_address, contract_hash, transaction_type, amount, block_number, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
        ",
    )
    .bind(tx_hash)
    .bind(from)
    .bind(to)
    .bind(contract_hash)
    .bind(tx_type)
    .bind(amount)
    .bind(block_number)
    .execute(pool)
    .await
    .expect("Failed to seed transaction");
}

// GET /api/v1/transactions/account/{address}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_empty(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/transactions/account/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 0);
    assert_eq!(body["page_count"], 0);
    assert!(body["data"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_returns_expected_fields(pool: PgPool) {
    let tx_hash = "a".repeat(64);
    let to_addr = "cc".repeat(32);
    seed_transaction(
        &pool,
        &tx_hash,
        VALID_ADDRESS,
        Some(&to_addr),
        Some(BIG_CONTRACT),
        "token_transfer",
        Some("1000000000000000000"),
        Some(100),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/transactions/account/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["page_count"], 1);

    let item = &body["data"][0];
    assert_eq!(item["deploy_hash"], tx_hash);
    assert_eq!(item["block_height"], 100);
    assert_eq!(item["from_hash"], VALID_ADDRESS);
    assert_eq!(item["to_hash"], to_addr);
    assert_eq!(item["ft_action_type_id"], 2); // token_transfer -> 2
    assert!(item.get("amount").is_some());
    assert!(item.get("contract_package_hash").is_some());
    assert!(item.get("timestamp").is_some());
    assert!(item.get("from_type").is_some());
    assert!(item.get("to_type").is_some());
    assert!(item.get("transform_idx").is_some());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_matches_to_address(pool: PgPool) {
    let tx_hash = "d".repeat(64);
    let sender = "ee".repeat(32);
    seed_transaction(
        &pool,
        &tx_hash,
        &sender,
        Some(VALID_ADDRESS),
        None,
        "token_purchase",
        None,
        Some(50),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/transactions/account/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"][0]["ft_action_type_id"], 1); // token_purchase -> 1 (Mint)
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_invalid_address_returns_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    // Too short
    let response = env.server.get("/api/v1/transactions/account/abc123").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);

    // Non-hex
    let bad_addr = "zz".repeat(32);
    let response = env
        .server
        .get(&format!("/api/v1/transactions/account/{bad_addr}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_is_public(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/transactions/account/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_pagination(pool: PgPool) {
    // Seed 3 transactions
    for i in 0..3 {
        let hash = format!("{:0>64}", format!("f{i}"));
        seed_transaction(
            &pool,
            &hash,
            VALID_ADDRESS,
            None,
            None,
            "token_purchase",
            None,
            Some(i + 1),
        )
        .await;
    }

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?page=1&page_size=2"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 3);
    assert_eq!(body["page_count"], 2);
    assert_eq!(body["data"].as_array().unwrap().len(), 2);
}

// GET /api/v1/transactions/token/big

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn big_token_transactions_empty(pool: PgPool) {
    let env = common::setup_test_server_with(
        pool,
        false,
        TestOverrides {
            contract_big: Some(BIG_CONTRACT.to_owned()),
            ..Default::default()
        },
    )
    .await;

    let response = env.server.get("/api/v1/transactions/token/big").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 0);
    assert!(body["data"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn big_token_transactions_filters_by_contract(pool: PgPool) {
    let other_contract = "dd".repeat(32);
    // BIG contract tx
    seed_transaction(
        &pool,
        &"1".repeat(64),
        VALID_ADDRESS,
        None,
        Some(BIG_CONTRACT),
        "token_transfer",
        Some("500"),
        Some(10),
    )
    .await;
    // Different contract tx (should not appear)
    seed_transaction(
        &pool,
        &"2".repeat(64),
        VALID_ADDRESS,
        None,
        Some(&other_contract),
        "token_transfer",
        Some("999"),
        Some(11),
    )
    .await;

    let env = common::setup_test_server_with(
        pool,
        false,
        TestOverrides {
            contract_big: Some(BIG_CONTRACT.to_owned()),
            ..Default::default()
        },
    )
    .await;

    let response = env.server.get("/api/v1/transactions/token/big").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"][0]["deploy_hash"], "1".repeat(64));
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn big_token_transactions_returns_expected_fields(pool: PgPool) {
    let tx_hash = "a".repeat(64);
    let to_addr = "cc".repeat(32);
    seed_transaction(
        &pool,
        &tx_hash,
        VALID_ADDRESS,
        Some(&to_addr),
        Some(BIG_CONTRACT),
        "token_purchase",
        Some("5000000000000000000"),
        Some(42),
    )
    .await;

    let env = common::setup_test_server_with(
        pool,
        false,
        TestOverrides {
            contract_big: Some(BIG_CONTRACT.to_owned()),
            ..Default::default()
        },
    )
    .await;

    let response = env.server.get("/api/v1/transactions/token/big").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["page_count"], 1);

    let item = &body["data"][0];
    assert_eq!(item["deploy_hash"], tx_hash);
    assert_eq!(item["block_height"], 42);
    assert_eq!(item["from_hash"], VALID_ADDRESS);
    assert_eq!(item["to_hash"], to_addr);
    assert_eq!(item["contract_package_hash"], BIG_CONTRACT);
    assert_eq!(item["ft_action_type_id"], 1); // token_purchase -> 1 (Mint)
    assert_eq!(item["amount"], "5000000000000000000");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn big_token_transactions_returns_500_without_config(pool: PgPool) {
    // Default setup has contract_big: None
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/transactions/token/big").await;
    assert_eq!(response.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn big_token_transactions_is_public(pool: PgPool) {
    let env = common::setup_test_server_with(
        pool,
        false,
        TestOverrides {
            contract_big: Some(BIG_CONTRACT.to_owned()),
            ..Default::default()
        },
    )
    .await;

    let response = env.server.get("/api/v1/transactions/token/big").await;
    assert_eq!(response.status_code(), StatusCode::OK);
}
