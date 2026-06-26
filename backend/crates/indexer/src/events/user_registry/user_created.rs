//! Handler for the `UserCreated` `UserRegistry` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    address,
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `UserRegistry::create_user` when a user is registered on-chain.
///
/// Reconciles the new on-chain record back to the backend account it belongs
/// to, recording the contract-assigned `user_id`. This is permanent, not a
/// stopgap: the contract assigns the id incrementally, so the indexer is how
/// the backend learns it regardless of who calls `create_user` (the frontend
/// today, a backend writer later).
///
/// Only `user_id` and `active_wallet` are indexed. Matching is by wallet (the
/// event carries no email or identity hash), and the business role already
/// lives on `users.role`. The contract's trailing `role_flags: u32` is left
/// out of the schema on purpose: it is the last emitted field, so the CES
/// binary parser stops before it, and `serde` ignores it on the JSON path -
/// avoiding a `FieldType::U32` we would otherwise have to add for a value we
/// never store.
///
/// Matching canonicalises both sides to an account hash: the event's
/// `active_wallet` is a Casper account hash, while `users.wallet_address`
/// stores a public key (66/68 hex). The wallet-link path caches the derived
/// account hash on `users.account_hash` (indexed), so the common case is a
/// direct lookup; rows linked before that cache existed fall back to deriving
/// each remaining un-hashed wallet, which stays representation-agnostic.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCreated {
    /// Contract-assigned user id (U256 rendered as a decimal string).
    pub user_id: String,
    /// Wallet registered as the user's active wallet on-chain.
    pub active_wallet: String,
}

impl CesEvent for UserCreated {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("user_id", FieldType::U256),
            ("active_wallet", FieldType::Key),
        ],
    };
}

impl IndexableEvent for UserCreated {
    const EVENT_NAME: &'static str = "UserCreated";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let target_account_hash = address::normalize_casper_address(&self.active_wallet)?;

        // Fast path: the wallet-link insert caches each wallet's account hash on
        // the indexed `users.account_hash`, so the match is a direct lookup.
        if db::set_user_onchain_id_by_account_hash(ctx.tx, &target_account_hash, &self.user_id)
            .await?
        {
            tracing::info!(
                onchain_user_id = %self.user_id,
                account_hash = %target_account_hash,
                "Linked on-chain user id to backend account"
            );
            return Ok(());
        }

        // Fallback: rows linked before the `account_hash` cache existed keep it
        // NULL and miss the indexed UPDATE. Derive the hash for that shrinking
        // legacy set and match by wallet; new links never reach here.
        let legacy = db::fetch_legacy_unregistered_wallets(ctx.tx).await?;
        for wallet in legacy {
            if address::normalize_casper_address(&wallet)? == target_account_hash {
                db::set_user_onchain_id(ctx.tx, &wallet, &self.user_id).await?;
                tracing::info!(
                    onchain_user_id = %self.user_id,
                    account_hash = %target_account_hash,
                    "Linked on-chain user id to backend account (legacy wallet)"
                );
                return Ok(());
            }
        }

        // No account caches or derives to this hash yet (or it was already
        // reconciled). Not an error: the backend state simply has not caught up,
        // so we skip rather than fail the whole event.
        tracing::warn!(
            onchain_user_id = %self.user_id,
            account_hash = %target_account_hash,
            "UserCreated has no matching unlinked account; skipping"
        );
        Ok(())
    }
}
