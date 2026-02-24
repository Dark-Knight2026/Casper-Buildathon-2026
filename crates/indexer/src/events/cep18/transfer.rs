//! CEP-18 Transfer event implementation (for BIG token).

use serde::{Deserialize, Serialize};

use crate::{
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
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
    async fn process(&self, ctx: &EventContext<'_>) -> IndexerResult<()> {
        let mut tx = ctx.db_pool.begin().await?;

        // Insert into blockchain_transactions
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            &mut tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_transfer",
                from_address: &self.sender,
                amount: Some(&self.amount),
                currency: None, // Will be inferred from contract_type
                metadata: &event_json,
            },
        )
        .await?;

        // Decrease sender balance, increase recipient balance.
        db::update_token_balance(
            &mut tx,
            &self.sender,
            ctx.contract_type,
            db::BalanceUpdate::Decrease(&self.amount),
        )
        .await?;
        db::update_token_balance(
            &mut tx,
            &self.recipient,
            ctx.contract_type,
            db::BalanceUpdate::Increase(&self.amount),
        )
        .await?;

        tx.commit().await?;

        tracing::debug!(
            deploy = %ctx.deploy_hash,
            sender = %self.sender,
            recipient = %self.recipient,
            amount = %self.amount,
            contract = ?ctx.contract_type,
            "Token transfer processed, balances updated"
        );

        Ok(())
    }
}
