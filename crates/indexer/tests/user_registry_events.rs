//! Integration tests for the `UserRegistry` `UserCreated` event handler.
//!
//! HACK (hackathon): the indexer reconciles on-chain `create_user` records
//! (emitted because the frontend calls the contract directly) back to backend
//! accounts by wallet, writing `users.onchain_user_id`.

#![cfg(feature = "integration")]

mod common;

use std::collections::HashSet;

use serde_json::json;
use sqlx::PgPool;

use common::MIGRATOR;
use indexer::{
    address::normalize_casper_address,
    config::ContractType,
    events::EventRegistry,
    processor::{self, RawEvent},
};

/// 64-char deploy hash for `UserRegistry` tests.
const USER_REGISTRY_DEPLOY_HASH: &str =
    "0000000000000000000000000000000000000000000000000000000000009001";

/// A valid Casper ed25519 public key (66 hex), reused from `tests/address.rs`.
/// `users.wallet_address` stores this form (CHECK `length IN (66, 68)`); the
/// `UserCreated` event instead carries its derived account hash.
const WALLET_PUBKEY: &str = "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca";

/// Inserts a minimal `users` row with the given linked wallet, caching its
/// derived `account_hash` the way the wallet-link insert path does. Only the
/// NOT-NULL-without-default columns (plus the cache) are set; the rest take
/// their defaults. Exercises the indexed fast-path match.
async fn seed_user_with_wallet(pool: &PgPool, wallet: &str) {
    let account_hash = normalize_casper_address(wallet).expect("valid public key");
    sqlx::query(
        r"
            INSERT INTO users (first_name, last_name, role, wallet_address, account_hash)
            VALUES ('Test', 'User', 'tenant', $1, $2)
        ",
    )
    .bind(wallet)
    .bind(account_hash)
    .execute(pool)
    .await
    .expect("seed user row");
}

/// Inserts a `users` row linked to a wallet but WITHOUT a cached `account_hash`,
/// reproducing a row linked before the cache column existed. Exercises the
/// indexer's derive-on-the-fly legacy fallback.
async fn seed_legacy_user_with_wallet(pool: &PgPool, wallet: &str) {
    sqlx::query(
        r"
            INSERT INTO users (first_name, last_name, role, wallet_address)
            VALUES ('Test', 'User', 'tenant', $1)
        ",
    )
    .bind(wallet)
    .execute(pool)
    .await
    .expect("seed legacy user row");
}

/// Disables RLS on the tables this test touches: the indexer-owned tables the
/// processor writes to, plus `users` (not an indexer table, so not covered by
/// the shared `disable_rls` helper). `sqlx::test` connections carry no auth
/// context, so RLS-enabled tables would otherwise reject the writes.
async fn disable_all_rls(pool: &PgPool) {
    common::disable_rls(pool).await;
    sqlx::query(sqlx::AssertSqlSafe(
        "ALTER TABLE users DISABLE ROW LEVEL SECURITY",
    ))
    .execute(pool)
    .await
    .expect("disable RLS on users");
}

/// A `UserCreated` event whose `active_wallet` (an account hash) derives from a
/// linked account's public key must stamp that account's `onchain_user_id` and
/// flip `onchain_status` to active.
#[sqlx::test(migrator = "MIGRATOR")]
async fn user_created_writes_onchain_id_to_matching_user(pool: PgPool) {
    disable_all_rls(&pool).await;
    seed_user_with_wallet(&pool, WALLET_PUBKEY).await;

    // The event carries the account hash derived from the linked public key.
    let account_hash = normalize_casper_address(WALLET_PUBKEY).expect("valid public key");

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "user_registry_hash".to_owned(),
            deploy_hash: USER_REGISTRY_DEPLOY_HASH.to_owned(),
            block_height: 100,
            contract_type: ContractType::UserRegistry,
            event_name: "UserCreated".to_owned(),
            event_data: json!({
                "user_id": "12345",
                "active_wallet": account_hash,
                "role_flags": 1_u32
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let onchain_user_id = sqlx::query_scalar::<_, Option<String>>(
        "SELECT onchain_user_id::text FROM users WHERE wallet_address = $1",
    )
    .bind(WALLET_PUBKEY)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(onchain_user_id.as_deref(), Some("12345"));

    let onchain_status = sqlx::query_scalar::<_, Option<String>>(
        "SELECT onchain_status FROM users WHERE wallet_address = $1",
    )
    .bind(WALLET_PUBKEY)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(onchain_status.as_deref(), Some("active"));
}

/// A `UserCreated` event for an account hash no linked account derives to must
/// be skipped without error and must not stamp any account.
#[sqlx::test(migrator = "MIGRATOR")]
async fn user_created_for_unknown_wallet_is_skipped(pool: PgPool) {
    disable_all_rls(&pool).await;
    // A linked account exists, but the event carries an unrelated account hash.
    seed_user_with_wallet(&pool, WALLET_PUBKEY).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "user_registry_hash".to_owned(),
            deploy_hash: USER_REGISTRY_DEPLOY_HASH.to_owned(),
            block_height: 100,
            contract_type: ContractType::UserRegistry,
            event_name: "UserCreated".to_owned(),
            event_data: json!({
                "user_id": "999",
                "active_wallet": "f".repeat(64),
                "role_flags": 2_u32
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let linked_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE onchain_user_id IS NOT NULL",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        linked_count, 0,
        "no account should be linked for an unrelated account hash"
    );
}

/// A wallet linked before the `account_hash` cache existed (NULL cache) must
/// still reconcile: the indexed fast-path misses, so the indexer derives the
/// hash for the legacy wallet and matches by it.
#[sqlx::test(migrator = "MIGRATOR")]
async fn user_created_links_legacy_wallet_without_account_hash(pool: PgPool) {
    disable_all_rls(&pool).await;
    seed_legacy_user_with_wallet(&pool, WALLET_PUBKEY).await;

    let account_hash = normalize_casper_address(WALLET_PUBKEY).expect("valid public key");

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "user_registry_hash".to_owned(),
            deploy_hash: USER_REGISTRY_DEPLOY_HASH.to_owned(),
            block_height: 100,
            contract_type: ContractType::UserRegistry,
            event_name: "UserCreated".to_owned(),
            event_data: json!({
                "user_id": "777",
                "active_wallet": account_hash,
                "role_flags": 1_u32
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let onchain_user_id = sqlx::query_scalar::<_, Option<String>>(
        "SELECT onchain_user_id::text FROM users WHERE wallet_address = $1",
    )
    .bind(WALLET_PUBKEY)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        onchain_user_id.as_deref(),
        Some("777"),
        "legacy wallet without a cached account_hash should reconcile via the fallback"
    );
}
