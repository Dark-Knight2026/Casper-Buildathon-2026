//! Integration tests for the `PropertyRegistry` `PropertyCreated` event handler.
//!
//! The indexer reconciles on-chain `create_property` records back to the
//! backend `properties` row by `metadata_uri` - the `ipfs://{cid}` the backend
//! pinned and the frontend echoes into the contract - marking the row tokenized
//! and stamping the contract-assigned id onto `nft_token_id`.

#![cfg(feature = "integration")]

mod common;

use std::collections::HashSet;

use serde_json::json;
use sqlx::PgPool;

use common::MIGRATOR;
use indexer::{
    config::ContractType,
    events::EventRegistry,
    processor::{self, RawEvent},
};

/// 64-char deploy hash for `PropertyRegistry` tests.
const PROPERTY_REGISTRY_DEPLOY_HASH: &str =
    "0000000000000000000000000000000000000000000000000000000000009002";

/// Metadata pointer shared by the seeded property and the event - the match key.
const METADATA_URI: &str = "ipfs://bafytestpropertymetadata";

/// Seeds a landlord and an untokenized property carrying `metadata_uri`. Sets
/// only the NOT-NULL-without-default columns plus the off-chain pointer the
/// indexer matches on; one statement so no id has to cross back into Rust.
async fn seed_untokenized_property(pool: &PgPool, metadata_uri: &str) {
    sqlx::query(
        r"
            WITH new_landlord AS (
                INSERT INTO users (first_name, last_name, role)
                VALUES ('Land', 'Lord', 'landlord')
                RETURNING id
            )
            INSERT INTO properties (
                landlord_id, property_type, address_line1, city, state, zip_code,
                metadata_uri
            )
            SELECT id, 'single_family', '1 Test St', 'Denver', 'CO', '80202', $1
            FROM new_landlord
        ",
    )
    .bind(metadata_uri)
    .execute(pool)
    .await
    .expect("seed property");
}

/// Disables RLS on the indexer-owned tables plus `properties` and `users` (not
/// indexer tables, so not covered by the shared `disable_rls` helper).
async fn disable_all_rls(pool: &PgPool) {
    common::disable_rls(pool).await;
    for table in ["properties", "users"] {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "ALTER TABLE {table} DISABLE ROW LEVEL SECURITY"
        )))
        .execute(pool)
        .await
        .unwrap_or_else(|e| panic!("disable RLS on {table}: {e}"));
    }
}

/// A `PropertyCreated` whose `metadata_uri` matches a seeded property marks that
/// row tokenized and stamps the contract-assigned id on `nft_token_id`.
#[sqlx::test(migrator = "MIGRATOR")]
async fn property_created_tokenizes_matching_property(pool: PgPool) {
    disable_all_rls(&pool).await;
    seed_untokenized_property(&pool, METADATA_URI).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "property_registry_hash".to_owned(),
            deploy_hash: PROPERTY_REGISTRY_DEPLOY_HASH.to_owned(),
            block_height: 200,
            contract_type: ContractType::PropertyRegistry,
            event_name: "PropertyCreated".to_owned(),
            event_data: json!({
                "property_id": "42",
                "issuer": "7",
                "total_supply": "1000000",
                "metadata_uri": METADATA_URI
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let (is_tokenized, nft_token_id, has_tokenized_at) =
        sqlx::query_as::<_, (bool, Option<String>, bool)>(
            r"
                SELECT is_tokenized, nft_token_id, tokenized_at IS NOT NULL
                FROM properties
                WHERE metadata_uri = $1
            ",
        )
        .bind(METADATA_URI)
        .fetch_one(&pool)
        .await
        .unwrap();

    assert!(is_tokenized, "property must be marked tokenized");
    assert_eq!(nft_token_id.as_deref(), Some("42"));
    assert!(has_tokenized_at, "tokenized_at must be stamped");
}

/// A `PropertyCreated` whose `metadata_uri` matches no property is skipped
/// without error and tokenizes nothing.
#[sqlx::test(migrator = "MIGRATOR")]
async fn property_created_for_unknown_metadata_uri_is_skipped(pool: PgPool) {
    disable_all_rls(&pool).await;
    seed_untokenized_property(&pool, METADATA_URI).await;

    processor::process_event(
        &pool,
        &EventRegistry::new(),
        &HashSet::new(),
        &RawEvent {
            contract_hash: "property_registry_hash".to_owned(),
            deploy_hash: PROPERTY_REGISTRY_DEPLOY_HASH.to_owned(),
            block_height: 200,
            contract_type: ContractType::PropertyRegistry,
            event_name: "PropertyCreated".to_owned(),
            event_data: json!({
                "property_id": "99",
                "issuer": "7",
                "total_supply": "1000000",
                "metadata_uri": "ipfs://does-not-match"
            }),
            block_timestamp: None,
            transform_idx: None,
            api_from_type: None,
            api_to_type: None,
        },
    )
    .await
    .unwrap();

    let tokenized_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM properties WHERE is_tokenized = TRUE")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        tokenized_count, 0,
        "no property should be tokenized for an unmatched uri"
    );
}
