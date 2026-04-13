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
    staking_event_at(deploy_hash, event_name, data, 500)
}

fn staking_event_at(
    deploy_hash: &str,
    event_name: &str,
    data: serde_json::Value,
    block_height: u64,
) -> RawEvent {
    RawEvent {
        contract_hash: "staking_contract_hash".to_owned(),
        deploy_hash: deploy_hash.to_owned(),
        block_height,
        contract_type: ContractType::Staking,
        event_name: event_name.to_owned(),
        event_data: data,
        block_timestamp: Some(Utc::now()),
        transform_idx: None,
        api_from_type: None,
        api_to_type: None,
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

    // Verify blockchain_transactions row was written.
    let tx_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM blockchain_transactions WHERE transaction_hash = $1",
        STAKING_DEPLOY_1,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        tx_count, 1,
        "Staked handler must write a blockchain_transactions row"
    );
}

/// Replaying a `Staked` event with the same deploy hash must be idempotent:
/// `staked_amount` equals the single-event amount (not doubled) and only one
/// `staking_events` row exists.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staked_idempotent(pool: PgPool) {
    common::disable_rls(&pool).await;

    let event = staking_event(
        STAKING_DEPLOY_1,
        "Staked",
        json!({
            "staker": FakeAddress::Buyer.as_str(),
            "amount": "5000"
        }),
    );

    for _ in 0..2 {
        processor::process_event(&pool, &EventRegistry::new(), &HashSet::new(), &event)
            .await
            .unwrap();
    }

    let staked: String = sqlx::query_scalar!(
        r"SELECT staked_amount FROM staking_positions WHERE staker_address = $1",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        staked, "5000",
        "duplicate Staked must not double staked_amount"
    );

    let event_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM staking_events WHERE transaction_hash = $1",
        STAKING_DEPLOY_1,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        event_count, 1,
        "duplicate Staked must not create second staking_events row"
    );
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
    let expected_ts = chrono::DateTime::from_timestamp_millis(1_700_172_800_000);
    assert_eq!(pos.unbonding_ends_at, expected_ts);
}

/// `UnstakedInitiated` without a prior `Staked` event must not panic.
/// The handler logs a warning and updates zero rows.
#[sqlx::test(migrator = "MIGRATOR")]
async fn unstaked_initiated_without_prior_staked(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Dispatch UnstakedInitiated with no matching staking_positions row
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_1,
            "UnstakedInitiated",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "5000",
                "unbonding_ends_at": 1_700_172_800_000_u64
            }),
        ),
    )
    .await
    .unwrap();

    // staking_events row should still be inserted (event log is append-only)
    let event_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM staking_events WHERE staker_address = $1 AND event_type = 'unstake'",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);
    assert_eq!(event_count, 1, "event log should record the unstake");

    // No staking_positions row should exist (update matched zero rows)
    let pos_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM staking_positions WHERE staker_address = $1",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);
    assert_eq!(
        pos_count, 0,
        "no position should be created by unstake alone"
    );
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
    assert_eq!(pos.unbonding_ends_at, None);
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
                "amount": "100000",
                "reward_per_token_stored": "2000000000000000000"
            }),
        ),
    )
    .await
    .unwrap();

    let deposit = sqlx::query!(
        r"
            SELECT caller_address, amount, reward_per_token_stored, transaction_hash
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
    assert_eq!(deposit.reward_per_token_stored, "2000000000000000000");
    assert_eq!(deposit.transaction_hash, STAKING_DEPLOY_4);

    // Verify global reward state was updated.
    let global_reward_per_token: String = sqlx::query_scalar!(
        r"SELECT reward_per_token_stored FROM staking_reward_state WHERE id = 1"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(global_reward_per_token, "2000000000000000000");
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
                    "amount": "100000",
                    "reward_per_token_stored": "2000000000000000000"
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

/// A single deploy emitting two `RewardsDeposited` events (distinct `transform_idx`)
/// must insert **both** rows into `staking_reward_deposits` and update global
/// reward state for each. The dedup key must include `transform_idx`.
const STAKING_DEPLOY_10: &str = "0000000000000000000000000000000000000000000000000000000000009010";

#[sqlx::test(migrator = "MIGRATOR")]
async fn rewards_deposited_batch_deploy_both_recorded(pool: PgPool) {
    common::disable_rls(&pool).await;

    // First RewardsDeposited in the deploy (transform_idx = 0).
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "staking_contract_hash".to_owned(),
            deploy_hash: STAKING_DEPLOY_10.to_owned(),
            block_height: 500,
            contract_type: ContractType::Staking,
            event_name: "RewardsDeposited".to_owned(),
            event_data: json!({
                "caller": FakeAddress::ContractX.as_str(),
                "amount": "50000",
                "reward_per_token_stored": "1000000000000000000"
            }),
            block_timestamp: Some(Utc::now()),
            transform_idx: Some(0),
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // Second RewardsDeposited in the SAME deploy (transform_idx = 1).
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "staking_contract_hash".to_owned(),
            deploy_hash: STAKING_DEPLOY_10.to_owned(),
            block_height: 500,
            contract_type: ContractType::Staking,
            event_name: "RewardsDeposited".to_owned(),
            event_data: json!({
                "caller": FakeAddress::ContractX.as_str(),
                "amount": "75000",
                "reward_per_token_stored": "3000000000000000000"
            }),
            block_timestamp: Some(Utc::now()),
            transform_idx: Some(1),
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*)
            FROM staking_reward_deposits
            WHERE transaction_hash = $1
        ",
        STAKING_DEPLOY_10,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        count, 2,
        "batch deploy with two RewardsDeposited must create two rows"
    );

    // Global reward state must reflect the latest (highest) value.
    let global_reward_per_token: String = sqlx::query_scalar!(
        r"SELECT reward_per_token_stored FROM staking_reward_state WHERE id = 1"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        global_reward_per_token, "3000000000000000000",
        "global reward state must reflect the second deposit"
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

    // Verify blockchain_transactions row was written.
    let tx_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM blockchain_transactions WHERE transaction_hash = $1",
        STAKING_DEPLOY_5,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        tx_count, 1,
        "RewardsClaimed handler must write a blockchain_transactions row"
    );
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

// StakerSnapshot handler ------------------------------------------------------

const STAKING_DEPLOY_6: &str = "0000000000000000000000000000000000000000000000000000000000009006";

/// `StakerSnapshot` must update `pending_rewards` and `reward_per_token_paid`
/// on an existing staking position.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staker_snapshot_updates_position(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Create position via Staked event first.
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

    // Process StakerSnapshot.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_6,
            "StakerSnapshot",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "staked_amount": "10000",
                "pending_rewards": "500000000000000000000",
                "reward_per_token_paid": "3000000000000000000"
            }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT pending_rewards, reward_per_token_paid, snapshot_block_height
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(pos.pending_rewards, "500000000000000000000");
    assert_eq!(pos.reward_per_token_paid, "3000000000000000000");
    assert_eq!(
        pos.snapshot_block_height,
        Some(500),
        "snapshot_block_height must equal the event block_height"
    );
}

/// A second `StakerSnapshot` overwrites (not accumulates) the reward fields.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staker_snapshot_overwrites_on_update(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Create position.
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

    // First snapshot.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_5,
            "StakerSnapshot",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "staked_amount": "10000",
                "pending_rewards": "100",
                "reward_per_token_paid": "1000000000000000000"
            }),
        ),
    )
    .await
    .unwrap();

    // Second snapshot with different values at a higher block height.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event_at(
            STAKING_DEPLOY_6,
            "StakerSnapshot",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "staked_amount": "10000",
                "pending_rewards": "999",
                "reward_per_token_paid": "5000000000000000000"
            }),
            501,
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT pending_rewards, reward_per_token_paid
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        pos.pending_rewards, "999",
        "snapshot must overwrite, not accumulate"
    );
    assert_eq!(pos.reward_per_token_paid, "5000000000000000000");
}

const STAKING_DEPLOY_7: &str = "0000000000000000000000000000000000000000000000000000000000009007";

// Idempotency: UnstakedInitiated ----------------------------------------------

/// Replaying an `UnstakedInitiated` event with the same deploy hash must be
/// idempotent: `staked_amount`, `unbonding_amount`, and `unbonding_ends_at`
/// must have the same values after both replays as after the first.
#[sqlx::test(migrator = "MIGRATOR")]
async fn unstaked_initiated_idempotent(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Seed a staked position first.
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

    let unstake_event = staking_event(
        STAKING_DEPLOY_7,
        "UnstakedInitiated",
        json!({
            "staker": FakeAddress::Buyer.as_str(),
            "amount": "4000",
            "unbonding_ends_at": 1_700_172_800_000_u64
        }),
    );

    // Process the same event twice.
    for _ in 0..2 {
        processor::process_event(
            &pool,
            &EventRegistry::new(),
            &HashSet::new(),
            &unstake_event,
        )
        .await
        .unwrap();
    }

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

    assert_eq!(
        pos.staked_amount, "6000",
        "duplicate UnstakedInitiated must not double-decrement staked_amount"
    );
    assert_eq!(
        pos.unbonding_amount, "4000",
        "duplicate UnstakedInitiated must not double-increment unbonding_amount"
    );
    let expected_ts = chrono::DateTime::from_timestamp_millis(1_700_172_800_000);
    assert_eq!(pos.unbonding_ends_at, expected_ts);

    let event_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM staking_events WHERE transaction_hash = $1",
        STAKING_DEPLOY_7,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        event_count, 1,
        "duplicate UnstakedInitiated must not create second staking_events row"
    );
}

// Idempotency: StakerSnapshot -------------------------------------------------

/// Replaying a `StakerSnapshot` event with the same deploy hash and block
/// height must be idempotent: `pending_rewards` and `reward_per_token_paid`
/// must not change on the second replay.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staker_snapshot_idempotent(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Seed a staked position first.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_1,
            "Staked",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "5000"
            }),
        ),
    )
    .await
    .unwrap();

    let snapshot_event = staking_event(
        STAKING_DEPLOY_7,
        "StakerSnapshot",
        json!({
            "staker": FakeAddress::Buyer.as_str(),
            "staked_amount": "5000",
            "pending_rewards": "200",
            "reward_per_token_paid": "3000000000000000000"
        }),
    );

    // Process the same event twice.
    for _ in 0..2 {
        processor::process_event(
            &pool,
            &EventRegistry::new(),
            &HashSet::new(),
            &snapshot_event,
        )
        .await
        .unwrap();
    }

    let pos = sqlx::query!(
        r"
            SELECT pending_rewards, reward_per_token_paid
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        pos.pending_rewards, "200",
        "duplicate StakerSnapshot must not change pending_rewards"
    );
    assert_eq!(
        pos.reward_per_token_paid, "3000000000000000000",
        "duplicate StakerSnapshot must not change reward_per_token_paid"
    );
}

const STAKING_DEPLOY_8: &str = "0000000000000000000000000000000000000000000000000000000000009008";
const STAKING_DEPLOY_9: &str = "0000000000000000000000000000000000000000000000000000000000009009";

// Same-block StakerSnapshot ---------------------------------------------------

/// Two different `StakerSnapshot` deploys in the same block for the same staker
/// must both be applied. The second snapshot carries the final state and must
/// overwrite the first.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staker_snapshot_same_block_different_deploy(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Seed a staked position.
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

    // First snapshot at block 500.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event_at(
            STAKING_DEPLOY_8,
            "StakerSnapshot",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "staked_amount": "10000",
                "pending_rewards": "100",
                "reward_per_token_paid": "1000000000000000000"
            }),
            500,
        ),
    )
    .await
    .unwrap();

    // Second snapshot at the SAME block 500 but different deploy.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event_at(
            STAKING_DEPLOY_9,
            "StakerSnapshot",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "staked_amount": "10000",
                "pending_rewards": "999",
                "reward_per_token_paid": "5000000000000000000"
            }),
            500,
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT pending_rewards, reward_per_token_paid, snapshot_block_height
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        pos.pending_rewards, "999",
        "second same-block snapshot must overwrite the first"
    );
    assert_eq!(
        pos.reward_per_token_paid, "5000000000000000000",
        "second same-block snapshot must overwrite reward_per_token_paid"
    );
    assert_eq!(
        pos.snapshot_block_height,
        Some(500),
        "snapshot_block_height must remain 500 after same-block overwrite"
    );
}

// Regression: transform_idx NULL vs Some(0) must be distinct ------------------

const STAKING_DEPLOY_11: &str = "0000000000000000000000000000000000000000000000000000000000009011";
const STAKING_DEPLOY_12: &str = "0000000000000000000000000000000000000000000000000000000000009012";

/// Regression for `COALESCE(transform_idx, 0)` sentinel collision in the
/// `staking_reward_deposits` unique index. A streaming `RewardsDeposited`
/// (`transform_idx` = NULL) and a backfill `RewardsDeposited` with
/// `transform_idx = 0` are distinct events but both map to `0` under the
/// old sentinel, so the second insert is silently dropped.
#[sqlx::test(migrator = "MIGRATOR")]
async fn rewards_deposited_null_and_zero_transform_idx_do_not_collide(pool: PgPool) {
    common::disable_rls(&pool).await;

    // First: backfill event with transform_idx = Some(0) (first transform in the deploy).
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "staking_contract_hash".to_owned(),
            deploy_hash: STAKING_DEPLOY_11.to_owned(),
            block_height: 500,
            contract_type: ContractType::Staking,
            event_name: "RewardsDeposited".to_owned(),
            event_data: json!({
                "caller": FakeAddress::ContractX.as_str(),
                "amount": "50000",
                "reward_per_token_stored": "1000000000000000000"
            }),
            block_timestamp: Some(Utc::now()),
            transform_idx: Some(0),
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // Second: streaming event with transform_idx = None for the same deploy.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "staking_contract_hash".to_owned(),
            deploy_hash: STAKING_DEPLOY_11.to_owned(),
            block_height: 500,
            contract_type: ContractType::Staking,
            event_name: "RewardsDeposited".to_owned(),
            event_data: json!({
                "caller": FakeAddress::ContractX.as_str(),
                "amount": "75000",
                "reward_per_token_stored": "3000000000000000000"
            }),
            block_timestamp: Some(Utc::now()),
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM staking_reward_deposits WHERE transaction_hash = $1",
        STAKING_DEPLOY_11,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        count, 2,
        "transform_idx NULL and Some(0) must not collide: they represent \
         distinct events (streaming vs first-backfill-transform)"
    );
}

/// Regression for `COALESCE(transform_idx, 0)` sentinel collision in the
/// `staking_events` unique index. A streaming `Staked` event (`transform_idx`
/// = NULL) and a backfill `Staked` with `transform_idx = 0` for the same
/// deploy are distinct events but collide under the old sentinel.
#[sqlx::test(migrator = "MIGRATOR")]
async fn staking_event_null_and_zero_transform_idx_do_not_collide(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Backfill Staked event with transform_idx = Some(0).
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "staking_contract_hash".to_owned(),
            deploy_hash: STAKING_DEPLOY_12.to_owned(),
            block_height: 500,
            contract_type: ContractType::Staking,
            event_name: "Staked".to_owned(),
            event_data: json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "1000"
            }),
            block_timestamp: Some(Utc::now()),
            transform_idx: Some(0),
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // Streaming Staked event with transform_idx = None for the same deploy.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "staking_contract_hash".to_owned(),
            deploy_hash: STAKING_DEPLOY_12.to_owned(),
            block_height: 500,
            contract_type: ContractType::Staking,
            event_name: "Staked".to_owned(),
            event_data: json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "2000"
            }),
            block_timestamp: Some(Utc::now()),
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let event_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM staking_events WHERE transaction_hash = $1 AND event_type = 'stake'",
        STAKING_DEPLOY_12,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        event_count, 2,
        "staking_events with transform_idx NULL and Some(0) must not collide"
    );
}

// Regression: UnstakedInitiated over-balance clamp -----------------------------

const STAKING_DEPLOY_13: &str = "0000000000000000000000000000000000000000000000000000000000009013";
const STAKING_DEPLOY_14: &str = "0000000000000000000000000000000000000000000000000000000000009014";

/// Regression for the silent `GREATEST()` clamp in
/// `update_staking_position_unstake`. A contract-emitted unstake whose amount
/// exceeds the staker's balance must not inject tokens into the unbonding
/// queue that were never staked: the unbonding delta must be capped at the
/// previously-staked amount, preserving the invariant
/// `unbonding_amount <= (ever-staked - ever-withdrawn)`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn unstaked_initiated_over_balance_clamps_unbonding(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Seed: stake 1000 BIG.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_13,
            "Staked",
            json!({ "staker": FakeAddress::Buyer.as_str(), "amount": "1000" }),
        ),
    )
    .await
    .unwrap();

    // Over-unstake: 5000 > 1000 staked.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_14,
            "UnstakedInitiated",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "5000",
                "unbonding_ends_at": 1_700_172_800_000_u64
            }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT staked_amount, unbonding_amount
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        pos.staked_amount, "0",
        "over-unstake must clamp staked_amount to zero"
    );
    assert_eq!(
        pos.unbonding_amount, "1000",
        "unbonding_amount must be clamped to the previously-staked balance \
         (1000), not the requested unstake amount (5000) - tokens that were \
         never staked cannot enter the unbonding queue"
    );
}

// Out-of-order event resilience -----------------------------------------------

const STAKING_DEPLOY_15: &str = "0000000000000000000000000000000000000000000000000000000000009015";
const STAKING_DEPLOY_16: &str = "0000000000000000000000000000000000000000000000000000000000009016";
const STAKING_DEPLOY_17: &str = "0000000000000000000000000000000000000000000000000000000000009017";

/// Regression: `UnstakedInitiated` arriving before any `Staked` event for
/// the same staker must create a zero-staked position and preserve the
/// unbonding delta instead of silently dropping it.
#[sqlx::test(migrator = "MIGRATOR")]
async fn unstake_before_stake_preserves_unbonding(pool: PgPool) {
    common::disable_rls(&pool).await;

    // No prior Staked event - position does not exist yet.
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_15,
            "UnstakedInitiated",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "3000",
                "unbonding_ends_at": 1_700_172_800_000_u64
            }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT staked_amount, unbonding_amount
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .expect("position must be created even without a prior Staked event");

    assert_eq!(
        pos.staked_amount, "0",
        "no prior stake - staked_amount must be zero"
    );
    assert_eq!(
        pos.unbonding_amount, "3000",
        "unbonding delta must be preserved, not silently dropped"
    );
}

/// Regression: `UnbondedWithdrawn` arriving before any `Staked` event must
/// create a position with default values rather than silently no-op.
#[sqlx::test(migrator = "MIGRATOR")]
async fn withdraw_before_stake_creates_position(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_16,
            "UnbondedWithdrawn",
            json!({ "staker": FakeAddress::Buyer.as_str(), "amount": "1000" }),
        ),
    )
    .await
    .unwrap();

    let pos = sqlx::query!(
        r"
            SELECT staked_amount, unbonding_amount
            FROM staking_positions
            WHERE staker_address = $1
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_one(&pool)
    .await
    .expect("position must be created even without a prior Staked event");

    assert_eq!(pos.staked_amount, "0");
    assert_eq!(
        pos.unbonding_amount, "0",
        "withdraw clears unbonding - on a fresh position this is already zero"
    );
}

/// Regression: `RewardsClaimed` arriving before any `Staked` event must
/// create a position and preserve `total_rewards_claimed` instead of
/// silently dropping the reward amount.
#[sqlx::test(migrator = "MIGRATOR")]
async fn rewards_claimed_before_stake_preserves_rewards(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &staking_event(
            STAKING_DEPLOY_17,
            "RewardsClaimed",
            json!({
                "staker": FakeAddress::Buyer.as_str(),
                "amount": "7500"
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
    .expect("position must be created even without a prior Staked event");

    assert_eq!(pos.staked_amount, "0");
    assert_eq!(
        pos.total_rewards_claimed, "7500",
        "reward claim must be preserved, not silently dropped"
    );
}
