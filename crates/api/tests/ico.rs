//! Tests for ICO endpoints: balance lookup, progress reporting,
//! address validation, and missing-config error handling.

#![cfg(feature = "integration")]

mod common;

use axum::http::StatusCode;
use serde_json::Value;
use sqlx::PgPool;

use api::{IcoFallback, onchain::PUBLIC_DATA_RATE_LIMIT_BURST};
use common::TestOverrides;

/// 64-char hex address used as a valid account hash in tests.
const VALID_ADDRESS: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
/// ICO token price as U256 string with 6 decimals (500000 = $0.50).
const ICO_PRICE: &str = "500000";
/// Total ICO allocation in minimal units (500M BIG with decimals=18).
const ICO_TOTAL_ALLOCATION: &str = "500000000000000000000000000";
/// Acceptable tolerance for f64 USD comparisons after float arithmetic.
const USD_TOLERANCE: f64 = 1e-6;

/// Seed an ICO schedule row (replaces env-based `IcoConfig`).
async fn seed_ico_schedule(pool: &PgPool) {
    sqlx::query(
        r"
            INSERT INTO ico_schedules
                (schedule_id, start_timestamp, end_timestamp,
                 sale_amount, price, transaction_hash, block_height)
            VALUES ('test-schedule', 0, 9999999999, $1, $2, 'deadbeef', 1)
        ",
    )
    .bind(ICO_TOTAL_ALLOCATION)
    .bind(ICO_PRICE)
    .execute(pool)
    .await
    .expect("Failed to seed ICO schedule");
}

/// Seed an ICO purchase row.
async fn seed_ico_purchase(pool: &PgPool, tx_hash: &str, buyer: &str, amount: &str) {
    sqlx::query(
        r"
            INSERT INTO ico_purchases
                (transaction_hash, block_height, buyer_address,
                 amount, currency, cost, event_timestamp)
            VALUES ($1, 1, $2, $3, 'CSPR', '100', 1700000000)
        ",
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
    seed_ico_schedule(&pool).await;
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensPurchased"], "0");
    assert_eq!(body["totalSpentUsd"], 0.0);
    // price = 500000 / 10^6 = 0.5
    assert_eq!(body["tokenPrice"], 0.5);
    assert_eq!(body["tokenSymbol"], "BIG");
    assert_eq!(body["currentValue"], 0.0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_with_purchases(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    // 2 * 10^18 tokens = 2 BIG
    let amount = "2000000000000000000";
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, amount).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensPurchased"], amount);
    // 2 BIG * $0.50 = $1.00
    let spent = body["totalSpentUsd"].as_f64().unwrap();
    assert!(
        (spent - 1.0).abs() < USD_TOLERANCE,
        "expected ~1.0, got {spent}"
    );
    assert_eq!(body["tokenPrice"], 0.5);
    assert_eq!(body["tokenSymbol"], "BIG");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_aggregates_multiple_purchases(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    // 1 BIG each
    let one_big = "1000000000000000000";
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, one_big).await;
    seed_ico_purchase(&pool, &"b".repeat(64), VALID_ADDRESS, one_big).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensPurchased"], "2000000000000000000");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_invalid_address_returns_400(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    let env = common::setup_test_server(pool, false).await;

    // Too short
    let response = env.server.get("/api/v1/ico/balance/too-short").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);

    // Non-hex 64-char address
    let bad_addr = "zz".repeat(32);
    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{bad_addr}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_returns_500_without_any_config(pool: PgPool) {
    // No schedule in DB, no env fallback -> 500
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{VALID_ADDRESS}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
    let body: Value = response.json();
    assert_eq!(
        body["error"].as_str().unwrap(),
        "An internal server error occurred",
        "Expected internal error message, got: {body}"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_is_public(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{VALID_ADDRESS}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);
}

// GET /api/v1/ico/progress

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_no_purchases(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/ico/progress").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensSold"], "0");
    assert_eq!(body["totalAllocation"], ICO_TOTAL_ALLOCATION);
    assert_eq!(body["tokensRemaining"], ICO_TOTAL_ALLOCATION);
    assert_eq!(body["amountRaised"], 0.0);
    assert_eq!(body["priceUsd"], 0.5);
    assert_eq!(body["percentSold"], 0.0);
    // hardCapUsd = 500_000_000 BIG * $0.50 = $250_000_000
    let hard_cap = body["hardCapUsd"].as_f64().unwrap();
    assert!(
        (hard_cap - 250_000_000.0).abs() < USD_TOLERANCE,
        "expected ~250000000.0, got {hard_cap}"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_with_purchases(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    // Seed 10 BIG purchased
    let ten_big = "10000000000000000000";
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, ten_big).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/ico/progress").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensSold"], ten_big);
    // tokensRemaining = total_allocation - tokens_sold
    // 500000000000000000000000000 - 10000000000000000000 = 499999990000000000000000000
    assert_eq!(
        body["tokensRemaining"], "499999990000000000000000000",
        "tokensRemaining must equal total_allocation minus tokens_sold"
    );
    // amount_raised = 10 * 0.5 = 5.0
    let raised = body["amountRaised"].as_f64().unwrap();
    assert!(
        (raised - 5.0).abs() < USD_TOLERANCE,
        "expected ~5.0, got {raised}"
    );
    let pct = body["percentSold"].as_f64().unwrap();
    assert!(pct > 0.0 && pct < 1.0, "expected small percent, got {pct}");
}

/// When total purchased equals the allocation, percent must cap at 100
/// and remaining tokens must be zero.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_full_allocation_sold(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, ICO_TOTAL_ALLOCATION).await;

    let env = common::setup_test_server(pool, false).await;
    let response = env.server.get("/api/v1/ico/progress").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["tokensSold"], ICO_TOTAL_ALLOCATION);
    assert_eq!(body["tokensRemaining"], "0");
    let pct = body["percentSold"].as_f64().unwrap();
    assert!(
        (pct - 100.0).abs() < f64::EPSILON,
        "expected percentSold == 100.0, got {pct}"
    );
}

/// When purchases exceed the allocation, percent must still cap at 100
/// and remaining tokens must clamp to zero (not go negative).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_oversold(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    // Seed two purchases that together exceed the total allocation
    seed_ico_purchase(&pool, &"a".repeat(64), VALID_ADDRESS, ICO_TOTAL_ALLOCATION).await;
    let extra = "1000000000000000000"; // 1 BIG over the limit
    seed_ico_purchase(&pool, &"b".repeat(64), VALID_ADDRESS, extra).await;

    let env = common::setup_test_server(pool, false).await;
    let response = env.server.get("/api/v1/ico/progress").await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(
        body["tokensRemaining"], "0",
        "tokensRemaining must clamp to zero when oversold"
    );
    let pct = body["percentSold"].as_f64().unwrap();
    assert!(
        (pct - 100.0).abs() < f64::EPSILON,
        "expected percentSold == 100.0 when oversold, got {pct}"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_returns_500_without_any_config(pool: PgPool) {
    // No schedule in DB, no env fallback -> 500
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/ico/progress").await;
    assert_eq!(response.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
    let body: Value = response.json();
    assert_eq!(
        body["error"].as_str().unwrap(),
        "An internal server error occurred",
        "Expected internal error message, got: {body}"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_is_public(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/ico/progress").await;
    assert_eq!(response.status_code(), StatusCode::OK);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_rate_limited_after_burst(pool: PgPool) {
    seed_ico_schedule(&pool).await;
    let env = common::setup_test_server(pool, false).await;

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

/// When `ico_schedules` is empty, handlers fall back to env var config.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_progress_uses_env_fallback_when_no_schedule(pool: PgPool) {
    let env = common::setup_test_server_with(
        pool,
        false,
        TestOverrides {
            ico_fallback: Some(IcoFallback {
                price_usd: "0.5".parse().unwrap(),
                total_allocation: ICO_TOTAL_ALLOCATION.to_owned(),
            }),
            ..Default::default()
        },
    )
    .await;

    let response = env.server.get("/api/v1/ico/progress").await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body: Value = response.json();
    assert_eq!(body["priceUsd"], 0.5);
    assert_eq!(body["totalAllocation"], ICO_TOTAL_ALLOCATION);
}

/// When `ico_schedules` is empty, `/ico/balance/{address}` falls back to env var config.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn ico_balance_uses_env_fallback_when_no_schedule(pool: PgPool) {
    let env = common::setup_test_server_with(
        pool,
        false,
        TestOverrides {
            ico_fallback: Some(IcoFallback {
                price_usd: "0.5".parse().unwrap(),
                total_allocation: ICO_TOTAL_ALLOCATION.to_owned(),
            }),
            ..Default::default()
        },
    )
    .await;

    let response = env
        .server
        .get(&format!("/api/v1/ico/balance/{VALID_ADDRESS}"))
        .await;
    assert_eq!(response.status_code(), StatusCode::OK);

    let body: Value = response.json();
    assert_eq!(body["tokenPrice"], 0.5);
    assert_eq!(body["tokenSymbol"], "BIG");
}
