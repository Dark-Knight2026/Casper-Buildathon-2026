//! Handler for the `ICOScheduleAdded` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
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
    const EVENT_NAME: &'static str = "ICOScheduleAdded";

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

        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "ico_schedule_added",
                from_address: ctx.contract_hash,
                to_address: None,
                amount: None,
                currency: None,
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: HashType::Contract.to_db(),
                to_type: HashType::Contract.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
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
