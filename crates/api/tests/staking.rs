//! Tests for staking endpoints: staking info, portfolio, earnings,
//! rewards history, and address validation.

mod common;

use axum::http::StatusCode;
use serde_json::Value;
use sqlx::PgPool;

/// 64-char hex address used as a valid account hash in tests.
const VALID_ADDRESS: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

/// Seed a staking position row.
async fn seed_staking_position(
    pool: &PgPool,
    staker: &str,
    staked_amount: &str,
    total_rewards_claimed: &str,
) {
    sqlx::query(
        r"
            INSERT INTO staking_positions (staker_address, staked_amount, total_rewards_claimed, last_updated_at)
            VALUES ($1, $2, $3, NOW())
        ",
    )
    .bind(staker)
    .bind(staked_amount)
    .bind(total_rewards_claimed)
    .execute(pool)
    .await
    .expect("Failed to seed staking position");
}

/// Seed a token holding for BIG balance.
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

/// Seed an ICO schedule (for price).
async fn seed_ico_schedule(pool: &PgPool, price: &str) {
    sqlx::query(
        r"
            INSERT INTO ico_schedules (schedule_id, start_timestamp, end_timestamp, sale_amount, price, transaction_hash, block_height)
            VALUES ('1', 1000, 2000, '1000000', $1, 'deadbeef', 1)
        ",
    )
    .bind(price)
    .execute(pool)
    .await
    .expect("Failed to seed ICO schedule");
}

/// Seed a staking event (`reward_claim`) with a specific timestamp.
async fn seed_reward_claim_event(pool: &PgPool, staker: &str, amount: &str, timestamp: &str) {
    sqlx::query(
        r"
            INSERT INTO staking_events (staker_address, event_type, amount, transaction_hash, block_height, event_timestamp)
            VALUES ($1, 'reward_claim', $2, md5(random()::text), 1, $3::TIMESTAMPTZ)
        ",
    )
    .bind(staker)
    .bind(amount)
    .bind(timestamp)
    .execute(pool)
    .await
    .expect("Failed to seed staking event");
}

// GET /api/v1/staking/{accountHash}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_no_position_returns_zeros(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["stakedTokens"], 0.0);
    assert_eq!(body["currentApy"], 0.0);
    assert_eq!(body["totalRewardsEarned"], 0.0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_with_position(pool: PgPool) {
    // 1000 BIG staked (18 decimals), 50 BIG rewards claimed
    seed_staking_position(
        &pool,
        VALID_ADDRESS,
        "1000000000000000000000",
        "50000000000000000000",
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let staked = body["stakedTokens"].as_f64().unwrap();
    assert!(
        (staked - 1000.0).abs() < 0.01,
        "expected ~1000.0, got {staked}"
    );
    let rewards = body["totalRewardsEarned"].as_f64().unwrap();
    assert!(
        (rewards - 50.0).abs() < 0.01,
        "expected ~50.0, got {rewards}"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_invalid_address_returns_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env.server.get("/api/v1/staking/too-short").await;
    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

// GET /api/v1/staking/{accountHash}/portfolio

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn portfolio_empty_returns_zeros(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/portfolio"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["bigInWallet"], 0.0);
    assert_eq!(body["bigStaked"], 0.0);
    assert_eq!(body["rewardsEarned"], 0.0);
    assert_eq!(body["totalBig"], 0.0);
    assert_eq!(body["change24hPercent"], 0.0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn portfolio_aggregates_wallet_and_staked(pool: PgPool) {
    // 500 BIG in wallet, 1000 BIG staked, 50 BIG rewards
    seed_token_holding(&pool, VALID_ADDRESS, "500000000000000000000").await;
    seed_staking_position(
        &pool,
        VALID_ADDRESS,
        "1000000000000000000000",
        "50000000000000000000",
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/portfolio"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let wallet = body["bigInWallet"].as_f64().unwrap();
    let staked = body["bigStaked"].as_f64().unwrap();
    let rewards = body["rewardsEarned"].as_f64().unwrap();
    let total = body["totalBig"].as_f64().unwrap();

    assert!((wallet - 500.0).abs() < 0.01);
    assert!((staked - 1000.0).abs() < 0.01);
    assert!((rewards - 50.0).abs() < 0.01);
    assert!(
        (total - 1550.0).abs() < 0.01,
        "totalBig should be 500 + 1000 + 50 = 1550, got {total}"
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn portfolio_usd_value_from_ico_price(pool: PgPool) {
    // 100 BIG total, ICO price = 500000 (= $0.50 with 6 decimals)
    seed_token_holding(&pool, VALID_ADDRESS, "100000000000000000000").await;
    seed_ico_schedule(&pool, "500000").await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/portfolio"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let usd = body["estimatedUsdValue"].as_f64().unwrap();
    // 100 BIG * $0.50 = $50
    assert!((usd - 50.0).abs() < 0.01, "expected ~$50.0, got {usd}");
}

// GET /api/v1/staking/{accountHash}/earnings

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_empty_returns_empty_data(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/earnings?period=all"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert!(body["data"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_groups_by_month(pool: PgPool) {
    seed_reward_claim_event(&pool, VALID_ADDRESS, "1000", "2026-01-15T10:00:00Z").await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "2000", "2026-01-20T10:00:00Z").await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "500", "2026-02-10T10:00:00Z").await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/earnings?period=all"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert_eq!(data.len(), 2, "should have 2 months");
    assert_eq!(data[0]["month"], "2026-01");
    assert_eq!(data[1]["month"], "2026-02");
}

// GET /api/v1/staking/{accountHash}/rewards-history

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn rewards_history_empty_returns_empty_data(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/rewards-history?period=30"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert!(body["data"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn rewards_history_returns_cumulative(pool: PgPool) {
    // Seed two claims on different days within last 90 days (18 decimals)
    // 100 BIG = 100 * 10^18
    seed_reward_claim_event(
        &pool,
        VALID_ADDRESS,
        "100000000000000000000",
        "2026-03-10T10:00:00Z",
    )
    .await;
    // 200 BIG = 200 * 10^18
    seed_reward_claim_event(
        &pool,
        VALID_ADDRESS,
        "200000000000000000000",
        "2026-03-12T10:00:00Z",
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/rewards-history?period=90"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert!(!data.is_empty());
    // All points should have txFees = 0
    for point in data {
        assert_eq!(point["txFees"], 0.0);
    }
    // Last point should have cumulative = 100 + 200 = 300
    let last = data.last().unwrap();
    let cumulative = last["stakingPool"].as_f64().unwrap();
    assert!(
        (cumulative - 300.0).abs() < 0.01,
        "expected cumulative ~300.0, got {cumulative}"
    );
}
