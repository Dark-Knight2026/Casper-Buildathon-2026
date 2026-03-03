//! ICO `TokensPurchased` event implementation.

use serde::{Deserialize, Serialize};

use crate::{
    address,
    config::ContractType,
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db::{self, HashType},
};

/// Payment currency used in an ICO purchase (deserialized from `u8` discriminant).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "u8", into = "u8")]
pub enum Currency {
    /// Casper native token.
    CSPR,
    /// USD Coin stablecoin.
    USDC,
    /// Tether stablecoin.
    USDT,
    /// Unrecognised currency discriminant.
    Unknown(u8),
}

impl From<u8> for Currency {
    #[inline]
    fn from(value: u8) -> Self {
        match value {
            0 => Self::CSPR,
            1 => Self::USDC,
            2 => Self::USDT,
            other => Self::Unknown(other),
        }
    }
}

impl From<Currency> for u8 {
    #[inline]
    fn from(value: Currency) -> Self {
        match value {
            Currency::CSPR => 0,
            Currency::USDC => 1,
            Currency::USDT => 2,
            Currency::Unknown(v) => v,
        }
    }
}

impl Currency {
    /// Returns the string label for this currency.
    #[inline]
    #[must_use]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::CSPR => "CSPR",
            Self::USDC => "USDC",
            Self::USDT => "USDT",
            Self::Unknown(_) => "UNKNOWN",
        }
    }
}

/// A user purchased BIG tokens during an ICO round.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokensPurchased {
    /// Number of BIG tokens purchased (U256 as string).
    pub amount: String,
    /// Payment currency.
    pub currency: Currency,
    /// Token price at the time of purchase (U256 as string).
    /// `None` when reconstructed via backfill (price unavailable from node RPC).
    #[serde(default)]
    pub price: Option<String>,
    /// Total cost paid by the buyer (U256 as string).
    pub cost: String,
    /// Block timestamp of the purchase.
    pub timestamp: u64,
}

impl IndexableEvent for TokensPurchased {
    const EVENT_NAME: &'static str = "TokensPurchased";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        // Normalize caller address to 64-char lowercase hex account hash.
        let buyer = address::normalize_to_account_hash(ctx.caller)?;

        // 1. Insert into ico_purchases table
        db::insert_ico_purchase(
            ctx.tx,
            &db::NewIcoPurchase {
                transaction_hash: ctx.deploy_hash,
                block_height: ctx.block_height.cast_signed(),
                buyer_address: &buyer,
                amount: &self.amount,
                currency: self.currency.as_str(),
                price: self.price.as_deref(),
                cost: &self.cost,
                event_timestamp: self.timestamp.cast_signed(),
            },
        )
        .await?;

        // 2. Insert into blockchain_transactions
        // Payment flow: buyer (Account) -> ICO contract (Contract).
        let event_json = serde_json::to_value(self)?;
        db::insert_blockchain_transaction(
            ctx.tx,
            &db::NewBlockchainTx {
                deploy_hash: ctx.deploy_hash,
                block_number: ctx.block_height.cast_signed(),
                transaction_type: "token_purchase",
                from_address: &buyer,
                to_address: Some(ctx.contract_hash),
                amount: Some(&self.cost),
                currency: Some(self.currency.as_str()),
                contract_hash: Some(ctx.contract_hash),
                block_timestamp: ctx.block_timestamp,
                from_type: HashType::Account.to_db(),
                to_type: HashType::Contract.to_db(),
                transform_idx: ctx.transform_idx,
                metadata: &event_json,
            },
        )
        .await?;

        // Increase buyer's BIG token balance.
        db::update_token_balance(
            ctx.tx,
            &buyer,
            ContractType::Big,
            db::BalanceUpdate::Increase(&self.amount),
        )
        .await?;

        tracing::debug!(
            deploy = %ctx.deploy_hash,
            buyer = %buyer,
            amount = %self.amount,
            currency = %self.currency.as_str(),
            "ICO purchase processed, BIG balance updated"
        );

        Ok(())
    }
}
