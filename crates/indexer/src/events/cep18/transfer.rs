//! CEP-18 Transfer event implementation (for BIG token).

use serde::{Deserialize, Serialize};

use crate::{
    address,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, BalanceUpdate, HashType, NewBlockchainTx},
};

/// A direct token transfer between two accounts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transfer {
    /// Sender address (Key as string).
    pub sender: String,
    /// Recipient address (Key as string).
    pub recipient: String,
    /// Amount transferred (U256 as string).
    pub amount: String,
}

impl IndexableEvent for Transfer {
    const EVENT_NAME: &'static str = "Transfer";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        // Normalize addresses to 64-char lowercase hex account hashes.
        let sender = address::normalize_to_account_hash(&self.sender)?;
        let recipient = address::normalize_to_account_hash(&self.recipient)?;

        // Determine address types via contract registry lookup.
        let from_type = HashType::lookup(&sender, ctx.known_contract_hashes);
        let to_type = HashType::lookup(&recipient, ctx.known_contract_hashes);

        // Insert into blockchain_transactions (event_json keeps raw event data).
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_transfer",
                from_address: &sender,
                to_address: Some(&recipient),
                amount: Some(&self.amount),
                currency: None,
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: from_type.to_db(),
                to_type: to_type.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        // Decrease sender balance, increase recipient balance.
        db::update_token_balance(
            ctx.tx,
            &sender,
            ctx.contract_type,
            BalanceUpdate::Decrease(&self.amount),
        )
        .await?;
        db::update_token_balance(
            ctx.tx,
            &recipient,
            ctx.contract_type,
            BalanceUpdate::Increase(&self.amount),
        )
        .await?;

        tracing::debug!(
            deploy = %ctx.deploy_hash,
            sender = %sender,
            recipient = %recipient,
            amount = %self.amount,
            contract = ?ctx.contract_type,
            "Token transfer processed, balances updated"
        );

        Ok(())
    }
}
