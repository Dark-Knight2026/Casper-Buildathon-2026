//! Handler for the `StakerSnapshot` staking contract event.
//!
//! Emitted after `stake_for()`, `unstake_for()`, and `claim_rewards()` to
//! provide the backend with the staker's current reward state. This is a
//! state snapshot, not a user action, so it does not write to `staking_events`
//! or `blockchain_transactions`.

use serde::{Deserialize, Serialize};

use crate::{
    address,
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Post-action snapshot of a staker's reward state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakerSnapshot {
    /// Address of the staker.
    pub staker: String,
    /// Currently staked BIG tokens after the action (U256 as string).
    pub staked_amount: String,
    /// Pending (unclaimed) rewards after the action (U256 as string).
    pub pending_rewards: String,
    /// Per-user `reward_per_token_paid` after the action (U256 as string).
    pub reward_per_token_paid: String,
}

impl CesEvent for StakerSnapshot {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("staker", FieldType::Key),
            ("staked_amount", FieldType::U256),
            ("pending_rewards", FieldType::U256),
            ("reward_per_token_paid", FieldType::U256),
        ],
    };
}

impl IndexableEvent for StakerSnapshot {
    const EVENT_NAME: &'static str = "StakerSnapshot";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let staker = address::normalize_casper_address(&self.staker)?;

        let rows = db::update_staker_reward_snapshot(
            ctx.tx,
            &staker,
            &self.pending_rewards,
            &self.reward_per_token_paid,
            ctx.block_height.cast_signed(),
        )
        .await?;

        if rows > 0 {
            tracing::info!(
                deploy = %ctx.deploy_hash,
                staker = %staker,
                pending_rewards = %self.pending_rewards,
                reward_per_token_paid = %self.reward_per_token_paid,
                "Staker snapshot recorded"
            );
        }

        Ok(())
    }
}
