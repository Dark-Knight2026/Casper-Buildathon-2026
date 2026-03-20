//! Handler for the `UnbondedWithdrawn` staking contract event.

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::{
    address,
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
};

/// Emitted when the unbonding period completes and tokens are withdrawn.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnbondedWithdrawn {
    /// Address of the staker.
    pub staker: String,
    /// Number of BIG tokens withdrawn (U256 as string).
    pub amount: String,
}

impl CesEvent for UnbondedWithdrawn {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[("staker", FieldType::Key), ("amount", FieldType::U256)],
    };
}

impl IndexableEvent for UnbondedWithdrawn {
    const EVENT_NAME: &'static str = "UnbondedWithdrawn";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let staker = address::normalize_to_account_hash(&self.staker)?;

        // 1. Insert staking event log (deduplicates via ON CONFLICT DO NOTHING).
        let _is_new = db::insert_staking_event(
            ctx.tx,
            &db::NewStakingEvent {
                staker_address: &staker,
                event_type: "withdraw",
                amount: &self.amount,
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
                event_timestamp: ctx.block_timestamp.unwrap_or_else(Utc::now),
            },
        )
        .await?;

        // 2. UPDATE staking_positions: clear unbonding state.
        // This is idempotent (sets to zero), so no guard needed.
        db::update_staking_position_withdraw(ctx.tx, &staker).await?;

        // 3. Record in blockchain_transactions.
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_withdraw",
                from_address: ctx.contract_hash,
                to_address: Some(&staker),
                amount: Some(&self.amount),
                currency: Some("BIG"),
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: HashType::Contract.to_db(),
                to_type: HashType::Account.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        tracing::info!(
            deploy = %ctx.deploy_hash,
            staker = %staker,
            amount = %self.amount,
            "Unbonded tokens withdrawn"
        );

        Ok(())
    }
}
