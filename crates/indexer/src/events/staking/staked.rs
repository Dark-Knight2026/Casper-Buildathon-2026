//! Handler for the `Staked` staking contract event.

use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::{
    address,
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
};

/// Emitted when a user (or ICO contract via `stake_for`) stakes BIG tokens.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Staked {
    /// Address of the staker.
    pub staker: String,
    /// Number of BIG tokens staked (U256 as string).
    pub amount: String,
}

impl CesEvent for Staked {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[("staker", FieldType::Key), ("amount", FieldType::U256)],
    };
}

impl IndexableEvent for Staked {
    const EVENT_NAME: &'static str = "Staked";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let staker = address::normalize_casper_address(&self.staker)?;

        // 1. Insert staking event log (returns false if already processed).
        let is_new = db::insert_staking_event(
            ctx.tx,
            &db::NewStakingEvent {
                staker_address: &staker,
                event_type: "stake",
                amount: &self.amount,
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
                event_timestamp: ctx.block_timestamp.unwrap_or_else(Utc::now),
                transform_idx: ctx.transform_idx,
            },
        )
        .await?;

        // 2. UPSERT staking_positions only if this is a new event.
        // Skipping on duplicates prevents double-adding staked_amount
        // during replays or backfills.
        if is_new {
            db::upsert_staking_position_stake(ctx.tx, &staker, &self.amount).await?;
        }

        // 3. Record in blockchain_transactions.
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_stake",
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
            "Staked tokens indexed"
        );

        Ok(())
    }
}
