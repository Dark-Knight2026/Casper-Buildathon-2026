//! Handler for the `RewardsDeposited` staking contract event.

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::backfill::parser::{CesEvent, EventSchema, FieldType};
use crate::{
    address,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
};

/// Emitted when the treasury deposits rewards into the staking pool.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardsDeposited {
    /// Address of the caller who deposited (usually treasury contract).
    pub caller: String,
    /// Number of BIG tokens deposited as rewards (U256 as string).
    pub amount: String,
}

impl CesEvent for RewardsDeposited {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[("caller", FieldType::Key), ("amount", FieldType::U256)],
    };
}

impl IndexableEvent for RewardsDeposited {
    const EVENT_NAME: &'static str = "RewardsDeposited";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let caller = address::normalize_to_account_hash(&self.caller)?;

        // 1. INSERT into staking_reward_deposits.
        db::insert_staking_reward_deposit(
            ctx.tx,
            &db::NewStakingRewardDeposit {
                caller_address: &caller,
                amount: &self.amount,
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
                event_timestamp: ctx.block_timestamp.unwrap_or_else(Utc::now),
            },
        )
        .await?;

        // 2. Record in blockchain_transactions.
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "rewards_deposit",
                from_address: &caller,
                to_address: Some(ctx.contract_hash),
                amount: Some(&self.amount),
                currency: Some("BIG"),
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: HashType::lookup(&caller, ctx.known_contract_hashes).to_db(),
                to_type: HashType::Contract.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        tracing::info!(
            deploy = %ctx.deploy_hash,
            caller = %caller,
            amount = %self.amount,
            "Staking rewards deposited"
        );

        Ok(())
    }
}
