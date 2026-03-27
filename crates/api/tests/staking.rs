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
/// `unbonding_ends_at_ms` is epoch ms; converted to TIMESTAMPTZ (NULL when 0).
async fn seed_unbonding_position(
    pool: &PgPool,
    staker: &str,
    unbonding_amount: &str,
    unbonding_ends_at_ms: i64,
) {
    let ts = chrono::DateTime::from_timestamp_millis(unbonding_ends_at_ms);
    sqlx::query(
        r"
            INSERT INTO staking_positions (staker_address, staked_amount, total_rewards_claimed, unbonding_amount, unbonding_ends_at, last_updated_at)
            VALUES ($1, '0', '0', $2, $3, NOW())
        ",
    )
    .bind(staker)
    .bind(unbonding_amount)
    .bind(ts)
    .execute(pool)
    .await
    .expect("Failed to seed unbonding position");
}

/// Seed a staking position with reward tracking fields.
async fn seed_staking_position_with_rewards(
    pool: &PgPool,
    staker: &str,
    staked_amount: &str,
    total_rewards_claimed: &str,
    pending_rewards: &str,
    reward_per_token_paid: &str,
) {
    sqlx::query(
        r"
            INSERT INTO staking_positions (staker_address, staked_amount, total_rewards_claimed, pending_rewards, reward_per_token_paid, last_updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        ",
    )
    .bind(staker)
    .bind(staked_amount)
    .bind(total_rewards_claimed)
    .bind(pending_rewards)
    .bind(reward_per_token_paid)
    .execute(pool)
    .await
    .expect("Failed to seed staking position with rewards");
}

/// Seed the global reward state singleton.
async fn seed_reward_state(pool: &PgPool, reward_per_token_stored: &str) {
    sqlx::query(
        r"
            UPDATE staking_reward_state
            SET reward_per_token_stored = $1, last_updated_at = NOW()
            WHERE id = 1
        ",
    )
    .bind(reward_per_token_stored)
    .execute(pool)
    .await
    .expect("Failed to seed reward state");
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
async fn staking_info_apy_with_reward_deposits(pool: PgPool) {
    // 10 000 BIG staked total (18 decimals)
    seed_staking_position(&pool, VALID_ADDRESS, "10000000000000000000000", "0").await;

    // Deposit 1000 BIG rewards within last 30 days
    let recent = (Utc::now() - Duration::days(10)).to_rfc3339();
    sqlx::query(
        r"
            INSERT INTO staking_reward_deposits
                (caller_address, amount, transaction_hash, block_height, event_timestamp)
            VALUES ($1, $2, 'apy_test_tx_hash_0001', 1, $3::TIMESTAMPTZ)
        ",
    )
    .bind(VALID_ADDRESS)
    .bind("1000000000000000000000") // 1000 BIG
    .bind(&recent)
    .execute(&pool)
    .await
    .expect("Failed to seed reward deposit");

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let apy = body["currentApy"].as_f64().unwrap();
    // Expected: (1000 * 365 / 30) / 10000 * 100 = 121.67%
    assert!(
        apy > 100.0 && apy < 150.0,
        "expected APY ~121.67%, got {apy}"
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

// GET /api/v1/staking/{accountHash} - pending rewards

/// Pending rewards are computed off-chain:
/// `pending_rewards + (staked_amount * (global_reward_per_token - reward_per_token_paid)) / 1e18`
///
/// Setup: `staked = 100_000 BIG`, `pending = 50 BIG`, `global_reward_per_token = 2e18`,
/// `reward_per_token_paid = 1e18`
/// Expected: `50 + (100_000 * (2e18 - 1e18)) / 1e18 = 50 + 100_000 = 100_050 BIG`
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_includes_pending_rewards(pool: PgPool) {
    seed_staking_position_with_rewards(
        &pool,
        VALID_ADDRESS,
        "100000000000000000000000", // 100_000 BIG (18 decimals)
        "200000000000000000000",    // 200 BIG claimed
        "50000000000000000000",     // 50 BIG pending
        "1000000000000000000",      // reward_per_token_paid = 1e18
    )
    .await;

    seed_reward_state(&pool, "2000000000000000000").await; // global = 2e18

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();

    // pending_rewards = 50 + (100_000 * (2e18 - 1e18)) / 1e18 = 100_050
    let pending = body["pendingRewards"].as_f64().unwrap();
    assert!(
        (pending - 100_050.0).abs() < 0.01,
        "expected ~100050.0, got {pending}"
    );

    // totalRewardsEarned = claimed (200) + pending (100_050) = 100_250
    let total = body["totalRewardsEarned"].as_f64().unwrap();
    assert!(
        (total - 100_250.0).abs() < 0.01,
        "expected ~100250.0, got {total}"
    );
}

/// When no rewards have been deposited yet, pending should be 0.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_pending_rewards_zero_when_no_deposits(pool: PgPool) {
    seed_staking_position(&pool, VALID_ADDRESS, "1000000000000000000000", "0").await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let pending = body["pendingRewards"].as_f64().unwrap();
    assert!(pending.abs() < 0.01, "expected ~0.0, got {pending}");
}

/// Portfolio endpoint should include pending rewards in `rewards_earned`.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn portfolio_includes_pending_rewards(pool: PgPool) {
    seed_staking_position_with_rewards(
        &pool,
        VALID_ADDRESS,
        "10000000000000000000000", // 10_000 BIG staked
        "100000000000000000000",   // 100 BIG claimed
        "50000000000000000000",    // 50 BIG pending
        "1000000000000000000",     // reward_per_token_paid = 1e18
    )
    .await;
    seed_reward_state(&pool, "2000000000000000000").await; // global = 2e18
    seed_token_holding(&pool, VALID_ADDRESS, "5000000000000000000000").await; // 5000 BIG in wallet
    seed_ico_schedule(&pool, "500000").await; // $0.50

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/portfolio"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();

    // pending = 50 + (10_000 * 1e18) / 1e18 = 10_050
    // rewards_earned = claimed (100) + pending (10_050) = 10_150
    let rewards = body["rewardsEarned"].as_f64().unwrap();
    assert!(
        (rewards - 10_150.0).abs() < 0.01,
        "expected ~10150.0, got {rewards}"
    );
}

// Vesting fallback for staked tokens -----------------------------------------

/// Seed a vesting schedule for a beneficiary.
async fn seed_vesting_schedule(
    pool: &PgPool,
    vesting_id: &str,
    beneficiary: &str,
    total_amount: &str,
    claimed_amount: &str,
) {
    sqlx::query(
        r"
            INSERT INTO vesting_schedules (vesting_id, beneficiary, whitelisted_creator, total_amount, claimed_amount, start_timestamp, cliff_duration, vesting_duration, transaction_hash, block_height)
            VALUES ($1, $2, 'ico_contract_hash', $3, $4, 1000, 500, 1000, md5(random()::text), 1)
        ",
    )
    .bind(vesting_id)
    .bind(beneficiary)
    .bind(total_amount)
    .bind(claimed_amount)
    .execute(pool)
    .await
    .expect("Failed to seed vesting schedule");
}

/// No staking position, but has vesting schedule -> stakedTokens = vesting locked.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_falls_back_to_vesting_locked(pool: PgPool) {
    // 5000 BIG locked via vesting, 0 claimed
    seed_vesting_schedule(
        &pool,
        "0",
        VALID_ADDRESS,
        "5000000000000000000000", // 5000 BIG total
        "0",                      // 0 claimed
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
        (staked - 5000.0).abs() < 0.01,
        "expected ~5000.0 from vesting fallback, got {staked}"
    );
}

/// Vesting locked = total - claimed when some tokens are already claimed.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_vesting_fallback_subtracts_claimed(pool: PgPool) {
    // 5000 BIG total, 2000 claimed -> 3000 locked
    seed_vesting_schedule(
        &pool,
        "0",
        VALID_ADDRESS,
        "5000000000000000000000", // 5000 BIG
        "2000000000000000000000", // 2000 BIG claimed
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
        (staked - 3000.0).abs() < 0.01,
        "expected ~3000.0 (5000 - 2000), got {staked}"
    );
}

/// Staking position with `staked_amount = 0`, but vesting exists -> fallback.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_zero_staked_falls_back_to_vesting(pool: PgPool) {
    // Staking position exists but with 0 staked (e.g. fully unstaked)
    seed_staking_position(&pool, VALID_ADDRESS, "0", "0").await;
    // Vesting schedule with 4000 BIG locked
    seed_vesting_schedule(&pool, "0", VALID_ADDRESS, "4000000000000000000000", "0").await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let staked = body["stakedTokens"].as_f64().unwrap();
    assert!(
        (staked - 4000.0).abs() < 0.01,
        "expected ~4000.0 from vesting fallback, got {staked}"
    );
}

/// Staking position with staked > 0 takes priority over vesting (no double counting).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_prefers_staked_over_vesting(pool: PgPool) {
    // 1000 BIG in staking position
    seed_staking_position(&pool, VALID_ADDRESS, "1000000000000000000000", "0").await;
    // 5000 BIG locked in vesting (same tokens, should not add up)
    seed_vesting_schedule(&pool, "0", VALID_ADDRESS, "5000000000000000000000", "0").await;

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
        "expected ~1000.0 from staking (not vesting), got {staked}"
    );
}

/// Portfolio endpoint also falls back to vesting locked tokens.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn portfolio_falls_back_to_vesting_locked(pool: PgPool) {
    seed_token_holding(&pool, VALID_ADDRESS, "500000000000000000000").await; // 500 BIG wallet
    seed_vesting_schedule(
        &pool,
        "0",
        VALID_ADDRESS,
        "3000000000000000000000", // 3000 BIG locked
        "0",
    )
    .await;

    let env = common::setup_test_server(pool, false).await;

    let response = env
        .server
        .get(&format!("/api/v1/staking/{VALID_ADDRESS}/portfolio"))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: Value = response.json();
    let staked = body["bigStaked"].as_f64().unwrap();
    assert!(
        (staked - 3000.0).abs() < 0.01,
        "expected ~3000.0 from vesting fallback, got {staked}"
    );
    let total = body["totalBig"].as_f64().unwrap();
    assert!(
        (total - 3500.0).abs() < 0.01,
        "totalBig should be 500 + 3000 = 3500, got {total}"
    );
}

/// Multiple vesting schedules sum up correctly.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn staking_info_vesting_fallback_sums_multiple_schedules(pool: PgPool) {
    // Two vesting schedules for the same beneficiary
    seed_vesting_schedule(&pool, "0", VALID_ADDRESS, "2000000000000000000000", "0").await;
    seed_vesting_schedule(
        &pool,
        "1",
        VALID_ADDRESS,
        "3000000000000000000000",
        "1000000000000000000000", // 1000 claimed
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
    // (2000 - 0) + (3000 - 1000) = 4000
    assert!(
        (staked - 4000.0).abs() < 0.01,
        "expected ~4000.0 (2000 + 2000), got {staked}"
    );
}
