//! Handler for the `RewardsClaimed` staking contract event.

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::{
    address,
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
};

/// Emitted when a staker claims accumulated rewards.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardsClaimed {
    /// Address of the staker who claimed.
    pub staker: String,
    /// Number of BIG tokens claimed as rewards (U256 as string).
    pub amount: String,
}

impl CesEvent for RewardsClaimed {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[("staker", FieldType::Key), ("amount", FieldType::U256)],
    };
}

impl IndexableEvent for RewardsClaimed {
    const EVENT_NAME: &'static str = "RewardsClaimed";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let staker = address::normalize_to_account_hash(&self.staker)?;

        // 1. Insert staking event log (reward_claim).
        db::insert_staking_event(
            ctx.tx,
            &db::NewStakingEvent {
                staker_address: &staker,
                event_type: "reward_claim",
                amount: &self.amount,
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
                event_timestamp: ctx.block_timestamp.unwrap_or_else(Utc::now),
            },
        )
        .await?;

        // 2. UPDATE staking_positions: increase total_rewards_claimed.
        db::update_staking_position_rewards(ctx.tx, &staker, &self.amount).await?;

        // 3. Record in blockchain_transactions.
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "rewards_claim",
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
            "Staking rewards claimed"
        );

        Ok(())
    }
}
