//! Integration tests for vesting event handlers.
//!
//! Covered handlers:
//!
//! - **`ScheduleCreated`** - writes `vesting_schedules` row with all fields;
//!   UPSERT updates existing rows on re-indexing.
//! - **`TokensClaimed`** - increases `claimed_amount` on an existing schedule.

#![cfg(feature = "integration")]

mod common;

use std::collections::HashSet;

use serde_json::json;
use sqlx::PgPool;

use common::{FakeAddress, MIGRATOR};
use indexer::{
    config::ContractType,
    events::EventRegistry,
    processor::{self, RawEvent},
};

/// Fake 64-char deploy hash for vesting tests.
const VESTING_DEPLOY_HASH: &str =
    "0000000000000000000000000000000000000000000000000000000000007777";

/// Second deploy hash for UPSERT tests.
const VESTING_DEPLOY_HASH_2: &str =
    "0000000000000000000000000000000000000000000000000000000000007778";

/// Third deploy hash for claimed-amount preservation test.
const VESTING_DEPLOY_HASH_3: &str =
    "0000000000000000000000000000000000000000000000000000000000007779";

// ScheduleCreated handler

/// `ScheduleCreated` must write exactly one row in `vesting_schedules` with
/// correct beneficiary, amounts, and timing fields.
#[sqlx::test(migrator = "MIGRATOR")]
async fn schedule_created_writes_vesting_schedule_row(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH.to_owned(),
            block_height: 300,

            contract_type: ContractType::Vesting,
            event_name: "ScheduleCreated".to_owned(),
            event_data: json!({
                "vesting_id": "42",
                "whitelisted_creator": FakeAddress::ContractX.as_str(),
                "beneficiary": FakeAddress::Buyer.as_str(),
                "total_amount": "5000000000000000000000",
                "start_timestamp": 1_700_000_000_u64,
                "cliff_duration": 15_552_000_000_u64,
                "vesting_duration": 31_104_000_000_u64
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let row = sqlx::query!(
        r"
            SELECT vesting_id, beneficiary, whitelisted_creator, total_amount, claimed_amount, start_timestamp, cliff_duration, vesting_duration, transaction_hash, block_height
            FROM   vesting_schedules
            WHERE  vesting_id = '42'
        ",
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(row.vesting_id, "42");
    assert_eq!(row.beneficiary, FakeAddress::Buyer.as_str());
    assert_eq!(row.whitelisted_creator, FakeAddress::ContractX.as_str());
    assert_eq!(row.total_amount, "5000000000000000000000");
    assert_eq!(row.claimed_amount, "0");
    assert_eq!(row.start_timestamp, 1_700_000_000);
    assert_eq!(row.cliff_duration, 15_552_000_000);
    assert_eq!(row.vesting_duration, 31_104_000_000);
    assert_eq!(row.transaction_hash, VESTING_DEPLOY_HASH);
    assert_eq!(row.block_height, 300);
}

/// Re-processing the same `ScheduleCreated` event must update the existing
/// row (UPSERT), not fail or duplicate.
#[sqlx::test(migrator = "MIGRATOR")]
async fn schedule_created_upsert_updates_existing_row(pool: PgPool) {
    common::disable_rls(&pool).await;

    // First event
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH.to_owned(),
            block_height: 100,

            contract_type: ContractType::Vesting,
            event_name: "ScheduleCreated".to_owned(),
            event_data: json!({
                "vesting_id": "0",
                "whitelisted_creator": FakeAddress::ContractX.as_str(),
                "beneficiary": FakeAddress::Buyer.as_str(),
                "total_amount": "1000",
                "start_timestamp": 100_u64,
                "cliff_duration": 50_u64,
                "vesting_duration": 100_u64
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // Second event with same vesting_id but updated total_amount
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH_2.to_owned(),
            block_height: 200,

            contract_type: ContractType::Vesting,
            event_name: "ScheduleCreated".to_owned(),
            event_data: json!({
                "vesting_id": "0",
                "whitelisted_creator": FakeAddress::ContractX.as_str(),
                "beneficiary": FakeAddress::Buyer.as_str(),
                "total_amount": "2000",
                "start_timestamp": 100_u64,
                "cliff_duration": 50_u64,
                "vesting_duration": 100_u64
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let count: i64 =
        sqlx::query_scalar!(r"SELECT COUNT(*) FROM vesting_schedules WHERE vesting_id = '0'")
            .fetch_one(&pool)
            .await
            .unwrap()
            .unwrap_or(0);

    assert_eq!(count, 1, "UPSERT must not create duplicate rows");

    let row = sqlx::query!(
        r"SELECT total_amount, block_height FROM vesting_schedules WHERE vesting_id = '0'"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        row.total_amount, "2000",
        "total_amount must be updated by UPSERT"
    );
    assert_eq!(
        row.block_height, 200,
        "block_height must be updated by UPSERT"
    );
}

/// Re-indexing `ScheduleCreated` must NOT reset `claimed_amount` that was
/// accumulated by `TokensClaimed` events between the two ingestions.
#[sqlx::test(migrator = "MIGRATOR")]
async fn schedule_created_upsert_preserves_claimed_amount(pool: PgPool) {
    common::disable_rls(&pool).await;

    // 1. Create schedule
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH.to_owned(),
            block_height: 100,
            contract_type: ContractType::Vesting,
            event_name: "ScheduleCreated".to_owned(),
            event_data: json!({
                "vesting_id": "0",
                "whitelisted_creator": FakeAddress::ContractX.as_str(),
                "beneficiary": FakeAddress::Buyer.as_str(),
                "total_amount": "10000",
                "start_timestamp": 100_u64,
                "cliff_duration": 50_u64,
                "vesting_duration": 100_u64
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // 2. Claim some tokens
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH_2.to_owned(),
            block_height: 150,
            contract_type: ContractType::Vesting,
            event_name: "TokensClaimed".to_owned(),
            event_data: json!({
                "vesting_id": "0",
                "beneficiary": FakeAddress::Buyer.as_str(),
                "amount": "3000"
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // 3. Re-index ScheduleCreated (simulates backfill / re-org)
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH_3.to_owned(),
            block_height: 200,
            contract_type: ContractType::Vesting,
            event_name: "ScheduleCreated".to_owned(),
            event_data: json!({
                "vesting_id": "0",
                "whitelisted_creator": FakeAddress::ContractX.as_str(),
                "beneficiary": FakeAddress::Buyer.as_str(),
                "total_amount": "10000",
                "start_timestamp": 100_u64,
                "cliff_duration": 50_u64,
                "vesting_duration": 100_u64
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let row = sqlx::query!(
        r"SELECT claimed_amount, total_amount FROM vesting_schedules WHERE vesting_id = '0'"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        row.claimed_amount, "3000",
        "UPSERT must preserve claimed_amount accumulated by TokensClaimed"
    );
    assert_eq!(
        row.total_amount, "10000",
        "total_amount must still be correct after UPSERT"
    );
}

// TokensClaimed handler

/// `TokensClaimed` must increase `claimed_amount` on the existing schedule.
#[sqlx::test(migrator = "MIGRATOR")]
async fn tokens_claimed_increases_claimed_amount(pool: PgPool) {
    common::disable_rls(&pool).await;

    // First, create a schedule
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH.to_owned(),
            block_height: 100,

            contract_type: ContractType::Vesting,
            event_name: "ScheduleCreated".to_owned(),
            event_data: json!({
                "vesting_id": "5",
                "whitelisted_creator": FakeAddress::ContractX.as_str(),
                "beneficiary": FakeAddress::Buyer.as_str(),
                "total_amount": "10000",
                "start_timestamp": 100_u64,
                "cliff_duration": 50_u64,
                "vesting_duration": 100_u64
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // Then claim some tokens
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: VESTING_DEPLOY_HASH_2.to_owned(),
            block_height: 200,

            contract_type: ContractType::Vesting,
            event_name: "TokensClaimed".to_owned(),
            event_data: json!({
                "vesting_id": "5",
                "beneficiary": FakeAddress::Buyer.as_str(),
                "amount": "3000"
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let claimed: Option<String> =
        sqlx::query_scalar!(r"SELECT claimed_amount FROM vesting_schedules WHERE vesting_id = '5'")
            .fetch_optional(&pool)
            .await
            .unwrap();

    assert_eq!(
        claimed.as_deref(),
        Some("3000"),
        "claimed_amount must equal the claimed amount"
    );
}

/// Multiple `TokensClaimed` events must accumulate in `claimed_amount`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn tokens_claimed_accumulates(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Seed schedule directly
    sqlx::query!(
        r"
            INSERT INTO vesting_schedules (vesting_id, beneficiary, whitelisted_creator, total_amount, start_timestamp, cliff_duration, vesting_duration, transaction_hash, block_height)
            VALUES ('10', $1, $2, '50000', 100, 50, 100, $3, 100)
        ",
        FakeAddress::Buyer.as_str(),
        FakeAddress::ContractX.as_str(),
        VESTING_DEPLOY_HASH,
    )
    .execute(&pool)
    .await
    .unwrap();

    let deploy_1 = "0000000000000000000000000000000000000000000000000000000000008801";
    let deploy_2 = "0000000000000000000000000000000000000000000000000000000000008802";

    // Claim 1000
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: deploy_1.to_owned(),
            block_height: 200,

            contract_type: ContractType::Vesting,
            event_name: "TokensClaimed".to_owned(),
            event_data: json!({
                "vesting_id": "10",
                "beneficiary": FakeAddress::Buyer.as_str(),
                "amount": "1000"
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    // Claim 2500 more
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "vesting_hash".to_owned(),
            deploy_hash: deploy_2.to_owned(),
            block_height: 300,

            contract_type: ContractType::Vesting,
            event_name: "TokensClaimed".to_owned(),
            event_data: json!({
                "vesting_id": "10",
                "beneficiary": FakeAddress::Buyer.as_str(),
                "amount": "2500"
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let claimed: Option<String> = sqlx::query_scalar!(
        r"SELECT claimed_amount FROM vesting_schedules WHERE vesting_id = '10'"
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        claimed.as_deref(),
        Some("3500"),
        "claimed_amount must accumulate: 1000 + 2500 = 3500"
    );
}

/// Replaying the same `TokensClaimed` deploy must NOT double-count `claimed_amount`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn tokens_claimed_idempotent(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Seed schedule directly.
    sqlx::query!(
        r"
            INSERT INTO vesting_schedules (vesting_id, beneficiary, whitelisted_creator, total_amount, start_timestamp, cliff_duration, vesting_duration, transaction_hash, block_height)
            VALUES ('20', $1, $2, '50000', 100, 50, 100, $3, 100)
        ",
        FakeAddress::Buyer.as_str(),
        FakeAddress::ContractX.as_str(),
        VESTING_DEPLOY_HASH,
    )
    .execute(&pool)
    .await
    .unwrap();

    let claim_deploy = "0000000000000000000000000000000000000000000000000000000000009901";

    let claim_event = RawEvent {
        contract_hash: "vesting_hash".to_owned(),
        deploy_hash: claim_deploy.to_owned(),
        block_height: 200,
        contract_type: ContractType::Vesting,
        event_name: "TokensClaimed".to_owned(),
        event_data: json!({
            "vesting_id": "20",
            "beneficiary": FakeAddress::Buyer.as_str(),
            "amount": "4000"
        }),
        block_timestamp: None,
        transform_idx: None,
        api_from_type: None,
        api_to_type: None,
    };

    // Process twice with the same deploy_hash.
    for _ in 0..2 {
        processor::process_event(&pool, &EventRegistry::new(), &HashSet::new(), &claim_event)
            .await
            .unwrap();
    }

    let claimed: String = sqlx::query_scalar!(
        r"SELECT claimed_amount FROM vesting_schedules WHERE vesting_id = '20'"
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(
        claimed, "4000",
        "duplicate TokensClaimed must not double claimed_amount"
    );
}
