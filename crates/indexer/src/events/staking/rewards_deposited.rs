//! Handler for the `RewardsDeposited` staking contract event.

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::{
    address,
    backfill::parser::{CesEvent, EventSchema, FieldType},
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
    /// Global reward accumulator snapshot after this deposit (U256 as string).
    pub reward_per_token_stored: String,
}

impl CesEvent for RewardsDeposited {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("caller", FieldType::Key),
            ("amount", FieldType::U256),
            ("reward_per_token_stored", FieldType::U256),
        ],
    };
}

impl IndexableEvent for RewardsDeposited {
    const EVENT_NAME: &'static str = "RewardsDeposited";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let caller = address::normalize_casper_address(&self.caller)?;

        // INSERT into staking_reward_deposits.
        let is_new = db::insert_staking_reward_deposit(
            ctx.tx,
            &db::NewStakingRewardDeposit {
                caller_address: &caller,
                amount: &self.amount,
                reward_per_token_stored: &self.reward_per_token_stored,
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
                event_timestamp: ctx.block_timestamp.unwrap_or_else(Utc::now),
                transform_idx: ctx.transform_idx,
            },
        )
        .await?;

        // Update global reward state singleton only for new deposits.
        if is_new {
            db::update_global_reward_state(ctx.tx, &self.reward_per_token_stored).await?;
        }

        // Record in blockchain_transactions.
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
                from_type: HashType::lookup(&caller, ctx.known_contract_hashes, ctx.api_from_type)
                    .to_db(),
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
            reward_per_token_stored = %self.reward_per_token_stored,
            "Staking rewards deposited"
        );

        Ok(())
    }
}
