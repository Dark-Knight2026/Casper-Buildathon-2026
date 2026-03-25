//! Tests for staking endpoints: staking info, portfolio, earnings,
//! rewards history, and address validation.

#![cfg(feature = "integration")]

mod common;

use axum::http::StatusCode;
use chrono::{Duration, Utc};
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

/// Seed a staking position with unbonding fields.
async fn seed_unbonding_position(
    pool: &PgPool,
    staker: &str,
    unbonding_amount: &str,
    unbonding_ends_at: i64,
) {
    sqlx::query(
        r"
            INSERT INTO staking_positions (staker_address, staked_amount, total_rewards_claimed, unbonding_amount, unbonding_ends_at, last_updated_at)
            VALUES ($1, '0', '0', $2, $3, NOW())
        ",
    )
    .bind(staker)
    .bind(unbonding_amount)
    .bind(unbonding_ends_at)
    .execute(pool)
    .await
    .expect("Failed to seed unbonding position");
}

/// Seed a staking event (unstake or withdraw) with a specific timestamp.
async fn seed_staking_event(
    pool: &PgPool,
    staker: &str,
    event_type: &str,
    amount: &str,
    timestamp: &str,
) {
    sqlx::query(
        r"
            INSERT INTO staking_events (staker_address, event_type, amount, transaction_hash, block_height, event_timestamp)
            VALUES ($1, $2, $3, md5(random()::text), 1, $4::TIMESTAMPTZ)
        ",
    )
    .bind(staker)
    .bind(event_type)
    .bind(amount)
    .bind(timestamp)
    .execute(pool)
    .await
    .expect("Failed to seed staking event");
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
    assert_eq!(body["totalRewardsClaimed"], 0.0);
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
    let rewards = body["totalRewardsClaimed"].as_f64().unwrap();
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
    // Use relative timestamps so the test stays valid regardless of when it runs.
    let now = Utc::now();
    let two_months_ago = (now - Duration::days(60)).to_rfc3339();
    let two_months_ago_b = (now - Duration::days(55)).to_rfc3339();
    let one_month_ago = (now - Duration::days(20)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "1000", &two_months_ago).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "2000", &two_months_ago_b).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "500", &one_month_ago).await;

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
    assert!(
        data.len() >= 2,
        "should have at least 2 months, got {}",
        data.len()
    );
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
    let now = Utc::now();
    // Seed two claims on different days within last 90 days (18 decimals)
    let day_5 = (now - Duration::days(5)).to_rfc3339();
    let day_3 = (now - Duration::days(3)).to_rfc3339();
    // 100 BIG = 100 * 10^18
    seed_reward_claim_event(&pool, VALID_ADDRESS, "100000000000000000000", &day_5).await;
    // 200 BIG = 200 * 10^18
    seed_reward_claim_event(&pool, VALID_ADDRESS, "200000000000000000000", &day_3).await;

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

// Earnings period validation

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_invalid_period_returns_400(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/earnings?period=invalid"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_1m_excludes_old_events(pool: PgPool) {
    let now = Utc::now();
    let recent = (now - Duration::days(10)).to_rfc3339();
    let old = (now - Duration::days(60)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "1000", &recent).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "2000", &old).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/earnings?period=1m"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    // Only the recent event should appear (within 1 month)
    assert_eq!(data.len(), 1, "1m period should exclude 60-day old event");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn rewards_history_excludes_outside_window(pool: PgPool) {
    let now = Utc::now();
    let within = (now - Duration::days(10)).to_rfc3339();
    let outside = (now - Duration::days(40)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "100000000000000000000", &within).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "200000000000000000000", &outside).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/rewards-history?period=30"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    // Only the within-window event should appear
    assert_eq!(
        data.len(),
        1,
        "30-day window should exclude 40-day old event"
    );
    let cumulative = data[0]["stakingPool"].as_f64().unwrap();
    assert!(
        (cumulative - 100.0).abs() < 0.01,
        "expected ~100.0 (only recent event), got {cumulative}"
    );
}

// Earnings period filtering: 3m, 6m, 1y

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_3m_filters_correctly(pool: PgPool) {
    let now = Utc::now();
    let within = (now - Duration::days(60)).to_rfc3339();
    let outside = (now - Duration::days(120)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "1000", &within).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "2000", &outside).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/earnings?period=3m"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert_eq!(data.len(), 1, "3m period should exclude 120-day old event");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_6m_filters_correctly(pool: PgPool) {
    let now = Utc::now();
    let within = (now - Duration::days(150)).to_rfc3339();
    let outside = (now - Duration::days(200)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "1000", &within).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "2000", &outside).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/earnings?period=6m"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert_eq!(data.len(), 1, "6m period should exclude 200-day old event");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_1y_filters_correctly(pool: PgPool) {
    let now = Utc::now();
    let within = (now - Duration::days(300)).to_rfc3339();
    let outside = (now - Duration::days(400)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "1000", &within).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "2000", &outside).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/earnings?period=1y"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert_eq!(data.len(), 1, "1y period should exclude 400-day old event");
}

// Earnings default period (6m when omitted)

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn earnings_default_period_is_6m(pool: PgPool) {
    let now = Utc::now();
    let within = (now - Duration::days(150)).to_rfc3339();
    let outside = (now - Duration::days(200)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "1000", &within).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "2000", &outside).await;

    let env = common::setup_test_server(pool, false).await;

    // No period parameter -> should default to 6m
    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/earnings"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert_eq!(
        data.len(),
        1,
        "default period (6m) should exclude 200-day old event"
    );
}

// Rewards-history period clamping

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn rewards_history_period_zero_clamps_to_1(pool: PgPool) {
    let now = Utc::now();
    let today = (now - Duration::hours(1)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "100000000000000000000", &today).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/rewards-history?period=0"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    // period=0 clamps to 1 day, today's event should still appear
    assert_eq!(data.len(), 1, "period=0 clamped to 1 should include today");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn rewards_history_period_negative_clamps_to_1(pool: PgPool) {
    let now = Utc::now();
    let today = (now - Duration::hours(1)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "100000000000000000000", &today).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/rewards-history?period=-1"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert_eq!(data.len(), 1, "period=-1 clamped to 1 should include today");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn rewards_history_period_overflow_clamps_to_365(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    // period=366 should clamp to 365 and return 200 OK (not error)
    let response = env
        .server
        .get(&format!(
            "/api/v1/staking/{VALID_ADDRESS}/rewards-history?period=366"
        ))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn rewards_history_default_period_is_90(pool: PgPool) {
    let now = Utc::now();
    let within = (now - Duration::days(80)).to_rfc3339();
    let outside = (now - Duration::days(100)).to_rfc3339();

    seed_reward_claim_event(&pool, VALID_ADDRESS, "100000000000000000000", &within).await;
    seed_reward_claim_event(&pool, VALID_ADDRESS, "200000000000000000000", &outside).await;

    let env = common::setup_test_server(pool, false).await;

    // No period parameter -> should default to 90
    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/rewards-history"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let data = body["data"].as_array().unwrap();
    assert_eq!(
        data.len(),
        1,
        "default period (90 days) should exclude 100-day old event"
    );
}

// GET /api/v1/staking/{accountHash}/unbonding

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn unbonding_no_position_returns_zeros(pool: PgPool) {
    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/unbonding"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["unbondingAmount"], 0.0);
    assert_eq!(body["unbondingEndsAt"], 0);
    assert_eq!(body["isWithdrawable"], false);
    assert_eq!(body["timeRemainingMs"], 0);
    assert!(body["history"].as_array().unwrap().is_empty());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn unbonding_active_returns_not_withdrawable(pool: PgPool) {
    let now_ms = Utc::now().timestamp_millis();
    // Unbonding ends 7 days from now
    let ends_at = now_ms + 7 * 24 * 60 * 60 * 1000;
    // 500 BIG unbonding
    seed_unbonding_position(&pool, VALID_ADDRESS, "500000000000000000000", ends_at).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/unbonding"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let amount = body["unbondingAmount"].as_f64().unwrap();
    assert!(
        (amount - 500.0).abs() < 0.01,
        "expected ~500.0, got {amount}"
    );
    assert_eq!(body["isWithdrawable"], false);
    let remaining = body["timeRemainingMs"].as_i64().unwrap();
    assert!(remaining > 0, "time_remaining_ms should be positive");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn unbonding_expired_is_withdrawable(pool: PgPool) {
    let now_ms = Utc::now().timestamp_millis();
    // Unbonding ended 1 hour ago
    let ends_at = now_ms - 60 * 60 * 1000;
    seed_unbonding_position(&pool, VALID_ADDRESS, "500000000000000000000", ends_at).await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/unbonding"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    assert_eq!(body["isWithdrawable"], true);
    assert_eq!(body["timeRemainingMs"], 0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn unbonding_history_returns_chronologically(pool: PgPool) {
    let now = Utc::now();
    let day_10 = (now - Duration::days(10)).to_rfc3339();
    let day_5 = (now - Duration::days(5)).to_rfc3339();
    let day_2 = (now - Duration::days(2)).to_rfc3339();

    // unstake 500 BIG, then another unstake 300 BIG, then withdraw 500 BIG
    seed_staking_event(
        &pool,
        VALID_ADDRESS,
        "unstake",
        "500000000000000000000",
        &day_10,
    )
    .await;
    seed_staking_event(
        &pool,
        VALID_ADDRESS,
        "unstake",
        "300000000000000000000",
        &day_5,
    )
    .await;
    seed_staking_event(
        &pool,
        VALID_ADDRESS,
        "withdraw",
        "500000000000000000000",
        &day_2,
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/unbonding"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let history = body["history"].as_array().unwrap();
    assert_eq!(history.len(), 3, "should have 3 events");

    // Verify chronological order
    assert_eq!(history[0]["eventType"], "unstake");
    let amount_0 = history[0]["amount"].as_f64().unwrap();
    assert!((amount_0 - 500.0).abs() < 0.01);

    assert_eq!(history[1]["eventType"], "unstake");
    let amount_1 = history[1]["amount"].as_f64().unwrap();
    assert!((amount_1 - 300.0).abs() < 0.01);

    assert_eq!(history[2]["eventType"], "withdraw");
    let amount_2 = history[2]["amount"].as_f64().unwrap();
    assert!((amount_2 - 500.0).abs() < 0.01);

    // Verify timestamps are ISO 8601 and ascending
    let ts_0 = history[0]["timestamp"].as_str().unwrap();
    let ts_2 = history[2]["timestamp"].as_str().unwrap();
    assert!(ts_0 < ts_2, "events should be in chronological order");
}
