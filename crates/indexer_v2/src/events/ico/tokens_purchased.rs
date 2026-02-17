//! ICO `TokensPurchased` event implementation.

use serde::{Deserialize, Serialize};

use crate::{
    config::ContractType,
    db,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
};

/// A user purchased BIG tokens during an ICO round.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokensPurchased {
    /// Number of BIG tokens purchased (U256 as string).
    pub amount: String,
    /// Payment currency (0=CSPR, 1=USDC, 2=USDT).
    pub currency: u8,
    /// Token price at the time of purchase (U256 as string).
    pub price: String,
    /// Total cost paid by the buyer (U256 as string).
    pub cost: String,
    /// Block timestamp of the purchase.
    pub timestamp: u64,
}

impl TokensPurchased {
    /// Convert currency discriminant to string label.
    #[inline]
    fn currency_str(&self) -> &'static str {
        match self.currency {
            0 => "CSPR",
            1 => "USDC",
            2 => "USDT",
            _ => "UNKNOWN",
        }
    }
}

impl IndexableEvent for TokensPurchased {
    const EVENT_NAME: &'static str = "TokensPurchased";

    #[inline]
    async fn process(&self, ctx: &EventContext<'_>) -> IndexerResult<()> {
        let mut tx = ctx.db_pool.begin().await?;

        // 1. Insert into ico_purchases table
        db::insert_ico_purchase(
            &mut tx,
            &db::NewIcoPurchase {
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height,
                buyer_address: ctx.caller,
                amount: &self.amount,
                currency: self.currency_str(),
                price: &self.price,
                cost: &self.cost,
                event_timestamp: self.timestamp.cast_signed(),
            },
        )
        .await?;

        // 2. Insert into blockchain_transactions
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            &mut tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height,
                transaction_type: "token_purchase",
                from_address: ctx.caller,
                amount: Some(&self.cost),
                currency: Some(self.currency_str()),
                metadata: &event_json,
            },
        )
        .await?;

        // Increase buyer's BIG token balance.
        db::update_token_balance(
            &mut tx,
            ctx.caller,
            ContractType::Big,
            db::BalanceUpdate::Increase(&self.amount),
        )
        .await?;

        tx.commit().await?;

        tracing::debug!(
            deploy = %ctx.deploy_hash,
            buyer = %ctx.caller,
            amount = %self.amount,
            currency = %self.currency_str(),
            "ICO purchase processed, BIG balance updated"
        );

        Ok(())
    }
}
