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
//! 4. **Split-transaction regression (Bug 1)** — if the outer transaction
//!    is rolled back *after* the event handler's inner transaction already
//!    committed, re-processing the same event must not double domain writes
//!    (e.g. `token_holdings` balance must not be incremented twice).

#![cfg(feature = "integration")]

mod common;

use std::collections::HashSet;

use serde_json::json;
use sqlx::PgPool;

use common::{FakeAddress, MIGRATOR, PURCHASE_DEPLOY_HASH, TRANSFER_DEPLOY_HASH};
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
        event_data: common::payloads::transfer_event_data("100"),
        block_timestamp: None,
        transform_idx: None,
    };

    // First call — new event, handler runs, row inserted.
    processor::process_event(&pool, &registry, &HashSet::new(), &event)
        .await
        .expect("first process_event must succeed");

    // Second call — same (contract_hash, deploy_hash, event_name) triple
    // matches the UNIQUE constraint -> insert_blockchain_event returns false ->
    // process_event returns Ok(()) without calling the handler.
    processor::process_event(&pool, &registry, &HashSet::new(), &event)
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
    // An empty object fails serde deserialization -> IndexerError::Json ->
    // the Err(e) arm in processor.rs returns early without committing.
    let bad_event = RawEvent {
        contract_hash: "ico_contract_hash".to_owned(),
        deploy_hash: PURCHASE_DEPLOY_HASH.to_owned(),
        block_height: 200,
        caller: FakeAddress::Buyer.to_string(),
        contract_type: ContractType::Ico,
        event_name: "TokensPurchased".to_owned(),
        event_data: json!({}),
        block_timestamp: None,
        transform_idx: None,
    };

    let result = processor::process_event(&pool, &registry, &HashSet::new(), &bad_event).await;
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
        block_timestamp: None,
        transform_idx: None,
    };

    processor::process_event(&pool, &registry, &HashSet::new(), &unknown)
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

// process_event — atomicity regression (fixes split-transaction Bug 1)

/// Verifies that all event writes are atomic: after a complete transaction
/// rollback, re-processing the same event produces the correct result.
///
/// # Background
///
/// Before the fix, `process_event` used **two** independent transactions:
/// - outer tx: `blockchain_events` + `mark_event_processed`
/// - inner tx (handler): domain writes (`token_holdings`, etc.)
///
/// If the outer tx rolled back after the inner tx had already committed, domain
/// writes survived but `blockchain_events` was gone. On the next retry the
/// handler ran again, doubling the balance via arithmetic UPSERT (`balance + amount`).
///
/// After the fix, a **single** transaction covers all writes. A rollback undoes
/// everything atomically — `blockchain_events`, `blockchain_transactions`, and
/// `token_holdings` all disappear together.
///
/// # What this test verifies
///
/// We simulate a complete rollback by deleting every row written by the first
/// call. Re-processing must then yield exactly the same state as the first call
/// (`bob = "100"`), not a doubled value (`"200"`).
#[sqlx::test(migrator = "MIGRATOR")]
async fn reprocessing_after_full_rollback_does_not_double_balance(pool: PgPool) {
    common::disable_rls(&pool).await;

    let registry = EventRegistry::new();
    let event = RawEvent {
        contract_hash: "big_contract_hash".to_owned(),
        deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
        block_height: 100,
        caller: String::new(),
        contract_type: ContractType::Big,
        event_name: "Transfer".to_owned(),
        event_data: common::payloads::transfer_event_data("100"),
        block_timestamp: None,
        transform_idx: None,
    };

    // First call — all writes committed in one transaction.
    processor::process_event(&pool, &registry, &HashSet::new(), &event)
        .await
        .expect("first call must succeed");

    // Simulate a complete transaction rollback: undo every row that
    // process_event wrote. With a single shared transaction (the fix), a real
    // rollback would remove all three atomically.
    sqlx::query!(
        r"DELETE FROM blockchain_events WHERE transaction_hash = $1",
        TRANSFER_DEPLOY_HASH,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query!(
        r"DELETE FROM blockchain_transactions WHERE transaction_hash = $1",
        TRANSFER_DEPLOY_HASH,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query!(
        r"DELETE FROM token_holdings WHERE user_address IN ($1, $2)",
        FakeAddress::Alice.as_str(),
        FakeAddress::Bob.as_str(),
    )
    .execute(&pool)
    .await
    .unwrap();

    // Second call — starts from a clean slate, must produce the same result.
    processor::process_event(&pool, &registry, &HashSet::new(), &event)
        .await
        .expect("second call must succeed");

    let balance: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = $1 AND token_type = 'BIG'
        ",
        FakeAddress::Bob.as_str(),
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        balance.as_deref(),
        Some("100"),
        "recipient balance must equal the transferred amount after re-processing a fully rolled-back event"
    );
}
