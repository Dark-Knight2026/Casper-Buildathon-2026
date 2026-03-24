//! CEP-18 Mint event implementation.

use serde::{Deserialize, Serialize};

use crate::{
    address,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, BalanceUpdate, HashType, NewBlockchainTx},
};

/// New tokens minted into circulation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mint {
    /// Recipient address (Key as string).
    pub recipient: String,
    /// Amount minted (U256 as string).
    pub amount: String,
}

impl IndexableEvent for Mint {
    const EVENT_NAME: &'static str = "Mint";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        let recipient = address::normalize_to_account_hash(&self.recipient)?;
        let to_type = HashType::lookup(&recipient, ctx.known_contract_hashes, ctx.api_to_type);

        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_mint",
                from_address: ctx.contract_hash,
                to_address: Some(&recipient),
                amount: Some(&self.amount),
                currency: ctx.contract_type.currency_symbol(),
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: HashType::Contract.to_db(),
                to_type: to_type.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
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
            recipient = %recipient,
            amount = %self.amount,
            contract = ?ctx.contract_type,
            "Token mint processed, balance updated"
        );

        Ok(())
    }
}
