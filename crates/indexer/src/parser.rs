//! CES (Contract Event Standard) event parser.
//!
//! Maps event names and JSON payloads received from the `CSPR.cloud` API
//! into strongly-typed [`IndexedEvent`] variants.
//!
//! ## Disambiguation
//!
//! Several CES event names are shared across contract types — for example,
//! `Transfer` appears in both CEP-18 tokens and CEP-95 NFTs with entirely
//! different field schemas.  The parser uses [`ContractType`] to select the
//! correct deserialization target.

use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::{
    config::ContractType,
    error::{IndexerError, IndexerResult},
    events::IndexedEvent,
};

/// Parse a CES event into a strongly-typed [`IndexedEvent`].
///
/// # Arguments
///
/// * `event_name` — CES event name as reported by the contract (e.g. `"TokensPurchased"`).
/// * `contract_type` — which contract emitted the event; used for disambiguation.
/// * `data` — JSON payload of the event (consumed during deserialization).
///
/// Unknown events are preserved as [`IndexedEvent::Unknown`] so no data is lost.
///
/// # Errors
///
/// Returns [`IndexerError::Parse`] if the JSON payload does not match the
/// expected schema for the given `(contract_type, event_name)` pair.
#[inline]
pub fn parse_event(
    event_name: &str,
    contract_type: ContractType,
    data: Value,
) -> IndexerResult<IndexedEvent> {
    match (contract_type, event_name) {
        // ICO
        (ContractType::Ico, "TokensPurchased") => try_parse(data, IndexedEvent::TokensPurchased),
        (ContractType::Ico, "ICOScheduleAdded") => try_parse(data, IndexedEvent::IcoScheduleAdded),
        (ContractType::Ico, "CurrencyAdded") => try_parse(data, IndexedEvent::CurrencyAdded),
        (ContractType::Ico, "CurrencyRemoved") => try_parse(data, IndexedEvent::CurrencyRemoved),
        (ContractType::Ico, "UnsoldTokensWithdrawn") => {
            try_parse(data, IndexedEvent::UnsoldTokensWithdrawn)
        }

        // Escrow
        (ContractType::Escrow, "InvoiceCreated") => try_parse(data, IndexedEvent::InvoiceCreated),
        (ContractType::Escrow, "InvoicePaid") => try_parse(data, IndexedEvent::InvoicePaid),
        (ContractType::Escrow, "MinDeadlineSet") => try_parse(data, IndexedEvent::MinDeadlineSet),

        // Lease
        (ContractType::Lease, "LeaseAgreementCreated") => {
            try_parse(data, IndexedEvent::LeaseAgreementCreated)
        }
        (ContractType::Lease, "LeaseAgreementFinished") => {
            try_parse(data, IndexedEvent::LeaseAgreementFinished)
        }
        (ContractType::Lease, "LeaseAgreementProlonged") => {
            try_parse(data, IndexedEvent::LeaseAgreementProlonged)
        }

        // NFT (CEP-95)
        (ContractType::Nft, "Mint") => try_parse(data, IndexedEvent::NftMint),
        (ContractType::Nft, "Burn") => try_parse(data, IndexedEvent::NftBurn),
        (ContractType::Nft, "Transfer") => try_parse(data, IndexedEvent::NftTransfer),
        (ContractType::Nft, "Approval") => try_parse(data, IndexedEvent::NftApproval),
        (ContractType::Nft, "ApprovalForAll") => try_parse(data, IndexedEvent::NftApprovalForAll),
        (ContractType::Nft, "RevokeApproval") => try_parse(data, IndexedEvent::NftRevokeApproval),
        (ContractType::Nft, "RevokeApprovalForAll") => {
            try_parse(data, IndexedEvent::NftRevokeApprovalForAll)
        }
        (ContractType::Nft, "MetadataUpdate") => try_parse(data, IndexedEvent::NftMetadataUpdate),
        (ContractType::Nft, "MinterAdded") => try_parse(data, IndexedEvent::NftMinterAdded),
        (ContractType::Nft, "MinterRemoved") => try_parse(data, IndexedEvent::NftMinterRemoved),
        (ContractType::Nft, "BurnerAdded") => try_parse(data, IndexedEvent::NftBurnerAdded),
        (ContractType::Nft, "BurnerRemoved") => try_parse(data, IndexedEvent::NftBurnerRemoved),

        // CEP-18 tokens (BIG / tUSDC / tUSDT)
        (ct, "Transfer") if ct.is_cep18_token() => try_parse(data, IndexedEvent::Cep18Transfer),
        (ct, "TransferFrom") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18TransferFrom)
        }
        (ct, "Mint") if ct.is_cep18_token() => try_parse(data, IndexedEvent::Cep18Mint),
        (ct, "Burn") if ct.is_cep18_token() => try_parse(data, IndexedEvent::Cep18Burn),
        (ct, "SetAllowance") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18SetAllowance)
        }
        (ct, "IncreaseAllowance") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18IncreaseAllowance)
        }
        (ct, "DecreaseAllowance") if ct.is_cep18_token() => {
            try_parse(data, IndexedEvent::Cep18DecreaseAllowance)
        }

        // Treasury
        (ContractType::Treasury, "RewardsDeposited") => {
            try_parse(data, IndexedEvent::RewardsDeposited)
        }
        (ContractType::Treasury, "ReservesWithdrawn") => {
            try_parse(data, IndexedEvent::ReservesWithdrawn)
        }
        (ContractType::Treasury, "TokenWithdrawn") => try_parse(data, IndexedEvent::TokenWithdrawn),

        // Roles
        (ContractType::Roles, "RoleGranted") => try_parse(data, IndexedEvent::RoleGranted),
        (ContractType::Roles, "RoleRevoked") => try_parse(data, IndexedEvent::RoleRevoked),
        (ContractType::Roles, "RoleAdminChanged") => {
            try_parse(data, IndexedEvent::RoleAdminChanged)
        }

        // Shared: OwnershipTransferred (emitted by many contracts)
        (_, "OwnershipTransferred") => try_parse(data, IndexedEvent::OwnershipTransferred),

        // Unknown / unrecognized event
        _ => {
            tracing::warn!(
                contract = %contract_type,
                event = event_name,
                "Unknown CES event, preserving raw data"
            );
            Ok(IndexedEvent::Unknown {
                event_name: event_name.to_owned(),
                raw_data: data,
            })
        }
    }
}

/// Deserialize a [`Value`] into a concrete event struct and wrap
/// it in the corresponding [`IndexedEvent`] variant.
fn try_parse<T: DeserializeOwned>(
    data: Value,
    wrap: fn(T) -> IndexedEvent,
) -> IndexerResult<IndexedEvent> {
    serde_json::from_value(data)
        .map(wrap)
        .map_err(|e| IndexerError::Parse(e.to_string()))
}
