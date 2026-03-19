//! Handler for the `UnstakedInitiated` staking contract event.

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::backfill::parser::{CesEvent, EventSchema, FieldType};
use crate::{
    address,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
};

/// Emitted when a staker initiates unstaking (starts the 48-hour unbonding period).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnstakedInitiated {
    /// Address of the staker.
    pub staker: String,
    /// Number of BIG tokens being unstaked (U256 as string).
    pub amount: String,
    /// Epoch ms when the unbonding period ends.
    pub unbonding_ends_at: u64,
}

impl CesEvent for UnstakedInitiated {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("staker", FieldType::Key),
            ("amount", FieldType::U256),
            ("unbonding_ends_at", FieldType::U64),
        ],
    };
}

impl IndexableEvent for UnstakedInitiated {
    const EVENT_NAME: &'static str = "UnstakedInitiated";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let staker = address::normalize_to_account_hash(&self.staker)?;

        // 1. UPDATE staking_positions: decrease staked_amount, set unbonding state.
        db::update_staking_position_unstake(
            ctx.tx,
            &staker,
            &self.amount,
            self.unbonding_ends_at.cast_signed(),
        )
        .await?;

        // 2. Insert staking event log.
        db::insert_staking_event(
            ctx.tx,
            &db::NewStakingEvent {
                staker_address: &staker,
                event_type: "unstake",
                amount: &self.amount,
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
                event_timestamp: ctx.block_timestamp.unwrap_or_else(Utc::now),
            },
        )
        .await?;

        // 3. Record in blockchain_transactions.
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_unstake",
                from_address: &staker,
                to_address: Some(ctx.contract_hash),
                amount: Some(&self.amount),
                currency: Some("BIG"),
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: HashType::Account.to_db(),
                to_type: HashType::Contract.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        tracing::info!(
            deploy = %ctx.deploy_hash,
            staker = %staker,
            amount = %self.amount,
            unbonding_ends_at = %self.unbonding_ends_at,
            "Unstake initiated"
        );

        Ok(())
    }
}
