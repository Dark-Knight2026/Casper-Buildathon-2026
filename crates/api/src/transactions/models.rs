//! Request and response models for transaction history endpoints.

use serde::Serialize;
use utoipa::ToSchema;

/// A single blockchain transaction record.
#[derive(Debug, Serialize, ToSchema)]
pub struct TransactionDto {
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
    /// Fungible-token action type ID (1 = Mint, 2 = Transfer, 3 = Approve).
    pub ft_action_type_id: u8,
    /// Transform index within the deploy.
    pub transform_idx: Option<i32>,
}

/// Converts a DB `transaction_type` text label to a numeric action type ID.
///
/// Mapping (compatible with CSPR.cloud `/ft-token-action-types`):
/// - `"token_purchase"` -> 1 (Mint - tokens allocated to buyer)
/// - `"token_transfer"` -> 2 (Transfer)
/// - `"token_allowance"` -> 3 (Approve)
/// - anything else      -> 0 (Unknown)
#[inline]
#[must_use]
pub fn ft_action_type_id(transaction_type: &str) -> u8 {
    match transaction_type {
        "token_purchase" => 1,
        "token_transfer" => 2,
        "token_allowance" => 3,
        _ => 0,
    }
}
