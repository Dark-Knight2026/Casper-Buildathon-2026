//! CEP-18 `SetAllowance` event implementation.

use serde::{Deserialize, Serialize};

use crate::{
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Allowance approval — owner authorizes spender to transfer up to `amount`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetAllowance {
    /// Token owner who is granting the allowance.
    pub owner: String,
    /// Spender who is being authorized.
    pub spender: String,
    /// Approved amount (U256 as string).
    pub amount: String,
}

impl IndexableEvent for SetAllowance {
    const EVENT_NAME: &'static str = "SetAllowance";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_allowance",
                from_address: &self.owner,
                to_address: Some(&self.spender),
                amount: Some(&self.amount),
                currency: None,
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: None,
                to_type: None,
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        tracing::debug!(
            deploy = %ctx.deploy_hash,
            owner = %self.owner,
            spender = %self.spender,
            amount = %self.amount,
            contract = ?ctx.contract_type,
            "Token allowance set"
        );

        Ok(())
    }
}
