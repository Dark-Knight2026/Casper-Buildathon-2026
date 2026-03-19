//! Integration tests for staking event handlers.
//!
//! Covered handlers:
//!
//! - **`Staked`** - UPSERT `staking_positions` (increase `staked_amount`),
//!   writes `staking_events` row.
//! - **`UnstakedInitiated`** - decrease `staked_amount`, set unbonding state.
//! - **`UnbondedWithdrawn`** - clear unbonding state.
//! - **`RewardsDeposited`** - INSERT `staking_reward_deposits`.
//! - **`RewardsClaimed`** - INSERT `staking_events` + UPDATE `total_rewards_claimed`.

#![cfg(feature = "integration")]

mod common;

use std::collections::HashSet;

use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;

use common::{FakeAddress, MIGRATOR};
use indexer::{
    config::ContractType,
    events::EventRegistry,
    processor::{self, RawEvent},
};

const STAKING_DEPLOY_1: &str = "0000000000000000000000000000000000000000000000000000000000009001";
const STAKING_DEPLOY_2: &str = "0000000000000000000000000000000000000000000000000000000000009002";
const STAKING_DEPLOY_3: &str = "0000000000000000000000000000000000000000000000000000000000009003";
const STAKING_DEPLOY_4: &str = "0000000000000000000000000000000000000000000000000000000000009004";
const STAKING_DEPLOY_5: &str = "0000000000000000000000000000000000000000000000000000000000009005";

fn staking_event(deploy_hash: &str, event_name: &str, data: serde_json::Value) -> RawEvent {
    RawEvent {
        contract_hash: "staking_contract_hash".to_owned(),
        deploy_hash: deploy_hash.to_owned(),
        block_height: 500,
        contract_type: ContractType::Staking,
        event_name: event_name.to_owned(),
        event_data: data,
        block_timestamp: Some(Utc::now()),
        transform_idx: None,
    }
}

// Staked handler --------------------------------------------------------------

/// `Staked` must create a staking position row and a staking event.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staked_creates_position_and_event(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_1,
            "Staked",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "5000000000000000000000"
            }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT staked_amount, total_rewards_claimed
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(pos.staked_amount, "5000000000000000000000");
    assert_eq!(pos.total_rewards_claimed, "0");

    let event_count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*)
            FROM staking_events
            WHERE staker_address = $1 AND event_type = 'stake'
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(event_count, 1);
}

/// Multiple `Staked` events accumulate in `staked_amount`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staked_accumulates(pool: PgPool) {
    common::disable_rls(&pool).await;

    for (deploy, amount) in [(STAKING_DEPLOY_1, "1000"), (STAKING_DEPLOY_2, "2500")] {
        processor::process_event(
            &pool,
            &EventRegistry::new(),
            &HashSet::new(),
            &staking_event(
                deploy,
                "Staked",
                json!({
                    "staker": FakeAddress::Buyer.as_str(),
                    "amount": amount
                }),
            ),
        )
        .await
        .unwrap();
    }

    let staked: String = sqlx::query_scalar!(
        r"
            SELECT staked_amount
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        staked, "3500",
        "staked_amount must accumulate: 1000 + 2500 = 3500"
    );
}

// UnstakedInitiated handler ---------------------------------------------------

/// `UnstakedInitiated` must decrease `staked_amount` and set unbonding fields.
#[sqlx::test(migrator = "MIGRATOR")]
async fn unstaked_initiated_sets_unbonding(pool: PgPool) {
    common::disable_rls(&pool).await;

    // First stake
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_1,
            "Staked",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "10000"
            }),
        ),
    )
    .await
    .unwrap();

    // Then initiate unstake
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_2,
            "UnstakedInitiated",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "4000",
                "unbonding_ends_at": 1_700_172_800_000_u64
            }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT staked_amount, unbonding_amount, unbonding_ends_at
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(pos.staked_amount, "6000", "10000 - 4000 = 6000");
    assert_eq!(pos.unbonding_amount, "4000");
    assert_eq!(pos.unbonding_ends_at, 1_700_172_800_000);
}

// UnbondedWithdrawn handler ---------------------------------------------------

/// `UnbondedWithdrawn` must clear the unbonding state.
#[sqlx::test(migrator = "MIGRATOR")]
async fn unbonded_withdrawn_clears_unbonding(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Stake -> Unstake -> Withdraw
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_1,
            "Staked",
            json!({ "staker": FakeAddress::Buyer.as_str(), "amount": "10000" }),
        ),
    )
    .await
    .unwrap();

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_2,
            "UnstakedInitiated",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "10000",
                "unbonding_ends_at": 1_700_172_800_000_u64
            }),
        ),
    )
    .await
    .unwrap();

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_3,
            "UnbondedWithdrawn",
            json!({ "staker": FakeAddress::Buyer.as_str(), "amount": "10000" }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT unbonding_amount, unbonding_ends_at
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(pos.unbonding_amount, "0");
    assert_eq!(pos.unbonding_ends_at, 0);
}

// RewardsDeposited handler ----------------------------------------------------

/// `RewardsDeposited` must insert a row into `staking_reward_deposits`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn rewards_deposited_inserts_deposit(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_4,
            "RewardsDeposited",
            json!({
                "caller": FakeAddress::ContractX.as_str(),
                "amount": "100000"
            }),
        ),
    )
    .await
    .unwrap();

    let deposit = sqlx::query!(
        r"
            SELECT caller_address, amount, transaction_hash
            FROM staking_reward_deposits
            WHERE transaction_hash = $1
        ",
        STAKING_DEPLOY_4,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(deposit.caller_address, FakeAddress::ContractX.as_str());
    assert_eq!(deposit.amount, "100000");
    assert_eq!(deposit.transaction_hash, STAKING_DEPLOY_4);
}

/// Duplicate `RewardsDeposited` with same deploy hash is idempotent.
#[sqlx::test(migrator = "MIGRATOR")]
async fn rewards_deposited_idempotent(pool: PgPool) {
    common::disable_rls(&pool).await;

    for _ in 0..2 {
        processor::process_event(
            &pool,
            &EventRegistry::new(),
            &HashSet::new(),
            &staking_event(
                STAKING_DEPLOY_4,
                "RewardsDeposited",
                json!({
                    "caller": FakeAddress::ContractX.as_str(),
                    "amount": "100000"
                }),
            ),
        )
        .await
        .unwrap();
    }

    let count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*)
            FROM staking_reward_deposits
            WHERE transaction_hash = $1
        ",
        STAKING_DEPLOY_4,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        count, 1,
        "duplicate RewardsDeposited must not create second row"
    );
}

// RewardsClaimed handler ------------------------------------------------------

/// `RewardsClaimed` must insert a staking event and update `total_rewards_claimed`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn rewards_claimed_updates_position(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Stake first so position exists
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_1,
            "Staked",
            json!({ "staker": FakeAddress::Buyer.as_str(), "amount": "10000" }),
        ),
    )
    .await
    .unwrap();

    // Claim rewards
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_5,
            "RewardsClaimed",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "500"
            }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT total_rewards_claimed
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(pos.total_rewards_claimed, "500");

    let event_count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*)
            FROM staking_events
            WHERE staker_address = $1 AND event_type = 'reward_claim'
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(event_count, 1);
}

/// Multiple `RewardsClaimed` events accumulate in `total_rewards_claimed`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn rewards_claimed_accumulates(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Stake first
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_1,
            "Staked",
            json!({ "staker": FakeAddress::Buyer.as_str(), "amount": "10000" }),
        ),
    )
    .await
    .unwrap();

    // Claim twice
    for (deploy, amount) in [(STAKING_DEPLOY_4, "300"), (STAKING_DEPLOY_5, "700")] {
        processor::process_event(
            &pool,
            &EventRegistry::new(),
            &HashSet::new(),
            &staking_event(
                deploy,
                "RewardsClaimed",
                json!({
                    "staker": FakeAddress::Buyer.as_str(),
                    "amount": amount
                }),
            ),
        )
        .await
        .unwrap();
    }

    let total: String = sqlx::query_scalar!(
        r"
            SELECT total_rewards_claimed
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        total, "1000",
        "total_rewards_claimed must accumulate: 300 + 700 = 1000"
    );
}
