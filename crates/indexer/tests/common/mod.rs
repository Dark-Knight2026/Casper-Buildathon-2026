//! Shared test infrastructure for indexer integration tests.
//!
//! Contains helpers used across multiple `sqlx::test` + wiremock test binaries:
//! database migration runner, fake deploy hash constants, RLS disabler, and
//! JSON payload builders ([`payloads`]).

// Items in this module are shared across multiple test binaries. Each binary
// compiles `common` independently and will see items used only in another
// binary as "dead code". Suppress that warning for the whole module tree.
#![allow(dead_code)]

use indexer::config::{Casper, ContractRegistry, IndexerConfig};
use sqlx::PgPool;

pub mod payloads;

/// Runs all Supabase migrations before each `sqlx::test` that references it.
pub static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("../../supabase/migrations");

/// Fake 64-char deploy hash used in integration tests.
///
/// `blockchain_transactions` enforces `CHECK (length(transaction_hash) = 64)`,
/// so any test that writes a purchase must use a 64-character string here.
pub const PURCHASE_DEPLOY_HASH: &str =
    "0000000000000000000000000000000000000000000000000000000000001234";

/// Fake 64-char deploy hash used in integration tests.
///
/// `blockchain_transactions` enforces `CHECK (length(transaction_hash) = 64)`,
/// so any test that writes a Transfer or `SetAllowance` must use a 64-char string.
pub const TRANSFER_DEPLOY_HASH: &str =
    "0000000000000000000000000000000000000000000000000000000000005678";

/// Disable Row Level Security for all indexer-owned tables.
///
/// Mirrors the helper in `backfill_ico.rs` — needed because Supabase migrations
/// enable RLS and `sqlx::test` connections have no auth context.
pub async fn disable_rls(pool: &PgPool) {
    for table in [
        "blockchain_events",
        "blockchain_transactions",
        "ico_purchases",
        "token_holdings",
    ] {
        sqlx::query(&format!(r"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY"))
            .execute(pool)
            .await
            .unwrap_or_else(|e| panic!("failed to disable RLS on {table}: {e}"));
    }
}

/// Minimal `IndexerConfig` pointing at the given mock server URL.
pub fn test_config(rest_url: String) -> IndexerConfig {
    IndexerConfig {
        database_url: "postgres://localhost/test".to_owned().into(),
        casper: Casper {
            api_token: "test-token".to_owned().into(),
            rest_url,
            wss_url: "wss://test".to_owned(),
        },
        contracts: ContractRegistry::default(),
        backfill_rate_limit_ms: 0,
        wss_reconnect_delay_ms: 0,
    }
}
