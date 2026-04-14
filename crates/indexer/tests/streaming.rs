//! Integration tests for WebSocket message deserialization and contract helpers.

mod common;

use std::collections::{HashMap, HashSet};

use sqlx::PgPool;

use common::{MIGRATOR, TRANSFER_DEPLOY_HASH, payloads};
use indexer::{
    config::{ContractEntry, ContractRegistry, ContractType},
    events::EventRegistry,
    streaming::{self, WssMessage},
};

#[test]
fn deserializes_wss_message() {
    let raw = payloads::wss_message(
        "abc123",
        "TokensPurchased",
        serde_json::json!({
            "amount": "1000000000",
            "currency": 0,
            "price": "500000",
            "cost": "500000000",
            "timestamp": 1_234_567_890
        }),
        "aabbcc",
        42,
        1_234_567,
    );

    let msg: WssMessage = serde_json::from_value(raw).unwrap();

    assert_eq!(msg.data.contract_package_hash, "abc123");
    assert_eq!(msg.data.name, "TokensPurchased");
    assert_eq!(msg.data.data["amount"], "1000000000");
    assert_eq!(msg.extra.deploy_hash, "aabbcc");
    assert_eq!(msg.extra.event_id, 42);
    assert_eq!(msg.extra.block_height, 1_234_567);
    assert_eq!(msg.extra.transform_id, Some(0));
    assert_eq!(msg.timestamp.as_deref(), Some("2025-01-01T12:00:00.000Z"));
}

#[test]
fn deserializes_ignores_unknown_fields() {
    // "action", "future_field", "extra_unknown" must not cause failure.
    // "timestamp" and "transform_id" are now deserialized (no longer ignored).
    let minimal = r#"{
        "data": { "contract_package_hash": "x", "name": "Foo", "data": {}, "extra_unknown": true },
        "action": "emitted",
        "extra": { "deploy_hash": "y", "event_id": 1, "transform_id": 0, "block_height": 1 },
        "timestamp": "2025-01-01T00:00:00Z",
        "future_field": "ignored"
    }"#;
    let msg: WssMessage = serde_json::from_str(minimal).unwrap();
    assert_eq!(msg.data.name, "Foo");
    assert_eq!(msg.extra.transform_id, Some(0));
    assert_eq!(msg.timestamp.as_deref(), Some("2025-01-01T00:00:00Z"));
}

#[test]
fn build_contract_map_maps_hashes_to_types() {
    let registry = ContractRegistry {
        ico: Some(ContractEntry::new("ico_hash", 0)),
        big: Some(ContractEntry::new("big_hash", 0)),
        ..ContractRegistry::default()
    };

    let map = streaming::build_contract_map(&registry);

    assert_eq!(map.get("ico_hash"), Some(&ContractType::Ico));
    assert_eq!(map.get("big_hash"), Some(&ContractType::Big));
    assert_eq!(map.len(), 2);
}

#[test]
fn build_contract_map_empty_when_no_contracts() {
    let map = streaming::build_contract_map(&ContractRegistry::default());
    assert!(map.is_empty());
}

#[test]
fn build_hashes_csv_joins_with_comma() {
    let registry = ContractRegistry {
        ico: Some(ContractEntry::new("aaa", 0)),
        big: Some(ContractEntry::new("bbb", 0)),
        ..ContractRegistry::default()
    };

    let csv = streaming::build_hashes_csv(&registry);

    // Order follows active_contracts() iteration order (Usdc, Usdt, Big, ..., Ico).
    assert!(csv.contains("aaa"));
    assert!(csv.contains("bbb"));
    assert!(csv.contains(','));
    assert!(!csv.starts_with(','));
    assert!(!csv.ends_with(','));
}

#[test]
fn build_hashes_csv_empty_when_no_contracts() {
    let csv = streaming::build_hashes_csv(&ContractRegistry::default());
    assert!(csv.is_empty());
}

/// Edge case: a single contract must produce a hash string with no commas.
#[test]
fn build_hashes_csv_single_contract_has_no_comma() {
    let registry = ContractRegistry {
        ico: Some(ContractEntry::new("only_hash", 0)),
        ..ContractRegistry::default()
    };

    let csv = streaming::build_hashes_csv(&registry);

    assert_eq!(csv, "only_hash");
    assert!(!csv.contains(','));
}

/// Non-JSON text frame (e.g. CSPR.cloud keepalive) must return `Ok(())`
/// silently and write nothing to `blockchain_events`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn non_json_frame_is_silently_skipped(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();
    let contract_map = HashMap::new();

    streaming::handle_text_message(
        "not-json-keepalive",
        &contract_map,
        &HashSet::new(),
        &pool,
        &registry,
    )
    .await
    .expect("non-JSON frame must return Ok(())");

    let count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_events")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        count, 0,
        "non-JSON frame must not write to blockchain_events"
    );
}

/// Valid JSON message whose `contract_package_hash` is not in the contract map
/// must return `Ok(())` and write nothing to `blockchain_events`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn message_for_unknown_contract_is_skipped(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();
    // Empty map — "abc123" is not registered.
    let contract_map = HashMap::new();
    let msg = payloads::wss_message(
        "abc123",
        "TokensPurchased",
        serde_json::json!({}),
        "aabbcc",
        42,
        1_234_567,
    );

    streaming::handle_text_message(
        &msg.to_string(),
        &contract_map,
        &HashSet::new(),
        &pool,
        &registry,
    )
    .await
    .expect("message for unknown contract must return Ok(())");

    let count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_events")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        count, 0,
        "unknown contract message must not write to blockchain_events"
    );
}

/// Regression: a WSS frame whose `transform_id` exceeds `i32::MAX` must
/// surface an explicit error from `handle_text_message` rather than silently
/// truncating the field to `None`. The prior behavior masked overflow events
/// by routing them to the same `COALESCE(transform_idx, -1)` sentinel slot as
/// backfill rows, making corruption invisible at ingest time.
#[sqlx::test(migrator = "MIGRATOR")]
async fn transform_id_overflow_returns_error(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();
    let mut contract_map = HashMap::new();
    contract_map.insert("big_contract_hash".to_owned(), ContractType::Big);

    // i32::MAX = 2_147_483_647; pick a value one above that threshold.
    let overflow_id = i64::from(i32::MAX) + 1;
    let msg = payloads::wss_message_with_transform_id(
        "big_contract_hash",
        "Transfer",
        payloads::transfer_event_data("100"),
        TRANSFER_DEPLOY_HASH,
        99,
        500,
        overflow_id,
    );

    let result = streaming::handle_text_message(
        &msg.to_string(),
        &contract_map,
        &HashSet::new(),
        &pool,
        &registry,
    )
    .await;

    assert!(
        result.is_err(),
        "transform_id > i32::MAX must return an explicit error, got Ok"
    );

    // The event must not land in the DB when the pipeline rejects the frame.
    let count = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_events")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        count, 0,
        "overflowed transform_id must not write to blockchain_events"
    );

    // The streaming cursor must NOT advance for a rejected frame - otherwise
    // a single poisoned message could permanently skip over a range of events.
    let cursor = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'streaming' AND contract_hash = ''
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert!(
        cursor.is_none(),
        "streaming cursor must not advance past a rejected frame, got: {cursor:?}"
    );
}

/// Valid Transfer message for a known contract must call `process_event`,
/// write one row to `blockchain_events`, and update the streaming cursor to
/// `event_id`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn valid_message_processes_event_and_updates_cursor(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();
    let mut contract_map = HashMap::new();
    contract_map.insert("big_contract_hash".to_owned(), ContractType::Big);

    let msg = payloads::wss_message(
        "big_contract_hash",
        "Transfer",
        payloads::transfer_event_data("100"),
        TRANSFER_DEPLOY_HASH,
        99,
        500,
    );

    streaming::handle_text_message(
        &msg.to_string(),
        &contract_map,
        &HashSet::new(),
        &pool,
        &registry,
    )
    .await
    .expect("valid Transfer message must succeed");

    let count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_events")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        count, 1,
        "valid message must write one row to blockchain_events"
    );

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'streaming' AND contract_hash = ''
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        cursor,
        Some(99),
        "streaming cursor must be updated to event_id after processing"
    );
}
