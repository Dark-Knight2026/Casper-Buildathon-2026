//! Integration tests for CEP-18 event handlers.
//!
//! Tests the business logic of individual event handlers by processing events
//! through `processor::process_event` and asserting on the resulting DB state.
//!
//! Covered handlers:
//!
//! - **`Transfer`** — writes `blockchain_transactions` (`token_transfer`) and
//!   updates two `token_holdings` rows (Decrease sender, Increase recipient).
//! - **`SetAllowance`** — writes `blockchain_transactions` (`token_allowance`)
//!   only; `token_holdings` must remain unchanged.

mod common;

use serde_json::json;
use sqlx::PgPool;

use common::{MIGRATOR, TRANSFER_DEPLOY_HASH};
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
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "Transfer".to_owned(),
            event_data: json!({ "sender": "alice", "recipient": "bob", "amount": "500" }),
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
    assert_eq!(row.from_address, "alice");
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
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "Transfer".to_owned(),
            event_data: json!({ "sender": "alice", "recipient": "bob", "amount": "300" }),
        },
    )
    .await
    .unwrap();

    let bob: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = 'bob' AND token_type = 'BIG'
        "
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
            WHERE user_address = 'alice' AND token_type = 'BIG'
        "
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
            VALUES ('alice', 'BIG', '1000', NOW())
        "
    )
    .execute(&pool)
    .await
    .unwrap();

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 100,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "Transfer".to_owned(),
            event_data: json!({ "sender": "alice", "recipient": "bob", "amount": "400" }),
        },
    )
    .await
    .unwrap();

    let alice: Option<String> = sqlx::query_scalar!(
        r"
            SELECT balance FROM token_holdings
            WHERE user_address = 'alice' AND token_type = 'BIG'
        "
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
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 200,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "SetAllowance".to_owned(),
            event_data: json!({ "owner": "alice", "spender": "contract_x", "amount": "1000" }),
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
    assert_eq!(row.from_address, "alice");
    assert_eq!(row.amount.as_deref(), Some("1000"));
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
        &RawEvent {
            contract_hash: "big_hash".to_owned(),
            deploy_hash: TRANSFER_DEPLOY_HASH.to_owned(),
            block_height: 200,
            caller: String::new(),
            contract_type: ContractType::Big,
            event_name: "SetAllowance".to_owned(),
            event_data: json!({ "owner": "alice", "spender": "contract_x", "amount": "1000" }),
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
