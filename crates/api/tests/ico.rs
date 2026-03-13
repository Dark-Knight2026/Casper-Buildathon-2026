//! Tests for ICO endpoints: balance lookup, progress reporting,
//! address validation, and missing-config error handling.

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;

use api::{IcoConfig, UserId, UserRole, server::PUBLIC_DATA_RATE_LIMIT_BURST};
use common::TestOverrides;

/// 64-char hex address used as a valid account hash in tests.
const VALID_ADDRESS: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
/// ICO token price in USD used across all ICO tests.
const ICO_PRICE_USD: f64 = 0.5;
/// Total ICO allocation in minimal units (500M BIG with decimals=18).
const ICO_TOTAL_ALLOCATION: &str = "500000000000000000000000000";
/// Acceptable tolerance for f64 USD comparisons after float arithmetic.
const USD_TOLERANCE: f64 = 1e-6;

fn ico_overrides() -> TestOverrides {
    TestOverrides {
        ico: Some(IcoConfig {
            price_usd: ICO_PRICE_USD,
            total_allocation: ICO_TOTAL_ALLOCATION.to_owned(),
        }),
        ..Default::default()
    }
}

/// Seed an ICO purchase row.
async fn seed_ico_purchase(pool: &PgPool, tx_hash: &str, buyer: &str, amount: &str) {
    sqlx::query(
        r"INSERT INTO ico_purchases
            (transaction_hash, block_height, buyer_address, amount,
             currency, cost, event_timestamp)
          VALUES ($1, 1, $2, $3, 'CSPR', '100', 1700000000)",
    )
    .bind(tx_hash)
    .bind(buyer)
    .bind(amount)
    .execute(pool)
    .await
    .expect("Failed to seed ICO purchase");
}

// GET /api/v1/ico/balance/{address}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_no_purchases(pool: PgPool) {
    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);

    let (status, body): (_, Option<Value>) = common::authed_request(
        &env.server,
        &Method::GET,
        &format!("/api/v1/ico/balance/{VALID_ADDRESS}"),
        &token,
        &json!({}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.expect("valid JSON");
    assert_eq!(body["tokensPurchased"], "0");
    assert_eq!(body["totalSpentUSD"], 0.0);
    assert_eq!(body["tokenPrice"], ICO_PRICE_USD);
    assert_eq!(body["tokenSymbol"], "BIG");
    assert_eq!(body["currentValue"], 0.0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_with_purchases(pool: PgPool) {
    // 2 * 10^18 tokens = 2 BIG
    let amount = "2000000000000000000";
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, amount).await;

    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);

    let (status, body): (_, Option<Value>) = common::authed_request(
        &env.server,
        &Method::GET,
        &format!("/api/v1/ico/balance/{VALID_ADDRESS}"),
        &token,
        &json!({}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.expect("valid JSON");
    assert_eq!(body["tokensPurchased"], amount);
    // 2 BIG * $0.50 = $1.00
    let spent = body["totalSpentUSD"].as_f64().unwrap();
    assert!(
        (spent - 1.0).abs() < USD_TOLERANCE,
        "expected ~1.0, got {spent}"
    );
    assert_eq!(body["tokenPrice"], ICO_PRICE_USD);
    assert_eq!(body["tokenSymbol"], "BIG");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_aggregates_multiple_purchases(pool: PgPool) {
    // 1 BIG each
    let one_big = "1000000000000000000";
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, one_big).await;
    seed_ico_purchase(&pool, &"b".repeat(64), VALID_ADDRESS, one_big).await;

    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);

    let (status, body): (_, Option<Value>) = common::authed_request(
        &env.server,
        &Method::GET,
        &format!("/api/v1/ico/balance/{VALID_ADDRESS}"),
        &token,
        &json!({}),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let body = body.expect("valid JSON");
    assert_eq!(body["tokensPurchased"], "2000000000000000000");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_invalid_address_returns_400(pool: PgPool) {
    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);

    let (status, _): (_, Option<Value>) = common::authed_request(
        &env.server,
        &Method::GET,
        "/api/v1/ico/balance/tooshort",
        &token,
        &json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_returns_500_without_config(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;
    let token = common::create_test_jwt(UserId::default(), UserRole::Tenant, &env.jwt_secret);

    let (status, _): (_, Option<Value>) = common::authed_request(
        &env.server,
        &Method::GET,
        &format!("/api/v1/ico/balance/{VALID_ADDRESS}"),
        &token,
        &json!({}),
    )
    .await;
    assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_requires_auth(pool: PgPool) {
    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;

    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{VALID_ADDRESS}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

// GET /api/v1/ico/progress

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_no_purchases(pool: PgPool) {
    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;

    let response = env.server.get("/api/v1/ico/progress").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensSold"], "0");
    assert_eq!(body["totalAllocation"], ICO_TOTAL_ALLOCATION);
    assert_eq!(body["tokensRemaining"], ICO_TOTAL_ALLOCATION);
    assert_eq!(body["amountRaised"], 0.0);
    assert_eq!(body["priceUsd"], ICO_PRICE_USD);
    assert_eq!(body["percentSold"], 0.0);
    assert!(body.get("hardCapUsd").is_some());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_with_purchases(pool: PgPool) {
    // Seed 10 BIG purchased
    let ten_big = "10000000000000000000";
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, ten_big).await;

    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;

    let response = env.server.get("/api/v1/ico/progress").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensSold"], ten_big);
    // amount_raised = 10 * 0.5 = 5.0
    let raised = body["amountRaised"].as_f64().unwrap();
    assert!(
        (raised - 5.0).abs() < USD_TOLERANCE,
        "expected ~5.0, got {raised}"
    );
    let pct = body["percentSold"].as_f64().unwrap();
    assert!(pct > 0.0 && pct < 1.0, "expected small percent, got {pct}");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_returns_500_without_config(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/ico/progress").await;
    assert_eq!(response.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_is_public(pool: PgPool) {
    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;

    let response = env.server.get("/api/v1/ico/progress").await;
    assert_eq!(response.status_code(), StatusCode::OK);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_rate_limited_after_burst(pool: PgPool) {
    let env = common::setup_test_server_with(pool, false, ico_overrides()).await;

    for i in 0..=PUBLIC_DATA_RATE_LIMIT_BURST {
        let response = env.server.get("/api/v1/ico/progress").await;

        if i < PUBLIC_DATA_RATE_LIMIT_BURST {
            assert_eq!(
                response.status_code(),
                StatusCode::OK,
                "Request {i} should succeed within burst limit"
            );
        } else {
            assert_eq!(
                response.status_code(),
                StatusCode::TOO_MANY_REQUESTS,
                "Request {i} should be rate-limited after burst exhausted"
            );
        }
    }
}
