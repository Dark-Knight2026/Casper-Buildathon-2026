//! Tests for vesting endpoints: schedules listing with pagination,
//! token supply, release schedule, and address validation.

mod common;

use axum::http::StatusCode;
use serde_json::Value;
use sqlx::PgPool;

/// 64-char hex address used as a valid account hash in tests.
const VALID_ADDRESS: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
/// A second beneficiary address for multi-user tests.
const OTHER_ADDRESS: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

/// Seed a vesting schedule row.
async fn seed_vesting_schedule(
    pool: &PgPool,
    vesting_id: &str,
    beneficiary: &str,
    total_amount: &str,
    start_timestamp: i64,
    cliff_duration: i64,
    vesting_duration: i64,
) {
    sqlx::query(
        r"
            INSERT INTO vesting_schedules (vesting_id, beneficiary, whitelisted_creator, total_amount, start_timestamp, cliff_duration, vesting_duration, transaction_hash, block_height)
            VALUES ($1, $2, 'ico_contract_hash', $3, $4, $5, $6, md5(random()::text), 1)
        ",
    )
    .bind(vesting_id)
    .bind(beneficiary)
    .bind(total_amount)
    .bind(start_timestamp)
    .bind(cliff_duration)
    .bind(vesting_duration)
    .execute(pool)
    .await
    .expect("Failed to seed vesting schedule");
}

/// Seed a token holding for circulating supply tests.
async fn seed_token_holding(pool: &PgPool, address: &str, balance: &str) {
    sqlx::query(
        r"
            INSERT INTO token_holdings (user_address, token_type, balance, last_updated_at)
            VALUES ($1, 'BIG', $2, NOW())
        ",
    )
    .bind(address)
    .bind(balance)
    .execute(pool)
    .await
    .expect("Failed to seed token holding");
}

/// Seed a contract registry entry.
async fn seed_contract_registry(pool: &PgPool, contract_hash: &str, contract_type: &str) {
    sqlx::query(
        r"
            INSERT INTO contract_registry (contract_type, contract_hash, contract_name, is_active)
            VALUES ($1, $2, $1, TRUE)
        ",
    )
    .bind(contract_type)
    .bind(contract_hash)
    .execute(pool)
    .await
    .expect("Failed to seed contract registry");
}

// GET /api/v1/vesting/schedules?account={address}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn vesting_schedules_empty(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/vesting/schedules?account={VALID_ADDRESS}"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 0);
    assert_eq!(body["page_count"], 0);
    assert!(body["data"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn vesting_schedules_returns_schedule(pool: PgPool) {
    // 1000 BIG (minimal units, 18 decimals)
    let amount = "1000000000000000000000";
    // start = 1000, cliff = 500ms, vesting = 1000ms
    seed_vesting_schedule(&pool, "0", VALID_ADDRESS, amount, 1000, 500, 1000).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/vesting/schedules?account={VALID_ADDRESS}"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    let schedule = &body["data"][0];
    assert_eq!(schedule["id"], "0");
    assert_eq!(schedule["purchaseTimestamp"], 1000);
    assert_eq!(schedule["unlockTimestamp"], 1500); // start + cliff
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn vesting_schedules_filters_by_account(pool: PgPool) {
    let amount = "1000000000000000000000";
    seed_vesting_schedule(&pool, "0", VALID_ADDRESS, amount, 1000, 500, 1000).await;
    seed_vesting_schedule(&pool, "1", OTHER_ADDRESS, amount, 2000, 500, 1000).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/vesting/schedules?account={VALID_ADDRESS}"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 1);
    assert_eq!(body["data"][0]["id"], "0");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn vesting_schedules_pagination(pool: PgPool) {
    let amount = "1000000000000000000000";
    for i in 0..5 {
        seed_vesting_schedule(
            &pool,
            &i.to_string(),
            VALID_ADDRESS,
            amount,
            1000 + i * 100,
            500,
            1000,
        )
        .await;
    }

    let env = common::setup_test_server(pool, false).await;

    // Page 1, page_size=2
    let response = env
        .server
        .get(&format!(
            "/api/v1/vesting/schedules?account={VALID_ADDRESS}&page=1&page_size=2"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["item_count"], 5);
    assert_eq!(body["page_count"], 3);
    assert_eq!(body["data"].as_array().unwrap().len(), 2);

    // Page 3, page_size=2 (last page, 1 item)
    let response = env
        .server
        .get(&format!(
            "/api/v1/vesting/schedules?account={VALID_ADDRESS}&page=3&page_size=2"
        ))
        .await;

    let body: Value = response.json();
    assert_eq!(body["data"].as_array().unwrap().len(), 1);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn vesting_schedules_invalid_address_returns_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get("/api/v1/vesting/schedules?account=too-short")
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);

    let bad_addr = "zz".repeat(32);
    let response = env
        .server
        .get(&format!("/api/v1/vesting/schedules?account={bad_addr}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

// GET /api/v1/vesting/token-supply

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn token_supply_empty(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/vesting/token-supply").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["totalSupply"], 5_000_000_000.0);
    assert_eq!(body["circulatingSupply"], 0.0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn token_supply_excludes_contracts(pool: PgPool) {
    let contract_addr = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
    // User holds 1000 BIG, contract holds 5000 BIG
    seed_token_holding(&pool, VALID_ADDRESS, "1000000000000000000000").await;
    seed_token_holding(&pool, contract_addr, "5000000000000000000000").await;
    seed_contract_registry(&pool, contract_addr, "ico").await;

    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/vesting/token-supply").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    // Only user balance counts as circulating
    let circulating = body["circulatingSupply"].as_f64().unwrap();
    assert!(
        (circulating - 1000.0).abs() < 0.01,
        "expected ~1000.0, got {circulating}"
    );
}

// GET /api/v1/vesting/release-schedule

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn release_schedule_empty(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/vesting/release-schedule").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert!(body["data"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn release_schedule_with_schedules(pool: PgPool) {
    let amount = "1000000000000000000000"; // 1000 BIG
    let month_ms: i64 = 30 * 24 * 60 * 60 * 1000;
    // cliff=6 months, vesting=12 months
    seed_vesting_schedule(
        &pool,
        "0",
        VALID_ADDRESS,
        amount,
        0,
        6 * month_ms,
        12 * month_ms,
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/vesting/release-schedule").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert!(!data.is_empty());
    // First point (month 0) should have 0 released (before cliff)
    assert_eq!(data[0]["released"], 0.0);
    // Last point should have full amount released
    let last = data.last().unwrap();
    let released = last["released"].as_f64().unwrap();
    assert!(
        (released - 1000.0).abs() < 0.01,
        "expected ~1000.0 at end, got {released}"
    );
}
