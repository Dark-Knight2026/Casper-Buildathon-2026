//! Handler for the `TokensClaimed` vesting contract event.

use serde::{Deserialize, Serialize};

use crate::{
    address,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
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

impl IndexableEvent for TokensClaimed {
    const EVENT_NAME: &'static str = "TokensClaimed";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let beneficiary = address::normalize_to_account_hash(&self.beneficiary)?;

        db::update_vesting_claimed(ctx.tx, &self.vesting_id, &self.amount).await?;

        tracing::info!(
            vesting_id = %self.vesting_id,
            beneficiary = %beneficiary,
            amount = %self.amount,
            "Vesting tokens claimed"
        );

        Ok(())
    }
}
