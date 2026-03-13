//! Handler for the `ICOScheduleAdded` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted when a new ICO round schedule is added to the contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcoScheduleAdded {
    /// Schedule identifier from the contract.
    pub id: String,
    /// Unix timestamp: sale window start.
    pub start_timestamp: u64,
    /// Unix timestamp: sale window end.
    pub end_timestamp: u64,
    /// Total allocation for this round (U256 as string, minimal units, decimals=18).
    pub sale_amount: String,
    /// Token price (U256 as string, 6 decimals; 500000 = $0.50).
    pub price: String,
}

impl IndexableEvent for IcoScheduleAdded {
    const EVENT_NAME: &'static str = "IcoScheduleAdded";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        db::upsert_ico_schedule(
            ctx.tx,
            &db::NewIcoSchedule {
                schedule_id: &self.id,
                start_timestamp: self.start_timestamp.cast_signed(),
                end_timestamp: self.end_timestamp.cast_signed(),
                sale_amount: &self.sale_amount,
                price: &self.price,
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
            },
        )
        .await?;

        tracing::info!(
            schedule_id = %self.id,
            price = %self.price,
            sale_amount = %self.sale_amount,
            "Indexed ICO schedule"
        );

        Ok(())
    }
}
