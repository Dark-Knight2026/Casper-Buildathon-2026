//! Tests for CEP-18 backfill logic.
//!
//! Covers two areas:
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

mod common;

use reqwest::Client;
use serde_json::json;
use sqlx::PgPool;
use wiremock::{Mock, MockServer, ResponseTemplate, matchers};

use common::{MIGRATOR, TRANSFER_DEPLOY_HASH, payloads};
use indexer::{
    backfill::cep18::{self, FtTokenAction},
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
        ft_action_type_id,
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
        &common::test_config(server.uri(), None),
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
        &common::test_config(server.uri(), None),
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
        .and(matchers::query_param("limit", "100"))
        .and(matchers::query_param("order_by", "block_height"))
        .and(matchers::query_param("order_direction", "ASC"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&server)
        .await;

    let result = cep18::fetch_ft_token_actions_page(
        &Client::new(),
        &common::test_config(server.uri(), None),
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
        &common::test_config(server.uri(), None),
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
        &common::test_config(server.uri(), None),
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
    assert_eq!(act.ft_action_type_id, 2);
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
        &common::test_config(server.uri(), None),
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
fn mint_with_null_recipient_falls_back_to_empty_string() {
    // to_hash = None → recipient field must be ""
    let (_, data) = cep18::ft_action_to_event(&action(1, None, None, "1000")).unwrap();
    assert_eq!(data["recipient"], "");
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
fn transfer_type2_with_null_hashes_falls_back_to_empty_string() {
    let (_, data) = cep18::ft_action_to_event(&action(2, None, None, "1")).unwrap();
    assert_eq!(data["sender"], "");
    assert_eq!(data["recipient"], "");
}

// ft_action_type_id = 3 (Approve → "SetAllowance")

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
fn approve_type3_with_null_hashes_falls_back_to_empty_string() {
    let (_, data) = cep18::ft_action_to_event(&action(3, None, None, "0")).unwrap();
    assert_eq!(data["owner"], "");
    assert_eq!(data["spender"], "");
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

    cep18::backfill_cep18(
        &Client::new(),
        &common::test_config(server.uri(), None),
        &pool,
        &EventRegistry::new(),
        ContractType::Big,
        "big_hash",
        0,
    )
    .await
    .unwrap();

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT last_event_id FROM event_cursors
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
            INSERT INTO event_cursors (stream_type, contract_hash, last_event_id, last_updated_at)
            VALUES ('backfill', 'big_hash', 500, NOW())
        "
    )
    .execute(&pool)
    .await
    .unwrap();

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [
                {
                    "deploy_hash": "old_deploy",
                    "block_height": 400,
                    "from_hash": "alice",
                    "to_hash": "bob",
                    "amount": "500",
                    "ft_action_type_id": 2
                }
            ],
            "page_count": 1
        })))
        .mount(&server)
        .await;

    cep18::backfill_cep18(
        &Client::new(),
        &common::test_config(server.uri(), None),
        &pool,
        &EventRegistry::new(),
        ContractType::Big,
        "big_hash",
        0,
    )
    .await
    .unwrap();

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT last_event_id FROM event_cursors
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
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [
                {
                    "deploy_hash":       TRANSFER_DEPLOY_HASH,
                    "block_height":      200,
                    "from_hash":         "alice",
                    "to_hash":           "bob",
                    "amount":            "500",
                    "ft_action_type_id": 2
                }
            ],
            "page_count": 1
        })))
        .mount(&server)
        .await;

    cep18::backfill_cep18(
        &Client::new(),
        &common::test_config(server.uri(), None),
        &pool,
        &EventRegistry::new(),
        ContractType::Big,
        "big_hash",
        0,
    )
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
            WHERE user_address = 'bob' AND token_type = 'BIG'
        "
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
            WHERE user_address = 'alice' AND token_type = 'BIG'
        "
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
            SELECT last_event_id FROM event_cursors
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
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [
                {
                    "deploy_hash":       "burn_deploy",
                    "block_height":      300,
                    "from_hash":         "holder",
                    "to_hash":           null,
                    "amount":            "100",
                    "ft_action_type_id": 4
                }
            ],
            "page_count": 1
        })))
        .mount(&server)
        .await;

    cep18::backfill_cep18(
        &Client::new(),
        &common::test_config(server.uri(), None),
        &pool,
        &EventRegistry::new(),
        ContractType::Big,
        "big_hash",
        0,
    )
    .await
    .unwrap();

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT last_event_id FROM event_cursors
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
