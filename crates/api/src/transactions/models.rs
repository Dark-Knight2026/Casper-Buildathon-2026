//! Request and response models for transaction history endpoints.

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Transaction type filter for query parameters.
///
/// Deserializes from `snake_case` strings in query params
/// (e.g. `?type=token_transfer`).
#[derive(Debug, Clone, Copy, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TxType {
    /// ICO token purchase via CSPR/USDC/USDT.
    TokenPurchase,
    /// CEP-18 token transfer between accounts.
    TokenTransfer,
    /// CEP-18 token minting by contract.
    TokenMint,
    /// CEP-18 token allowance (approve).
    TokenAllowance,
}

impl TxType {
    /// Returns the database column value for this transaction type.
    #[inline]
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::TokenPurchase => "token_purchase",
            Self::TokenTransfer => "token_transfer",
            Self::TokenMint => "token_mint",
            Self::TokenAllowance => "token_allowance",
        }
    }
}

/// Address type discriminant for filtering by sender type.
///
/// Deserializes from integer in query params (e.g. `?from_type=1`).
#[derive(Debug, Clone, Copy, Deserialize, ToSchema)]
#[serde(from = "u8")]
pub enum HashType {
    /// Regular user account (0).
    Account,
    /// Smart contract (1).
    Contract,
    /// Unrecognised address type.
    Unknown(u8),
}

impl From<u8> for HashType {
    #[inline]
    fn from(value: u8) -> Self {
        match value {
            0 => Self::Account,
            1 => Self::Contract,
            other => Self::Unknown(other),
        }
    }
}

impl HashType {
    /// Returns the database `SMALLINT` value.
    #[inline]
    #[must_use]
    pub fn as_i16(self) -> i16 {
        match self {
            Self::Account => 0,
            Self::Contract => 1,
            Self::Unknown(v) => i16::from(v),
        }
    }
}

/// A single blockchain transaction record.
#[derive(Debug, Serialize, ToSchema)]
pub struct TransactionResponse {
    /// Deploy hash identifying the transaction on-chain.
    pub deploy_hash: String,
    /// Block height where the transaction was included.
    pub block_height: i64,
    /// Block timestamp in ISO 8601 format (e.g. `"2025-06-15T10:30:00Z"`).
    #[schema(example = "2025-06-15T10:30:00Z")]
    pub timestamp: Option<String>,
    /// Token amount (U256 as string in minimal units, decimals=18).
    #[schema(example = "1000000000000000000000")]
    pub amount: Option<String>,
    /// Payment currency (e.g. `"CSPR"`, `"USDC"`, `"USDT"`). Present for purchases.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    /// Contract package hash (64 hex, no prefix).
    pub contract_package_hash: Option<String>,
    /// Sender address (account hash, 64 hex, no prefix).
    pub from_hash: String,
    /// Sender address type (0 = Account, 1 = Contract).
    pub from_type: Option<i16>,
    /// Recipient address (account hash, 64 hex, no prefix).
    pub to_hash: Option<String>,
    /// Recipient address type (0 = Account, 1 = Contract).
    pub to_type: Option<i16>,
    /// Fungible-token action type ID (1 = Mint, 2 = Transfer, 3 = Approve, 4 = Purchase).
    pub ft_action_type_id: u8,
    /// Transform index within the deploy.
    pub transform_idx: Option<i32>,
}

/// Converts a DB `transaction_type` text label to a numeric action type ID.
///
/// Mapping (compatible with CSPR.cloud `/ft-token-action-types`):
/// - `"token_mint"`     -> 1 (Mint)
/// - `"token_transfer"` -> 2 (Transfer)
/// - `"token_allowance"` -> 3 (Approve)
/// - `"token_purchase"` -> 4 (Purchase)
/// - anything else      -> 0 (Unknown)
#[inline]
#[must_use]
pub fn ft_action_type_id(transaction_type: &str) -> u8 {
    match transaction_type {
        "token_mint" => 1,
        "token_transfer" => 2,
        "token_allowance" => 3,
        "token_purchase" => 4,
        _ => 0,
    }
}
