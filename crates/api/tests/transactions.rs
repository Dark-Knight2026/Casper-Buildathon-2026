//! Tests for transaction history endpoints: response structure, pagination,
//! address validation, and BIG token contract filtering.

#![cfg(feature = "integration")]

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

/// Seed a transaction row with an explicit `from_type` value.
async fn seed_transaction_with_from_type(
    pool: &PgPool,
    tx_hash: &str,
    from: &str,
    to: Option<&str>,
    tx_type: &str,
    from_type: i16,
    block_number: Option<i64>,
) {
    sqlx::query(
        r"
            INSERT INTO blockchain_transactions (transaction_hash, from_address, to_address, transaction_type, from_type, block_number, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
        ",
    )
    .bind(tx_hash)
    .bind(from)
    .bind(to)
    .bind(tx_type)
    .bind(from_type)
    .bind(block_number)
    .execute(pool)
    .await
    .expect("Failed to seed transaction with from_type");
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

/// Seed a transaction with all fields populated for field-level assertions.
async fn seed_full_transaction(pool: &PgPool, tx_hash: &str, from: &str, to: &str) {
    sqlx::query(
        r"
            INSERT INTO blockchain_transactions
                (transaction_hash, from_address, to_address, contract_hash, transaction_type,
                 amount, block_number, status, from_type, to_type, transform_idx)
            VALUES ($1, $2, $3, $4, 'token_transfer', '1000000000000000000', 100,
                    'confirmed', 0, 0, 5)
        ",
    )
    .bind(tx_hash)
    .bind(from)
    .bind(to)
    .bind(BIG_CONTRACT)
    .execute(pool)
    .await
    .expect("Failed to seed full transaction");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_returns_expected_fields(pool: PgPool) {
    let tx_hash = "a".repeat(64);
    let to_addr = "cc".repeat(32);
    seed_full_transaction(&pool, &tx_hash, VALID_ADDRESS, &to_addr).await;

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
    assert_eq!(item["amount"], "1000000000000000000");
    assert_eq!(item["contract_package_hash"], BIG_CONTRACT);
    assert_eq!(item["from_type"], 0); // Account
    assert_eq!(item["to_type"], 0); // Account
    assert_eq!(item["transform_idx"], 5);
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
    assert_eq!(body["data"][0]["ft_action_type_id"], 4); // token_purchase -> 4 (Purchase)
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
    assert_eq!(item["ft_action_type_id"], 4); // token_purchase -> 4 (Purchase)
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

// from_type filter tests

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_from_type_filters_account_only(pool: PgPool) {
    let account_tx = "a".repeat(64);
    let contract_tx = "b".repeat(64);

    // from_type=0 (Account)
    seed_transaction_with_from_type(
        &pool,
        &account_tx,
        VALID_ADDRESS,
        None,
        "token_transfer",
        0,
        Some(1),
    )
    .await;
    // from_type=1 (Contract)
    seed_transaction_with_from_type(
        &pool,
        &contract_tx,
        VALID_ADDRESS,
        None,
        "token_transfer",
        1,
        Some(2),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?from_type=0"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"][0]["deploy_hash"], account_tx);
    assert_eq!(body["data"][0]["from_type"], 0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_from_type_filters_contract_only(pool: PgPool) {
    let account_tx = "a".repeat(64);
    let contract_tx = "b".repeat(64);

    // from_type=0 (Account)
    seed_transaction_with_from_type(
        &pool,
        &account_tx,
        VALID_ADDRESS,
        None,
        "token_transfer",
        0,
        Some(1),
    )
    .await;
    // from_type=1 (Contract)
    seed_transaction_with_from_type(
        &pool,
        &contract_tx,
        VALID_ADDRESS,
        None,
        "token_transfer",
        1,
        Some(2),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?from_type=1"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"][0]["deploy_hash"], contract_tx);
    assert_eq!(body["data"][0]["from_type"], 1);
}

// Pagination boundary tests

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_page_zero_clamped_to_first(pool: PgPool) {
    seed_transaction(
        &pool,
        &"a".repeat(64),
        VALID_ADDRESS,
        None,
        None,
        "token_transfer",
        None,
        Some(1),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?page=0"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_page_size_zero_clamped_to_one(pool: PgPool) {
    for i in 0..3 {
        let hash = format!("{:0>64}", format!("p{i}"));
        seed_transaction(
            &pool,
            &hash,
            VALID_ADDRESS,
            None,
            None,
            "token_transfer",
            None,
            Some(i + 1),
        )
        .await;
    }

    let env = common::setup_test_server(pool, false).await;

    // page_size=0 clamped to 1
    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?page_size=0"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 3);
    assert_eq!(body["page_count"], 3); // 3 items / 1 per page
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_page_size_over_max_clamped_to_100(pool: PgPool) {
    seed_transaction(
        &pool,
        &"a".repeat(64),
        VALID_ADDRESS,
        None,
        None,
        "token_transfer",
        None,
        Some(1),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    // page_size=101 clamped to 100
    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?page_size=101"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["page_count"], 1);
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_page_beyond_data_returns_empty(pool: PgPool) {
    seed_transaction(
        &pool,
        &"a".repeat(64),
        VALID_ADDRESS,
        None,
        None,
        "token_transfer",
        None,
        Some(1),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?page=999"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert!(body["data"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn big_token_transactions_page_size_zero_clamped_to_one(pool: PgPool) {
    seed_transaction(
        &pool,
        &"a".repeat(64),
        VALID_ADDRESS,
        None,
        Some(BIG_CONTRACT),
        "token_transfer",
        None,
        Some(1),
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

    let response = env
        .server
        .get("/api/v1/transactions/token/big?page_size=0")
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["page_count"], 1);
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn big_token_transactions_page_size_over_max_clamped_to_100(pool: PgPool) {
    seed_transaction(
        &pool,
        &"a".repeat(64),
        VALID_ADDRESS,
        None,
        Some(BIG_CONTRACT),
        "token_transfer",
        None,
        Some(1),
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

    let response = env
        .server
        .get("/api/v1/transactions/token/big?page_size=101")
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["page_count"], 1);
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

// type query parameter filter tests

/// `?type=token_transfer` must return only `token_transfer` rows and exclude
/// `token_purchase` rows for the same address.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_type_filter_returns_matching_rows(pool: PgPool) {
    let transfer_hash = "a".repeat(64);
    let purchase_hash = "b".repeat(64);

    seed_transaction(
        &pool,
        &transfer_hash,
        VALID_ADDRESS,
        None,
        None,
        "token_transfer",
        Some("100"),
        Some(1),
    )
    .await;
    seed_transaction(
        &pool,
        &purchase_hash,
        VALID_ADDRESS,
        None,
        None,
        "token_purchase",
        Some("200"),
        Some(2),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    // Filter by type=token_transfer (ft_action_type_id = 2)
    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?type=token_transfer"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    let data = body["data"].as_array().unwrap();
    assert_eq!(data.len(), 1);
    assert_eq!(data[0]["ft_action_type_id"], 2);
    assert_eq!(data[0]["deploy_hash"], transfer_hash);

    // Filter by type=token_purchase (ft_action_type_id = 4)
    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?type=token_purchase"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    let data = body["data"].as_array().unwrap();
    assert_eq!(data.len(), 1);
    assert_eq!(data[0]["ft_action_type_id"], 4);
    assert_eq!(data[0]["deploy_hash"], purchase_hash);
}

/// `?type=token_mint` and `?type=token_allowance` must filter correctly.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn account_transactions_type_filter_mint_and_allowance(pool: PgPool) {
    let mint_hash = "c".repeat(64);
    let allowance_hash = "d".repeat(64);
    let transfer_hash = "e".repeat(64);

    seed_transaction(
        &pool,
        &mint_hash,
        VALID_ADDRESS,
        None,
        None,
        "token_mint",
        Some("1000"),
        Some(1),
    )
    .await;
    seed_transaction(
        &pool,
        &allowance_hash,
        VALID_ADDRESS,
        None,
        None,
        "token_allowance",
        Some("500"),
        Some(2),
    )
    .await;
    seed_transaction(
        &pool,
        &transfer_hash,
        VALID_ADDRESS,
        None,
        None,
        "token_transfer",
        Some("200"),
        Some(3),
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    // token_mint -> ft_action_type_id = 1
    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?type=token_mint"
        ))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"][0]["ft_action_type_id"], 1);
    assert_eq!(body["data"][0]["deploy_hash"], mint_hash);

    // token_allowance -> ft_action_type_id = 3
    let response = env
        .server
        .get(&format!(
            "/api/v1/transactions/account/{VALID_ADDRESS}?type=token_allowance"
        ))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"][0]["ft_action_type_id"], 3);
    assert_eq!(body["data"][0]["deploy_hash"], allowance_hash);
}
