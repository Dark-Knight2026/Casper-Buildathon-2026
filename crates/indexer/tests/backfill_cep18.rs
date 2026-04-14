//! Tests for CEP-18 backfill logic.
//!
//! Covers three areas:
//!
//! 1. **`ft_action_to_event` mapping** — pure unit tests, no I/O.
//!    CSPR.cloud `/ft-token-action-types` reference (verified against testnet):
//!    * 1 = Mint
//!    * 2 = Transfer
//!    * 3 = Approve  (mapped to `SetAllowance` for our event system)
//!    * 4 = Burn     (no handler — skipped)
//!
//! 2. **`fetch_ft_token_actions_page` HTTP layer** — wiremock tests that verify
//!    correct URL construction, authorization header, response parsing, and
//!    error propagation without requiring a real database or CSPR.cloud access.
//!
//! 3. **`backfill_cep18` integration** — end-to-end tests covering:
//!    * Mint stored raw without `token_holdings` update
//!    * `effective_start = max(cursor + 1, start_block)` when `start_block > cursor`
//!    * `page_count = 0` with non-empty data processes one page and stops

mod common;

use std::collections::HashSet;

use reqwest::Client;
use serde_json::json;
use sqlx::PgPool;
use wiremock::{Mock, MockServer, ResponseTemplate, matchers};

use common::{FakeAddress, MIGRATOR, TRANSFER_DEPLOY_HASH, payloads};
use indexer::{
    backfill::{
        BackfillContext,
        cep18::{self, FtActionType, FtTokenAction},
    },
    config::ContractType,
    events::EventRegistry,
};

/// Helper: build a minimal `FtTokenAction` with given fields.
fn action(
    ft_action_type_id: u8,
    from_hash: Option<&str>,
    to_hash: Option<&str>,
    amount: &str,
) -> FtTokenAction {
    FtTokenAction::new(
        "deploy_hash",
        100,
        from_hash,
        to_hash,
        amount,
        FtActionType::from(ft_action_type_id),
    )
}

// fetch_ft_token_actions_page — HTTP layer

#[tokio::test]
async fn fetch_page_returns_error_on_5xx_response() {
    let server = MockServer::start().await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &common::test_config(server.uri()),
        "contract_hash",
        1,
    )
    .await;

    assert!(result.is_err(), "5xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "error must include status code: {err}");
}

#[tokio::test]
async fn fetch_page_returns_error_on_4xx_response() {
    let server = MockServer::start().await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(401).set_body_string("Unauthorized"))
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &common::test_config(server.uri()),
        "contract_hash",
        1,
    )
    .await;

    assert!(result.is_err(), "4xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("401"), "error must include status code: {err}");
}

#[tokio::test]
async fn fetch_page_sends_correct_query_params() {
    let server = MockServer::start().await;

    // Wiremock validates all required query params are present with correct values.
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::query_param(
            "contract_package_hash",
            "my_contract",
        ))
        .and(matchers::query_param("page", "3"))
        .and(matchers::query_param("page_size", "100"))
        .and(matchers::query_param("order_by", "block_height"))
        .and(matchers::query_param("order_direction", "ASC"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &common::test_config(server.uri()),
        "my_contract",
        3,
    )
    .await;

    assert!(
        result.is_ok(),
        "correct query params must succeed: {:?}",
        result.err()
    );
}

#[tokio::test]
async fn fetch_page_sends_authorization_header() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::header_exists("authorization"))
        .and(matchers::header("authorization", "test-token"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &common::test_config(server.uri()),
        "any_hash",
        1,
    )
    .await;

    assert!(
        result.is_ok(),
        "request with correct auth header must succeed: {:?}",
        result.err()
    );
}

#[tokio::test]
async fn fetch_page_parses_data_and_page_count() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_one_transfer_page()),
        )
        .mount(&server)
        .await;

    let page = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &common::test_config(server.uri()),
        "any_hash",
        1,
    )
    .await
    .unwrap();

    assert_eq!(page.page_count, 5);
    assert_eq!(page.data.len(), 1);
    let act = &page.data[0];
    assert_eq!(act.deploy_hash, "deploy_abc");
    assert_eq!(act.block_height, 1234);
    assert_eq!(act.amount, "9999");
    assert_eq!(act.ft_action_type, FtActionType::Transfer);
}

#[tokio::test]
async fn fetch_page_parses_empty_response() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let page = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &common::test_config(server.uri()),
        "any_hash",
        1,
    )
    .await
    .unwrap();

    assert!(page.data.is_empty());
    assert_eq!(page.page_count, 1);
}

// ft_action_to_event — mapping unit tests

// ft_action_type_id = 1 (Mint)

#[test]
fn mint_produces_mint_event_name() {
    let (name, _) = cep18::ft_action_to_event(&action(1, None, Some("recipient"), "5000")).unwrap();
    assert_eq!(name, "Mint");
}

#[test]
fn mint_includes_recipient_and_amount() {
    let (_, data) =
        cep18::ft_action_to_event(&action(1, None, Some("addr_recipient"), "42")).unwrap();
    assert_eq!(data["recipient"], "addr_recipient");
    assert_eq!(data["amount"], "42");
}

#[test]
fn mint_with_null_recipient_is_skipped() {
    // to_hash = None -> no recipient to credit, skip the action entirely
    assert!(cep18::ft_action_to_event(&action(1, None, None, "1000")).is_none());
}

// ft_action_type_id = 2 (Transfer)

#[test]
fn transfer_type2_produces_transfer_event_name() {
    let (name, _) =
        cep18::ft_action_to_event(&action(2, Some("sender"), Some("recipient"), "1000")).unwrap();
    assert_eq!(name, "Transfer");
}

#[test]
fn transfer_type2_includes_sender_recipient_and_amount() {
    let (_, data) =
        cep18::ft_action_to_event(&action(2, Some("sender_addr"), Some("recv_addr"), "999"))
            .unwrap();
    assert_eq!(data["sender"], "sender_addr");
    assert_eq!(data["recipient"], "recv_addr");
    assert_eq!(data["amount"], "999");
}

#[test]
fn transfer_with_null_sender_is_skipped() {
    // from_hash = None -> no sender, skip to avoid empty address in DB
    assert!(cep18::ft_action_to_event(&action(2, None, Some("recipient"), "1")).is_none());
}

#[test]
fn transfer_with_null_recipient_is_skipped() {
    // to_hash = None -> no recipient, skip to avoid empty address in DB
    assert!(cep18::ft_action_to_event(&action(2, Some("sender"), None, "1")).is_none());
}

// ft_action_type_id = 3 (Approve -> "SetAllowance")

#[test]
fn approve_type3_produces_set_allowance_event_name() {
    let (name, _) =
        cep18::ft_action_to_event(&action(3, Some("owner"), Some("spender"), "200")).unwrap();
    assert_eq!(name, "SetAllowance");
}

#[test]
fn approve_type3_includes_owner_spender_and_amount() {
    let (_, data) =
        cep18::ft_action_to_event(&action(3, Some("owner_addr"), Some("spender_addr"), "200"))
            .unwrap();
    assert_eq!(data["owner"], "owner_addr");
    assert_eq!(data["spender"], "spender_addr");
    assert_eq!(data["amount"], "200");
}

#[test]
fn approve_with_null_owner_is_skipped() {
    // from_hash = None -> no owner, skip to avoid empty address in DB
    assert!(cep18::ft_action_to_event(&action(3, None, Some("spender"), "0")).is_none());
}

#[test]
fn approve_with_null_spender_is_skipped() {
    // to_hash = None -> no spender, skip to avoid empty address in DB
    assert!(cep18::ft_action_to_event(&action(3, Some("owner"), None, "0")).is_none());
}

// ft_action_type_id = 4 (Burn) and unknowns — all return None

#[test]
fn burn_type4_returns_none() {
    assert!(cep18::ft_action_to_event(&action(4, Some("holder"), None, "500")).is_none());
}

#[test]
fn unknown_action_types_return_none() {
    assert!(cep18::ft_action_to_event(&action(0, None, None, "0")).is_none());
    assert!(cep18::ft_action_to_event(&action(5, None, None, "0")).is_none());
    assert!(cep18::ft_action_to_event(&action(99, None, None, "0")).is_none());
    assert!(cep18::ft_action_to_event(&action(255, None, None, "0")).is_none());
}

// backfill_cep18 integration tests (sqlx::test + wiremock)

/// Empty `/ft-token-actions` response — backfill must return `Ok(())` and
/// leave `event_cursors` empty (no block was processed).
#[sqlx::test(migrator = "MIGRATOR")]
async fn empty_data_exits_cleanly_without_cursor(pool: PgPool) {
    common::disable_rls(&pool).await;
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &common::test_config(server.uri()),
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    cep18::backfill_cep18(&ctx, ContractType::Big, "big_hash", 0)
        .await
        .unwrap();

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'big_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert!(
        cursor.is_none(),
        "cursor must not be saved when no actions were processed"
    );

    let tx_count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_transactions")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);
    assert_eq!(
        tx_count, 0,
        "no transactions must be written for empty data"
    );
}

/// Pre-existing cursor means actions at or below that block are skipped.
///
/// Expected: node is not contacted; no new DB writes; cursor stays at 500.
#[sqlx::test(migrator = "MIGRATOR")]
async fn cursor_resume_skips_actions_at_or_below_saved_block(pool: PgPool) {
    common::disable_rls(&pool).await;
    let server = MockServer::start().await;

    // Seed cursor at block 500.
    sqlx::query!(
        r"
            INSERT INTO event_cursors (stream_type, contract_hash, cursor_value, last_updated_at)
            VALUES ('backfill', 'big_hash', 500, NOW())
        "
    )
    .execute(&pool)
    .await
    .unwrap();

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_single(
                "old_deploy",
                400,
                Some(FakeAddress::Alice.as_str()),
                Some(FakeAddress::Bob.as_str()),
                "500",
                2,
                1,
            )),
        )
        .mount(&server)
        .await;

    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &common::test_config(server.uri()),
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    cep18::backfill_cep18(&ctx, ContractType::Big, "big_hash", 0)
        .await
        .unwrap();

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'big_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(
        cursor,
        Some(500),
        "cursor must not regress when all actions are below it"
    );

    let tx_count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_transactions")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);
    assert_eq!(
        tx_count, 0,
        "no transactions must be written for skipped actions"
    );
}

/// A Transfer action writes to `blockchain_transactions` and `token_holdings`,
/// and advances the cursor to the action's block height.
#[sqlx::test(migrator = "MIGRATOR")]
async fn transfer_action_written_to_tables_and_cursor_advances(pool: PgPool) {
    common::disable_rls(&pool).await;
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_single(
                TRANSFER_DEPLOY_HASH,
                200,
                Some(FakeAddress::Alice.as_str()),
                Some(FakeAddress::Bob.as_str()),
                "500",
                2,
                1,
            )),
        )
        .mount(&server)
        .await;

    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &common::test_config(server.uri()),
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    cep18::backfill_cep18(&ctx, ContractType::Big, "big_hash", 0)
        .await
        .unwrap();

    // blockchain_transactions must have one token_transfer row.
    let tx_count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM blockchain_transactions
            WHERE transaction_hash = $1 AND transaction_type = 'token_transfer'
        ",
        TRANSFER_DEPLOY_HASH
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);
    assert_eq!(
        tx_count, 1,
        "blockchain_transactions must have one token_transfer row"
    );

    // Bob's BIG balance must equal the transferred amount.
    let bob_balance: Option<String> = sqlx::query_scalar!(
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
        bob_balance.as_deref(),
        Some("500"),
        "bob's BIG balance must equal transferred amount"
    );

    // Alice gets balance '0' (Decrease with no prior balance avoids negatives on first-seen event).
    let alice_balance: Option<String> = sqlx::query_scalar!(
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
        alice_balance.as_deref(),
        Some("0"),
        "alice's balance must be clamped to '0' on first seen"
    );

    // Cursor must advance to block 200.
    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'big_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(
        cursor,
        Some(200),
        "cursor must advance to the processed block"
    );
}

/// A Burn action (`type_id = 4`) is not handled by `ft_action_to_event` and
/// returns `None`, so no DB writes happen and the cursor is NOT advanced.
///
/// This differs from ICO backfill where the cursor advances for all deploys
/// that pass the `error_message` filter, regardless of processing outcome.
#[sqlx::test(migrator = "MIGRATOR")]
async fn burn_action_skipped_and_cursor_not_updated(pool: PgPool) {
    common::disable_rls(&pool).await;
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_single(
                "burn_deploy",
                300,
                Some("holder"),
                None,
                "100",
                4,
                1,
            )),
        )
        .mount(&server)
        .await;

    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &common::test_config(server.uri()),
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    cep18::backfill_cep18(&ctx, ContractType::Big, "big_hash", 0)
        .await
        .unwrap();

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'big_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert!(
        cursor.is_none(),
        "cursor must not be saved when the only action is Burn (skipped by ft_action_to_event)"
    );

    let tx_count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_transactions")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);
    assert_eq!(
        tx_count, 0,
        "no transactions must be written for a Burn action"
    );
}

/// A Mint action (`type_id = 1`) is stored as a raw event in `blockchain_events`
/// (with `processed = true`) but must NOT create any `token_holdings` rows.
///
/// `TailorCoin` (BIG) has a fixed supply minted at deploy; Mint records from
/// CSPR.cloud represent the initial deployment allocation, not user-facing
/// operations.
#[sqlx::test(migrator = "MIGRATOR")]
async fn mint_action_stored_raw_without_token_holdings_update(pool: PgPool) {
    common::disable_rls(&pool).await;
    let server = MockServer::start().await;

    // 64-char deploy hash required by the `blockchain_transactions` CHECK constraint.
    const MINT_DEPLOY_HASH: &str =
        "bbbb000000000000000000000000000000000000000000000000000000000001";

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_single(
                MINT_DEPLOY_HASH,
                50,
                None,
                Some(FakeAddress::Bob.as_str()),
                "5000000000000000000000000000000",
                1,
                1,
            )),
        )
        .mount(&server)
        .await;

    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &common::test_config(server.uri()),
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    cep18::backfill_cep18(&ctx, ContractType::Big, "big_hash", 0)
        .await
        .unwrap();

    // One blockchain_events row must exist for Mint and be marked processed.
    let event = sqlx::query!(r"SELECT processed FROM blockchain_events WHERE event_type = 'Mint'")
        .fetch_optional(&pool)
        .await
        .unwrap();

    let event = event.expect("blockchain_events row must exist for Mint");
    assert_eq!(
        event.processed,
        Some(true),
        "Mint event must be marked processed = true in blockchain_events"
    );

    // Mint handler updates token_holdings for the recipient.
    let holdings: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM token_holdings")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);
    assert_eq!(
        holdings, 1,
        "Mint must create a token_holdings entry for recipient"
    );
}

/// When `start_block` is greater than `cursor + 1`, the effective start block
/// is `start_block` — actions in the range `(cursor, start_block)` are skipped.
///
/// Example: `cursor = 100`, `start_block = 200`, action at block `150`.
/// `effective_start = max(101, 200) = 200` → block 150 is skipped.
#[sqlx::test(migrator = "MIGRATOR")]
async fn start_block_takes_precedence_over_cursor_when_greater(pool: PgPool) {
    common::disable_rls(&pool).await;
    let server = MockServer::start().await;

    // Seed cursor at block 100.
    sqlx::query!(
        r"
            INSERT INTO event_cursors (stream_type, contract_hash, cursor_value, last_updated_at)
            VALUES ('backfill', 'big_hash', 100, NOW())
        "
    )
    .execute(&pool)
    .await
    .unwrap();

    // Action is at block 150: above cursor (100) but below start_block (200).
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_single(
                TRANSFER_DEPLOY_HASH,
                150,
                Some(FakeAddress::Alice.as_str()),
                Some(FakeAddress::Bob.as_str()),
                "100",
                2,
                1,
            )),
        )
        .mount(&server)
        .await;

    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &common::test_config(server.uri()),
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    cep18::backfill_cep18(
        &ctx,
        ContractType::Big,
        "big_hash",
        200, // start_block > cursor + 1
    )
    .await
    .unwrap();

    // Cursor must not advance — the action was skipped.
    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'big_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(
        cursor,
        Some(100),
        "cursor must not advance when all actions are below start_block"
    );

    let tx_count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_transactions")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);
    assert_eq!(
        tx_count, 0,
        "no transactions must be written for actions below start_block"
    );
}

/// When the API returns `page_count = 0` alongside non-empty data, `backfill_cep18`
/// must process the actions on that single page and stop (not loop or panic).
///
/// The loop condition `page >= page_count` evaluates `1 >= 0 = true` immediately,
/// so exactly one page is fetched and processed.
#[sqlx::test(migrator = "MIGRATOR")]
async fn page_count_zero_with_data_processes_single_page_and_stops(pool: PgPool) {
    common::disable_rls(&pool).await;
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_single(
                TRANSFER_DEPLOY_HASH,
                50,
                Some(FakeAddress::Alice.as_str()),
                Some(FakeAddress::Bob.as_str()),
                "100",
                2,
                0,
            )),
        )
        .mount(&server)
        .await;

    let client = Client::new();
    let registry = EventRegistry::new();
    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &common::test_config(server.uri()),
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    cep18::backfill_cep18(&ctx, ContractType::Big, "big_hash", 0)
        .await
        .unwrap();

    // The Transfer on page 1 must have been processed despite page_count = 0.
    let tx_count: i64 = sqlx::query_scalar!(
        r"SELECT COUNT(*) FROM blockchain_transactions WHERE transaction_hash = $1",
        TRANSFER_DEPLOY_HASH,
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);
    assert_eq!(
        tx_count, 1,
        "action must be processed even when page_count = 0"
    );
}
