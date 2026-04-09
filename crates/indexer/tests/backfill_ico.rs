//! Tests for ICO backfill.
//!
//! Covers two areas:
//!
//! 1. **HTTP helpers** — wiremock tests for `load_big_transfers` (paging,
//!    filtering, error handling), `parse_purchase_args`, `ico_currency_name`.
//!
//! 2. **`backfill_ico` integration** — `sqlx::test` + wiremock tests that run
//!    against a real migrated `PostgreSQL` database and verify the full pipeline:
//!    cursor management, failed-deploy filtering, cursor resume, and successful
//!    purchase writes to `ico_purchases`, `blockchain_transactions`, and
//!    `token_holdings`.

mod common;

use std::collections::HashSet;

use reqwest::Client;
use serde_json::json;
use sqlx::PgPool;
use wiremock::{Mock, MockServer, ResponseTemplate, matchers};

use common::{FakeAddress, MIGRATOR, PURCHASE_DEPLOY_HASH, payloads};
use indexer::{
    backfill::{BackfillContext, ico},
    config::ContractType,
    events::EventRegistry,
};

#[tokio::test]
async fn filters_only_ico_initiated_transfers() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::query_param("page", "1"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_mixed_senders()),
        )
        .mount(&server)
        .await;

    let map = ico::load_big_transfers(
        &Client::new(),
        &common::test_config(server.uri()),
        "big_hash",
        "ico_hash",
        0,
    )
    .await
    .unwrap();

    assert_eq!(map.len(), 1);
    assert_eq!(map["deploy_ico"], "700");
    assert!(!map.contains_key("deploy_other"));
    assert!(!map.contains_key("deploy_mint"));
}

#[tokio::test]
async fn paginates_all_pages_using_page_count_from_response() {
    let server = MockServer::start().await;

    // page=1: exactly 100 items — must trigger a request for page=2
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::query_param("page", "1"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_100_items_page1()),
        )
        .mount(&server)
        .await;

    // page=2: 2 items — must stop paginating
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::query_param("page", "2"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(payloads::ft_actions_2_items_page2()),
        )
        .mount(&server)
        .await;

    let map = ico::load_big_transfers(
        &Client::new(),
        &common::test_config(server.uri()),
        "big_hash",
        "ico_hash",
        0,
    )
    .await
    .unwrap();

    assert_eq!(map.len(), 102);
    assert!(map.contains_key("d0"));
    assert!(map.contains_key("d99"));
    assert_eq!(map["d100"], "2");
    assert_eq!(map["d101"], "3");
}

#[tokio::test]
async fn returns_empty_map_when_no_ico_transfers_exist() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .and(matchers::query_param("page", "1"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [],
            "item_count": 0,
            "page_count": 0
        })))
        .mount(&server)
        .await;

    let map = ico::load_big_transfers(
        &Client::new(),
        &common::test_config(server.uri()),
        "big_hash",
        "ico_hash",
        0,
    )
    .await
    .unwrap();

    assert!(map.is_empty());
}

#[tokio::test]
async fn load_big_transfers_returns_error_on_5xx_response() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .mount(&server)
        .await;

    let result = ico::load_big_transfers(
        &Client::new(),
        &common::test_config(server.uri()),
        "big_hash",
        "ico_hash",
        0,
    )
    .await;

    assert!(result.is_err(), "5xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "Error must include status code: {err}");
}

#[tokio::test]
async fn load_big_transfers_returns_error_on_4xx_response() {
    let server = MockServer::start().await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(401).set_body_string("Unauthorized"))
        .mount(&server)
        .await;

    let result = ico::load_big_transfers(
        &Client::new(),
        &common::test_config(server.uri()),
        "big_hash",
        "ico_hash",
        0,
    )
    .await;

    assert!(result.is_err(), "4xx response must return an error");
    let err = result.unwrap_err().to_string();
    assert!(err.contains("401"), "Error must include status code: {err}");
}

// parse_purchase_args

#[test]
fn parse_purchase_args_extracts_string_amount_and_currency() {
    let args = payloads::purchase_args(&json!("50000000"), 0);
    let (cost, currency_id) = ico::parse_purchase_args(&args).unwrap();
    assert_eq!(cost, "50000000");
    assert_eq!(currency_id, 0);
}

#[test]
fn parse_purchase_args_extracts_numeric_amount() {
    // Some responses return `parsed` as a JSON number, not a string.
    let args = payloads::purchase_args(&json!(12345u64), 2);
    let (cost, currency_id) = ico::parse_purchase_args(&args).unwrap();
    assert_eq!(cost, "12345");
    assert_eq!(currency_id, 2);
}

#[test]
fn parse_purchase_args_returns_none_when_top_level_key_missing() {
    assert!(ico::parse_purchase_args(&json!({})).is_none());
    assert!(ico::parse_purchase_args(&json!({ "other": {} })).is_none());
}

#[test]
fn parse_purchase_args_returns_none_when_amount_missing() {
    let args = json!({
        "currency": { "cl_type": "U8", "parsed": 1u64 }
    });
    assert!(ico::parse_purchase_args(&args).is_none());
}

#[test]
fn parse_purchase_args_returns_none_when_currency_missing() {
    let args = json!({
        "amount_to_spend": { "cl_type": "U256", "parsed": "100" }
    });
    assert!(ico::parse_purchase_args(&args).is_none());
}

#[test]
fn parse_purchase_args_returns_none_when_args_is_empty() {
    assert!(ico::parse_purchase_args(&json!({})).is_none());
}

// parse_add_schedule_args

#[test]
fn parse_add_schedule_args_extracts_all_fields() {
    let args = payloads::schedule_args("sched-1", 1000, 2000, &json!("999000"), &json!("500000"));
    let result = ico::parse_add_schedule_args(&args).unwrap();
    assert_eq!(result.id, "sched-1");
    assert_eq!(result.start_timestamp, 1000);
    assert_eq!(result.end_timestamp, 2000);
    assert_eq!(result.sale_amount, "999000");
    assert_eq!(result.price, "500000");
}

#[test]
fn parse_add_schedule_args_extracts_numeric_sale_amount() {
    let args = payloads::schedule_args("sched-2", 0, 100, &json!(42000u64), &json!(750u64));
    let result = ico::parse_add_schedule_args(&args).unwrap();
    assert_eq!(result.sale_amount, "42000");
    assert_eq!(result.price, "750");
}

#[test]
fn parse_add_schedule_args_returns_none_when_id_missing() {
    let args = json!({
        "start_timestamp": { "cl_type": "U64",  "parsed": 1000u64 },
        "end_timestamp":   { "cl_type": "U64",  "parsed": 2000u64 },
        "sale_amount":     { "cl_type": "U256", "parsed": "100" },
        "price":           { "cl_type": "U256", "parsed": "50" }
    });
    assert!(ico::parse_add_schedule_args(&args).is_none());
}

#[test]
fn parse_add_schedule_args_returns_none_when_required_field_missing() {
    // Missing price
    let args = json!({
        "id":              { "cl_type": "String", "parsed": "sched" },
        "start_timestamp": { "cl_type": "U64",    "parsed": 1000u64 },
        "end_timestamp":   { "cl_type": "U64",    "parsed": 2000u64 },
        "sale_amount":     { "cl_type": "U256",   "parsed": "100" }
    });
    assert!(ico::parse_add_schedule_args(&args).is_none());
}

#[test]
fn parse_add_schedule_args_returns_none_when_args_is_empty() {
    assert!(ico::parse_add_schedule_args(&json!({})).is_none());
}

// ico_currency_name

#[test]
fn ico_currency_name_maps_all_known_variants() {
    assert_eq!(ico::ico_currency_name(0), "CSPR");
    assert_eq!(ico::ico_currency_name(1), "USDC");
    assert_eq!(ico::ico_currency_name(2), "USDT");
}

#[test]
fn ico_currency_name_returns_unknown_for_unrecognised_ids() {
    assert_eq!(ico::ico_currency_name(3), "UNKNOWN");
    assert_eq!(ico::ico_currency_name(255), "UNKNOWN");
}

// backfill_ico integration tests (sqlx::test + wiremock)

/// One-page `/deploys` wiremock response with the given deploy entries.
#[allow(clippy::needless_pass_by_value)]
fn deploys_page(deploys: serde_json::Value) -> ResponseTemplate {
    ResponseTemplate::new(200).set_body_json(json!({ "data": deploys, "page_count": 1 }))
}

/// Deploy without purchase args (e.g. a setup/init deploy) — cursor advances
/// but no purchase is written.
#[sqlx::test(migrator = "MIGRATOR")]
async fn deploy_without_purchase_args_advances_cursor_but_writes_nothing(pool: PgPool) {
    common::disable_rls(&pool).await;
    let rest = MockServer::start().await;
    let config = common::test_config(rest.uri());
    let client = Client::new();
    let registry = EventRegistry::new();

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&rest)
        .await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/deploys"))
        .respond_with(deploys_page(json!([
            {
                "deploy_hash": "deploy_abc",
                "block_height": 100,
                "error_message": null,
                "args": { "some_other_arg": { "cl_type": "String", "parsed": "hello" } },
                "caller_public_key": "01abc",
                "timestamp": "2024-06-01T12:00:00.000Z"
            }
        ])))
        .mount(&rest)
        .await;

    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &config,
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    ico::backfill_ico(&ctx, "big_hash", ContractType::Ico, "ico_hash", 0)
        .await
        .unwrap();

    let tx_count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM blockchain_transactions
            WHERE transaction_type = 'token_purchase'
        "
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);
    assert_eq!(
        tx_count, 0,
        "no purchase should be written when deploy has no purchase args"
    );

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'ico_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(
        cursor,
        Some(100),
        "cursor must advance even when deploy was skipped (no purchase args)"
    );
}

/// Deploy with `error_message` set is filtered out before any processing.
///
/// Expected: nothing written to DB; cursor NOT saved because `page_max_block`
/// is never set for errored deploys.
#[sqlx::test(migrator = "MIGRATOR")]
async fn failed_deploy_skipped_and_cursor_not_updated(pool: PgPool) {
    common::disable_rls(&pool).await;
    let rest = MockServer::start().await;
    let config = common::test_config(rest.uri());
    let client = Client::new();
    let registry = EventRegistry::new();

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&rest)
        .await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/deploys"))
        .respond_with(deploys_page(json!([
            {
                "deploy_hash": "failed_deploy",
                "block_height": 200,
                "error_message": "User error: insufficient funds",
                "args": {},
                "caller_public_key": "01abc",
                "timestamp": "2024-06-01T12:00:00.000Z"
            }
        ])))
        .mount(&rest)
        .await;

    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &config,
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    ico::backfill_ico(&ctx, "big_hash", ContractType::Ico, "ico_hash", 0)
        .await
        .unwrap();

    let tx_count: i64 = sqlx::query_scalar!(r"SELECT COUNT(*) FROM blockchain_transactions")
        .fetch_one(&pool)
        .await
        .unwrap()
        .unwrap_or(0);
    assert_eq!(
        tx_count, 0,
        "failed deploy must not produce any transaction"
    );

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'ico_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert!(
        cursor.is_none(),
        "cursor must not be saved when all deploys are filtered out"
    );
}

/// Pre-existing cursor makes the backfill skip deploys at or below that block.
///
/// Expected: no new DB writes; cursor unchanged.
#[sqlx::test(migrator = "MIGRATOR")]
async fn cursor_resume_skips_already_processed_blocks(pool: PgPool) {
    common::disable_rls(&pool).await;
    let rest = MockServer::start().await;
    let config = common::test_config(rest.uri());
    let client = Client::new();
    let registry = EventRegistry::new();

    // Seed cursor at block 500 — simulates a previous successful run.
    sqlx::query!(
        r"
            INSERT INTO event_cursors (stream_type, contract_hash, cursor_value, last_updated_at)
            VALUES ('backfill', 'ico_hash', 500, NOW())
        "
    )
    .execute(&pool)
    .await
    .unwrap();

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&rest)
        .await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/deploys"))
        .respond_with(deploys_page(json!([
            {
                "deploy_hash": "old_deploy",
                "block_height": 400,
                "error_message": null,
                "args": {},
                "caller_public_key": "01abc",
                "timestamp": "2024-06-01T12:00:00.000Z"
            }
        ])))
        .mount(&rest)
        .await;

    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &config,
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    ico::backfill_ico(&ctx, "big_hash", ContractType::Ico, "ico_hash", 0)
        .await
        .unwrap();

    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'ico_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(
        cursor,
        Some(500),
        "cursor must not regress after skipping old deploys"
    );
}

/// Full happy-path: valid `purchase` deploy with a matching BIG transfer
/// must write rows to `ico_purchases`, `blockchain_transactions`, and
/// `token_holdings`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn successful_purchase_written_to_all_tables(pool: PgPool) {
    common::disable_rls(&pool).await;
    let rest = MockServer::start().await;
    let config = common::test_config(rest.uri());
    let client = Client::new();
    let registry = EventRegistry::new();

    // BIG transfer: ICO sent 1000 BIG tokens for this deploy.
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": [{ "deploy_hash": PURCHASE_DEPLOY_HASH, "from_hash": "ico_hash", "amount": "1000" }],
            "page_count": 1
        })))
        .mount(&rest)
        .await;
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/deploys"))
        .respond_with(deploys_page(json!([
            {
                "deploy_hash": PURCHASE_DEPLOY_HASH,
                "block_height": 300,
                "error_message": null,
                "args": payloads::purchase_args(&json!("50000000"), 1),
                "caller_public_key": FakeAddress::Buyer.as_str(),
                "timestamp": "2024-06-01T12:00:00.000Z"
            }
        ])))
        .mount(&rest)
        .await;

    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &config,
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    ico::backfill_ico(&ctx, "big_hash", ContractType::Ico, "ico_hash", 0)
        .await
        .unwrap();

    // ico_purchases must have exactly one row.
    let purchase = sqlx::query!(
        r"
            SELECT buyer_address, amount, currency, cost FROM ico_purchases
            WHERE transaction_hash = $1
        ",
        PURCHASE_DEPLOY_HASH
    )
    .fetch_one(&pool)
    .await
    .expect("ico_purchases must have a row for the purchase deploy");

    assert_eq!(purchase.buyer_address, FakeAddress::Buyer.as_str());
    assert_eq!(purchase.amount, "1000");
    assert_eq!(purchase.currency, "USDC");
    assert_eq!(purchase.cost, "50000000");

    // blockchain_transactions must have a 'token_purchase' row.
    let tx_count: i64 = sqlx::query_scalar!(
        r"
            SELECT COUNT(*) FROM blockchain_transactions
            WHERE transaction_hash = $1 AND transaction_type = 'token_purchase'
        ",
        PURCHASE_DEPLOY_HASH
    )
    .fetch_one(&pool)
    .await
    .unwrap()
    .unwrap_or(0);
    assert_eq!(
        tx_count, 1,
        "blockchain_transactions must have one token_purchase row"
    );

    // token_holdings must reflect 1000 BIG for the buyer.
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
        Some("1000"),
        "buyer BIG balance must equal purchased amount"
    );

    // Cursor must advance to block 300.
    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'ico_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(cursor, Some(300));
}

/// Full happy-path for `add_schedule` deploy: the backfill must parse the
/// schedule args, dispatch `ICOScheduleAdded`, and write a row to `ico_schedules`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn successful_schedule_written_via_backfill(pool: PgPool) {
    common::disable_rls(&pool).await;
    sqlx::query("ALTER TABLE ico_schedules DISABLE ROW LEVEL SECURITY")
        .execute(&pool)
        .await
        .unwrap();

    let rest = MockServer::start().await;
    let config = common::test_config(rest.uri());
    let client = Client::new();
    let registry = EventRegistry::new();

    let schedule_deploy_hash = "0000000000000000000000000000000000000000000000000000000000009999";

    // No BIG transfers needed for schedule deploys.
    Mock::given(matchers::method("GET"))
        .and(matchers::path("/ft-token-actions"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(json!({ "data": [], "page_count": 1 })),
        )
        .mount(&rest)
        .await;

    Mock::given(matchers::method("GET"))
        .and(matchers::path("/deploys"))
        .respond_with(deploys_page(json!([
            {
                "deploy_hash": schedule_deploy_hash,
                "block_height": 400,
                "error_message": null,
                "args": payloads::schedule_args(
                    "round-1", 1_700_000_000_u64, 1_700_100_000_u64,
                    &json!("500000000000000000000000000"),
                    &json!("500000")
                ),
                "caller_public_key": FakeAddress::Alice.as_str(),
                "timestamp": "2024-06-01T12:00:00.000Z"
            }
        ])))
        .mount(&rest)
        .await;

    let known_hashes = HashSet::new();
    let ctx = BackfillContext {
        client: &client,
        config: &config,
        db_pool: &pool,
        registry: &registry,
        known_hashes: &known_hashes,
    };
    ico::backfill_ico(&ctx, "big_hash", ContractType::Ico, "ico_hash", 0)
        .await
        .unwrap();

    // ico_schedules must contain the expected row.
    let row = sqlx::query!(
        r"
            SELECT schedule_id, start_timestamp, end_timestamp, sale_amount, price
            FROM ico_schedules WHERE schedule_id = 'round-1'
        "
    )
    .fetch_one(&pool)
    .await
    .expect("ico_schedules must have a row for the schedule deploy");

    assert_eq!(row.schedule_id, "round-1");
    assert_eq!(row.start_timestamp, 1_700_000_000);
    assert_eq!(row.end_timestamp, 1_700_100_000);
    assert_eq!(row.sale_amount, "500000000000000000000000000");
    assert_eq!(row.price, "500000");

    // Cursor must advance to block 400.
    let cursor: Option<i64> = sqlx::query_scalar!(
        r"
            SELECT cursor_value FROM event_cursors
            WHERE stream_type = 'backfill' AND contract_hash = 'ico_hash'
        "
    )
    .fetch_optional(&pool)
    .await
    .unwrap();
    assert_eq!(cursor, Some(400));
}
