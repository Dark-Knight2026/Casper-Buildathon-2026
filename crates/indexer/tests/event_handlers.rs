//! Integration tests for event handlers.
//!
//! Tests the business logic of individual event handlers by processing events
//! through `processor::process_event` and asserting on the resulting DB state.
//!
//! Covered handlers:
//!
//! - **`Transfer`** - writes `blockchain_transactions` (`token_transfer`) and
//!   updates two `token_holdings` rows (Decrease sender, Increase recipient).
//!   Tested for all three CEP-18 token types (BIG, USDC, USDT).
//! - **`SetAllowance`** - writes `blockchain_transactions` (`token_allowance`)
//!   only; `token_holdings` must remain unchanged.
//! - **`TokensPurchased`** - unknown `currency` discriminant (> 2) must be
//!   stored as `"UNKNOWN"` in `ico_purchases` and `blockchain_transactions`.
//! - **`IcoScheduleAdded`** - writes `ico_schedules` row with schedule ID,
//!   price, and sale amount; UPSERT updates existing rows.

mod common;

use std::collections::HashSet;

use serde_json::json;
use sqlx::PgPool;

use common::{FakeAddress, MIGRATOR, PURCHASE_DEPLOY_HASH, TRANSFER_DEPLOY_HASH, payloads};
use indexer::{
    config::ContractType,
    events::EventRegistry,
    processor::{self, RawEvent},
};

// Transfer handler — blockchain_transactions

/// Transfer must write exactly one row in `blockchain_transactions` with
/// `transaction_type = 'token_transfer'`, `from_address` equal to the sender,
/// and the correct amount.
#[sqlx::test(migrator = "MIGRATOR")]
async fn transfer_writes_blockchain_transaction_row(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "Transfer".to_owned(),
            event_data: payloads::transfer_event_data("500"),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let row = sqlx::query!(
        r"
            SELECT transaction_type, from_address, amount
            FROM   blockchain_transactions
            WHERE  transaction_hash = $1
        ",
        TRANSFER_DEPLOY_HASH,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(row.transaction_type, "token_transfer");
    assert_eq!(row.from_address, FakeAddress::Alice.as_str());
    assert_eq!(row.amount.as_deref(), Some("500"));
}

// Transfer handler — token_holdings

/// Recipient receives the transferred amount; a sender who had no prior
/// balance is created with `balance = '0'` (clamped — never goes negative).
#[sqlx::test(migrator = "MIGRATOR")]
async fn transfer_increases_recipient_and_clamps_unknown_sender(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "Transfer".to_owned(),
            event_data: payloads::transfer_event_data("300"),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let bob: Option<String> = sqlx::query_scalar!(
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
        bob.as_deref(),
        Some("300"),
        "recipient balance must equal transferred amount"
    );

    let alice: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = $1 AND token_type = 'BIG'
        ",
        FakeAddress::Alice.as_str(),
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(
        alice.as_deref(),
        Some("0"),
        "sender with no prior balance must be clamped to '0', not negative"
    );
}

/// Sender with an existing balance has it correctly decreased.
#[sqlx::test(migrator = "MIGRATOR")]
async fn transfer_decreases_existing_sender_balance(pool: PgPool) {
    common::disable_rls(&pool).await;

    // Seed alice with 1 000 BIG tokens before the transfer.
    sqlx::query!(
        r"
            INSERT INTO token_holdings (user_address, token_type, balance, last_updated_at)
            VALUES ($1, 'BIG', '1000', NOW())
        ",
        FakeAddress::Alice.as_str(),
    )
    .execute(&pool)
    .await
    .unwrap();

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "Transfer".to_owned(),
            event_data: payloads::transfer_event_data("400"),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let alice: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = $1 AND token_type = 'BIG'
        ",
        FakeAddress::Alice.as_str(),
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(
        alice.as_deref(),
        Some("600"),
        "sender balance must decrease by the transferred amount"
    );
}

// SetAllowance handler — blockchain_transactions

/// `SetAllowance` must write exactly one row in `blockchain_transactions` with
/// `transaction_type = 'token_allowance'`, `from_address` equal to the owner,
/// and the approved amount.
#[sqlx::test(migrator = "MIGRATOR")]
async fn set_allowance_writes_blockchain_transaction_row(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 200,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "SetAllowance".to_owned(),
            event_data: json!({
                "owner": FakeAddress::Alice.as_str(),
                "spender": FakeAddress::ContractX.as_str(),
                "amount": "1000"
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let row = sqlx::query!(
        r"
            SELECT transaction_type, from_address, amount
            FROM   blockchain_transactions
            WHERE  transaction_hash = $1
        ",
        TRANSFER_DEPLOY_HASH,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(row.transaction_type, "token_allowance");
    assert_eq!(row.from_address, FakeAddress::Alice.as_str());
    assert_eq!(row.amount.as_deref(), Some("1000"));
}

// TokensPurchased handler — ico_purchases + blockchain_transactions

/// `TokensPurchased` must write one row to `ico_purchases` with correct buyer,
/// amount, and currency label, and one row to `blockchain_transactions` with
/// `transaction_type = 'token_purchase'`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn tokens_purchased_writes_ico_purchase_and_blockchain_transaction(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "ico_hash".to_owned(),
            deploy_hash: PURCHASE_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: FakeAddress::Buyer.to_string(),
            contract_type: ContractType::Ico,
            event_name: "TokensPurchased".to_owned(),
            event_data: json!({
                "amount": "1000000000",
                "currency": 0,
                "cost": "500000000",
                "timestamp": 1_700_000_000_u64
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let purchase = sqlx::query!(
        r"
            SELECT buyer_address, amount, currency
            FROM   ico_purchases
            WHERE  transaction_hash = $1
        ",
        PURCHASE_DEPLOY_HASH,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(purchase.buyer_address, FakeAddress::Buyer.as_str());
    assert_eq!(purchase.amount, "1000000000");
    assert_eq!(purchase.currency, "CSPR");

    let tx_row = sqlx::query!(
        r"
            SELECT transaction_type, from_address, amount, currency
            FROM   blockchain_transactions
            WHERE  transaction_hash = $1
        ",
        PURCHASE_DEPLOY_HASH,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(tx_row.transaction_type, "token_purchase");
    assert_eq!(tx_row.from_address, FakeAddress::Buyer.as_str());
    assert_eq!(tx_row.amount.as_deref(), Some("500000000"));
    assert_eq!(tx_row.currency.as_deref(), Some("CSPR"));
}

/// `TokensPurchased` must increase the buyer's BIG balance by the purchased amount.
#[sqlx::test(migrator = "MIGRATOR")]
async fn tokens_purchased_increases_buyer_big_balance(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "ico_hash".to_owned(),
            deploy_hash: PURCHASE_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: FakeAddress::Buyer.to_string(),
            contract_type: ContractType::Ico,
            event_name: "TokensPurchased".to_owned(),
            event_data: json!({
                "amount": "750",
                "currency": 1,
                "cost": "100",
                "timestamp": 1_700_000_000_u64
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let balance: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = $1 AND token_type = 'BIG'
        ",
        FakeAddress::Buyer.as_str(),
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        balance.as_deref(),
        Some("750"),
        "buyer's BIG balance must equal the purchased amount"
    );
}

// Transfer handler — non-BIG token types (USDC, USDT)

/// Transfer for `ContractType::Usdc` must write `token_holdings` rows with
/// `token_type = 'USDC'`, not `'BIG'`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn transfer_usdc_updates_usdc_token_holdings(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "usdc_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Usdc,
            event_name: "Transfer".to_owned(),
            event_data: payloads::transfer_event_data("250"),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let bob: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = $1 AND token_type = 'USDC'
        ",
        FakeAddress::Bob.as_str(),
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        bob.as_deref(),
        Some("250"),
        "recipient USDC balance must equal transferred amount"
    );

    // BIG table must be untouched.
    let big_count: i64 =
        sqlx::query_scalar!(r"SELECT COUNT(*) FROM token_holdings WHERE token_type = 'BIG'")
            .fetch_one(&pool)
            .await
            .unwrap()
            .unwrap_or(0);
    assert_eq!(
        big_count, 0,
        "Transfer on USDC contract must not touch BIG token_holdings"
    );
}

/// Transfer for `ContractType::Usdt` must write `token_holdings` rows with
/// `token_type = 'USDT'`, not `'BIG'`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn transfer_usdt_updates_usdt_token_holdings(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "usdt_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Usdt,
            event_name: "Transfer".to_owned(),
            event_data: payloads::transfer_event_data("350"),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let bob: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = $1 AND token_type = 'USDT'
        ",
        FakeAddress::Bob.as_str(),
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        bob.as_deref(),
        Some("350"),
        "recipient USDT balance must equal transferred amount"
    );

    // BIG table must be untouched.
    let big_count: i64 =
        sqlx::query_scalar!(r"SELECT COUNT(*) FROM token_holdings WHERE token_type = 'BIG'")
            .fetch_one(&pool)
            .await
            .unwrap()
            .unwrap_or(0);
    assert_eq!(
        big_count, 0,
        "Transfer on USDT contract must not touch BIG token_holdings"
    );
}

// TokensPurchased handler — unknown currency discriminant

/// `TokensPurchased` with a `currency` discriminant > 2 must store `"UNKNOWN"`
/// in both `ico_purchases.currency` and `blockchain_transactions.currency`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn tokens_purchased_unknown_currency_stored_as_unknown_label(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "ico_hash".to_owned(),
            deploy_hash: PURCHASE_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: FakeAddress::Buyer.to_string(),
            contract_type: ContractType::Ico,
            event_name: "TokensPurchased".to_owned(),
            event_data: json!({
                "amount": "500",
                "currency": 99u8,
                "cost": "200",
                "timestamp": 1_700_000_000_u64
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let purchase_currency: Option<String> = sqlx::query_scalar!(
        r"SELECT currency FROM ico_purchases WHERE transaction_hash = $1",
        PURCHASE_DEPLOY_HASH,
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        purchase_currency.as_deref(),
        Some("UNKNOWN"),
        "unknown currency discriminant must be stored as 'UNKNOWN' in ico_purchases"
    );

    let tx_currency: Option<Option<String>> = sqlx::query_scalar!(
        r"SELECT currency FROM blockchain_transactions WHERE transaction_hash = $1",
        PURCHASE_DEPLOY_HASH,
    )
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert_eq!(
        tx_currency.flatten().as_deref(),
        Some("UNKNOWN"),
        "unknown currency discriminant must be stored as 'UNKNOWN' in blockchain_transactions"
    );
}

// SetAllowance handler — token_holdings isolation

/// `SetAllowance` must not create or modify any `token_holdings` rows — it
/// records an approval, not a balance movement.
#[sqlx::test(migrator = "MIGRATOR")]
async fn set_allowance_does_not_modify_token_holdings(pool: PgPool) {
    common::disable_rls(&pool).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 200,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "SetAllowance".to_owned(),
            event_data: json!({
                "owner": FakeAddress::Alice.as_str(),
                "spender": FakeAddress::ContractX.as_str(),
                "amount": "1000"
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let holdings: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM token_holdings")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);

    assert_eq!(
        holdings, 0,
        "SetAllowance must not write any token_holdings rows"
    );
}

/// `IcoScheduleAdded` must write exactly one row to `ico_schedules` with the
/// correct schedule ID, price, and sale amount.
#[sqlx::test(migrator = "MIGRATOR")]
async fn ico_schedule_added_writes_schedule_row(pool: PgPool) {
    common::disable_rls(&pool).await;

    let deploy_hash = "0000000000000000000000000000000000000000000000000000000000009999";

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "ico_hash".to_owned(),
            deploy_hash: deploy_hash.to_owned(),
            block_height: 500,
            caller: String::new(),
            contract_type: ContractType::Ico,
            event_name: "IcoScheduleAdded".to_owned(),
            event_data: json!({
                "id": "schedule-1",
                "start_timestamp": 1_700_000_000_u64,
                "end_timestamp": 1_710_000_000_u64,
                "sale_amount": "500000000000000000000000000",
                "price": "500000"
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let row = sqlx::query!(
        r"
            SELECT schedule_id, start_timestamp, end_timestamp, sale_amount, price, transaction_hash, block_height
            FROM   ico_schedules
            WHERE  schedule_id = 'schedule-1'
        ",
    )
      .fetch_one(&pool)
      .await
      .unwrap();

    assert_eq!(row.schedule_id, "schedule-1");
    assert_eq!(row.start_timestamp, 1_700_000_000);
    assert_eq!(row.end_timestamp, 1_710_000_000);
    assert_eq!(row.sale_amount, "500000000000000000000000000");
    assert_eq!(row.price, "500000");
    assert_eq!(row.transaction_hash, deploy_hash);
    assert_eq!(row.block_height, 500);
}

/// Re-processing the same `IcoScheduleAdded` event must update the existing
/// row (UPSERT), not fail or duplicate.
#[sqlx::test(migrator = "MIGRATOR")]
async fn ico_schedule_added_upsert_updates_existing_row(pool: PgPool) {
    common::disable_rls(&pool).await;

    let deploy_hash_1 = "0000000000000000000000000000000000000000000000000000000000009901";
    let deploy_hash_2 = "0000000000000000000000000000000000000000000000000000000000009902";

    // First event
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "ico_hash".to_owned(),
            deploy_hash: deploy_hash_1.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Ico,
            event_name: "IcoScheduleAdded".to_owned(),
            event_data: json!({
                "id": "schedule-upsert",
                "start_timestamp": 1_000_000_u64,
                "end_timestamp": 2_000_000_u64,
                "sale_amount": "100",
                "price": "100000"
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    // Second event with same schedule ID but updated price
    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "ico_hash".to_owned(),
            deploy_hash: deploy_hash_2.to_owned(),
            block_height: 200,
            caller: String::new(),
            contract_type: ContractType::Ico,
            event_name: "IcoScheduleAdded".to_owned(),
            event_data: json!({
                "id": "schedule-upsert",
                "start_timestamp": 1_000_000_u64,
                "end_timestamp": 2_000_000_u64,
                "sale_amount": "200",
                "price": "750000"
            }),
            block_timestamp: None,
            transform_idx: None,
        },
    )
    .await
    .unwrap();

    let count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM ico_schedules
            WHERE schedule_id = 'schedule-upsert'
        "
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);

    assert_eq!(count, 1, "UPSERT must not create duplicate rows");

    let row = sqlx::query!(
        r"
            SELECT price, sale_amount, block_height FROM ico_schedules
            WHERE schedule_id = 'schedule-upsert'
        "
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(row.price, "750000", "price must be updated by UPSERT");
    assert_eq!(
        row.sale_amount, "200",
        "sale_amount must be updated by UPSERT"
    );
    assert_eq!(
        row.block_height, 200,
        "block_height must be updated by UPSERT"
    );
}
