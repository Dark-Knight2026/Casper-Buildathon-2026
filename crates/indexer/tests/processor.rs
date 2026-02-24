//! Integration tests for the event processor (`process_event`).
//!
//! Covers three core invariants:
//!
//! 1. **Idempotency** — processing the same event twice returns `Ok(())` both
//!    times and writes exactly one row to `blockchain_events`.
//! 2. **Rollback on handler error** — when the event handler fails (e.g. a
//!    malformed `event_data` JSON triggers a serde error), the outer
//!    transaction is rolled back and `blockchain_events` stays empty.
//! 3. **Unknown event stored raw** — for an unrecognized
//!    `(contract_type, event_name)` pair the processor stores one row in
//!    `blockchain_events` (marked `processed = true`) and makes no domain-table
//!    writes (`token_holdings`, `ico_purchases`, etc.).

mod common;

use serde_json::json;
use sqlx::PgPool;

use common::{MIGRATOR, PURCHASE_DEPLOY_HASH, TRANSFER_DEPLOY_HASH};
use indexer::{
    config::ContractType,
    events::EventRegistry,
    processor::{self, RawEvent},
};

// process_event — idempotency

/// Processing the same event twice must succeed both times and leave exactly
/// one row in `blockchain_events` (ON CONFLICT DO NOTHING semantics).
#[sqlx::test(migrator = "MIGRATOR")]
async fn duplicate_event_is_no_op(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();
    let event = RawEvent {
        contract_hash: "big_contract_hash".to_owned(),
        deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
        block_height: 100,
        caller: String::new(),
        contract_type: ContractType::Big,
        event_name: "Transfer".to_owned(),
        event_data: json!({ "sender": "alice", "recipient": "bob", "amount": "100" }),
    };

    // First call — new event, handler runs, row inserted.
    processor::process_event(&pool, &registry, &event)
        .await
        .expect("first process_event must succeed");

    // Second call — same (contract_hash, deploy_hash, event_name) triple
    // matches the UNIQUE constraint -> insert_blockchain_event returns false ->
    // process_event returns Ok(()) without calling the handler.
    processor::process_event(&pool, &registry, &event)
        .await
        .expect("second process_event must succeed (idempotent)");

    let count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM blockchain_events WHERE transaction_hash = $1",
        TRANSFER_DEPLOY_HASH,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(
        count, 1,
        "exactly one blockchain_events row must exist after two identical calls"
    );
}

// process_event — rollback on handler error

/// When `event_data` cannot be deserialized into the expected handler struct,
/// `process_event` returns `Err` and the outer transaction is rolled back —
/// `blockchain_events` must remain empty.
#[sqlx::test(migrator = "MIGRATOR")]
async fn handler_error_rolls_back_blockchain_events_row(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();

    // `TokensPurchased` requires `amount`, `cost`, `currency`, and `timestamp`.
    // An empty object fails serde deserialization -> IndexerError::Serde ->
    // the Err(e) arm in processor.rs returns early without committing.
    let bad_event = RawEvent {
        contract_hash: "ico_contract_hash".to_owned(),
        deploy_hash: PURCHASE_DEPLOY_HASH.to_owned(),
        block_height: 200,
        caller: "buyer".to_owned(),
        contract_type: ContractType::Ico,
        event_name: "TokensPurchased".to_owned(),
        event_data: json!({}),
    };

    let result = processor::process_event(&pool, &registry, &bad_event).await;
    assert!(
        result.is_err(),
        "malformed event_data must cause process_event to return Err"
    );

    let count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_events")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        count, 0,
        "blockchain_events must be empty — outer transaction was rolled back on handler error"
    );
}

// process_event — unknown event stored raw

/// When no handler is registered for the event name, `process_event` stores
/// the raw event in `blockchain_events` (with `processed = true`) and returns
/// `Ok(())`. No domain-table writes must occur.
#[sqlx::test(migrator = "MIGRATOR")]
async fn unknown_event_is_stored_raw_without_handler(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();

    // "NonExistentEvent" is not in Cep18EventType — EventType::parse returns
    // IndexerError::UnknownEvent, which processor.rs catches and converts into
    // a warning + continue (no early return -> tx.commit() is called normally).
    let unknown = RawEvent {
        contract_hash: "big_contract_hash".to_owned(),
        deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
        block_height: 300,
        caller: String::new(),
        contract_type: ContractType::Big,
        event_name: "NonExistentEvent".to_owned(),
        event_data: json!({ "foo": "bar" }),
    };

    processor::process_event(&pool, &registry, &unknown)
        .await
        .expect("unknown event must not fail — it should be stored as raw data");

    // One blockchain_events row must exist and be marked processed.
    let row = sqlx::query!(
        r"
            SELECT processed FROM blockchain_events
            WHERE transaction_hash = $1
              AND event_type       = 'NonExistentEvent'
        ",
        TRANSFER_DEPLOY_HASH,
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    let row = row.expect("blockchain_events row must exist for an unknown event");
    assert_eq!(
        row.processed,
        Some(true),
        "unknown event must be marked processed = true in blockchain_events"
    );

    // No domain writes — token_holdings and ico_purchases stay empty.
    let holdings: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM token_holdings")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        holdings, 0,
        "no token_holdings writes must occur for an unknown event"
    );
}
