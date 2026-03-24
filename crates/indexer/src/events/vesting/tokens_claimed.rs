//! Handler for the `TokensClaimed` vesting contract event.

use serde::{Deserialize, Serialize};

use crate::{
    address,
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
};

/// Emitted when a beneficiary claims vested tokens from a schedule.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokensClaimed {
    /// Vesting schedule ID that was claimed from (U256 as string).
    pub vesting_id: String,
    /// Address of the beneficiary who claimed.
    pub beneficiary: String,
    /// Number of tokens claimed (U256 as string).
    pub amount: String,
}

impl CesEvent for TokensClaimed {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("vesting_id", FieldType::U256),
            ("beneficiary", FieldType::Key),
            ("amount", FieldType::U256),
        ],
    };
}

impl IndexableEvent for TokensClaimed {
    const EVENT_NAME: &'static str = "TokensClaimed";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let beneficiary = address::normalize_to_account_hash(&self.beneficiary)?;

        // Guard: skip if this deployment was already processed (replay/backfill).
        // Without this check, replayed events would double-count claimed_amount.
        if db::is_vesting_claim_processed(ctx.tx, ctx.deploy_hash).await? {
            tracing::debug!(
                deploy_hash = %ctx.deploy_hash,
                "TokensClaimed already processed, skipping"
            );
            return Ok(());
        }

        db::update_vesting_claimed(ctx.tx, &self.vesting_id, &self.amount).await?;

        // Record in blockchain_transactions for unified transaction history.
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "vesting_tokens_claimed",
                from_address: &beneficiary,
                to_address: None,
                amount: Some(&self.amount),
                currency: Some("BIG"),
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: HashType::Account.to_db(),
                to_type: None,
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        tracing::info!(
            vesting_id = %self.vesting_id,
            beneficiary = %beneficiary,
            amount = %self.amount,
            "Vesting tokens claimed"
        );

        Ok(())
    }
}
