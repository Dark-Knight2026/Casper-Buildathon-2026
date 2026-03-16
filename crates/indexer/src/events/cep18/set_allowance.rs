//! CEP-18 `SetAllowance` event implementation.

use serde::{Deserialize, Serialize};

use crate::{
    address,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType, NewBlockchainTx},
};

/// Allowance approval — owner authorizes spender to transfer up to `amount`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetAllowance {
    /// Token owner who is granting the allowance.
    pub owner: String,
    /// Spender who is being authorized.
    pub spender: String,
    /// Approved amount (U256 as string).
    /// Some CEP-18 implementations emit this as `"allowance"` instead of `"amount"`.
    #[serde(alias = "allowance")]
    pub amount: String,
}

impl IndexableEvent for SetAllowance {
    const EVENT_NAME: &'static str = "SetAllowance";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        // Normalize addresses to 64-char lowercase hex account hashes.
        let owner = address::normalize_to_account_hash(&self.owner)?;
        let spender = address::normalize_to_account_hash(&self.spender)?;

        // Determine address types via contract registry lookup.
        let from_type = HashType::lookup(&owner, ctx.known_contract_hashes);
        let to_type = HashType::lookup(&spender, ctx.known_contract_hashes);

        // event_json keeps raw event data from self.
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_allowance",
                from_address: &owner,
                to_address: Some(&spender),
                amount: Some(&self.amount),
                currency: ctx.contract_type.currency_symbol(),
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: from_type.to_db(),
                to_type: to_type.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        tracing::debug!(
            deploy = %ctx.deploy_hash,
            owner = %owner,
            spender = %spender,
            amount = %self.amount,
            contract = ?ctx.contract_type,
            "Token allowance set"
        );

        Ok(())
    }
}
