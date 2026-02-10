//! Rust types for all smart contract events emitted on Casper Network.
//!
//! Each struct mirrors the fields of the corresponding Odra `#[odra::event]`.
//! Large numeric values (`U256`, `U128`) and Casper `Key` addresses are stored
//! as [`String`] so they serialize cleanly into `JSONB` columns and JSON API
//! responses.

use core::fmt::{Display, Formatter, Result as FmtResult};
use serde::{Deserialize, Deserializer, Serialize, de};

// -----------------------------------------------------------------------------
// Top-level event envelope
// -----------------------------------------------------------------------------

/// Every indexed event, regardless of which contract emitted it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum IndexedEvent {
    // ICO events:
    /// A user purchased BIG tokens during an ICO round.
    TokensPurchased(TokensPurchased),
    /// A new ICO schedule (sale round) was registered.
    IcoScheduleAdded(IcoScheduleAdded),
    /// A payment currency was enabled for ICO purchases.
    CurrencyAdded(CurrencyAdded),
    /// A payment currency was disabled for ICO purchases.
    CurrencyRemoved(CurrencyRemoved),
    /// Unsold tokens were withdrawn from a completed ICO round.
    UnsoldTokensWithdrawn(UnsoldTokensWithdrawn),

    // Escrow events:
    /// A new invoice was created in the escrow contract.
    InvoiceCreated(InvoiceCreated),
    /// An invoice was paid by the tenant.
    InvoicePaid(InvoicePaid),
    /// The minimum invoice deadline was changed.
    MinDeadlineSet(MinDeadlineSet),

    // Lease events:
    /// A new lease agreement was created on-chain.
    LeaseAgreementCreated(LeaseAgreementCreated),
    /// A lease agreement was finished.
    LeaseAgreementFinished(LeaseAgreementFinished),
    /// A lease agreement was prolonged.
    LeaseAgreementProlonged(LeaseAgreementProlonged),

    // NFT (CEP-95) events:
    /// A new property NFT was minted.
    NftMint(NftMint),
    /// A property NFT was burned.
    NftBurn(NftBurn),
    /// A property NFT was transferred.
    NftTransfer(NftTransfer),
    /// An account was approved to manage a specific NFT.
    NftApproval(NftApproval),
    /// An operator was approved to manage all NFTs of an owner.
    NftApprovalForAll(NftApprovalForAll),
    /// Approval for a specific NFT was revoked.
    NftRevokeApproval(NftRevokeApproval),
    /// Operator approval for all NFTs was revoked.
    NftRevokeApprovalForAll(NftRevokeApprovalForAll),
    /// NFT metadata was updated.
    NftMetadataUpdate(NftMetadataUpdate),
    /// A new minter was authorized on the NFT contract.
    NftMinterAdded(NftMinterAdded),
    /// A minter was removed from the NFT contract.
    NftMinterRemoved(NftMinterRemoved),
    /// A new burner was authorized on the NFT contract.
    NftBurnerAdded(NftBurnerAdded),
    /// A burner was removed from the NFT contract.
    NftBurnerRemoved(NftBurnerRemoved),

    // CEP-18 tokens (BIG / tUSDC / tUSDT) events:
    /// A direct CEP-18 token transfer.
    Cep18Transfer(Cep18Transfer),
    /// A delegated CEP-18 token transfer.
    Cep18TransferFrom(Cep18TransferFrom),
    /// New CEP-18 tokens were minted.
    Cep18Mint(Cep18Mint),
    /// CEP-18 tokens were burned.
    Cep18Burn(Cep18Burn),
    /// CEP-18 spending allowance was set.
    Cep18SetAllowance(Cep18SetAllowance),
    /// CEP-18 spending allowance was increased.
    Cep18IncreaseAllowance(Cep18IncreaseAllowance),
    /// CEP-18 spending allowance was decreased.
    Cep18DecreaseAllowance(Cep18DecreaseAllowance),

    // Treasury events:
    /// Rewards were deposited into the treasury.
    RewardsDeposited(RewardsDeposited),
    /// Reserves were withdrawn from the treasury.
    ReservesWithdrawn(ReservesWithdrawn),
    /// A token was withdrawn from the treasury.
    TokenWithdrawn(TokenWithdrawn),

    // Roles events:
    /// A role was granted to an address.
    RoleGranted(RoleGranted),
    /// A role was revoked from an address.
    RoleRevoked(RoleRevoked),
    /// The admin role for a given role was changed.
    RoleAdminChanged(RoleAdminChanged),

    // Shared events:
    /// Contract ownership was transferred.
    OwnershipTransferred(OwnershipTransferred),

    // Fallback:
    /// Event that we received but could not map to a known type.
    /// Raw data is preserved so nothing is lost.
    Unknown {
        /// CES event name as reported by the contract.
        event_name: String,
        /// Raw event payload preserved as JSON.
        raw_data: serde_json::Value,
    },
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/// ICO payment currency discriminant (matches the on-chain `Currency` enum).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum Currency {
    /// Native CSPR token.
    Cspr,
    /// USDC stablecoin (CEP-18).
    Usdc,
    /// USDT stablecoin (CEP-18).
    Usdt,
}

impl Currency {
    /// Map from the on-chain u8 discriminant.
    #[inline]
    #[must_use]
    pub fn from_discriminant(d: u8) -> Option<Self> {
        match d {
            0 => Some(Self::Cspr),
            1 => Some(Self::Usdc),
            2 => Some(Self::Usdt),
            _ => None,
        }
    }

    /// Human-readable label used in database records.
    #[must_use]
    #[inline]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Cspr => "CSPR",
            Self::Usdc => "USDC",
            Self::Usdt => "USDT",
        }
    }
}

impl Display for Currency {
    #[inline]
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        f.write_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for Currency {
    #[inline]
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_any(CurrencyVisitor)
    }
}

/// Visitor that accepts both numeric discriminants and string labels.
struct CurrencyVisitor;

impl de::Visitor<'_> for CurrencyVisitor {
    type Value = Currency;

    fn expecting(&self, f: &mut Formatter<'_>) -> FmtResult {
        f.write_str("a currency discriminant (0–2) or label (\"CSPR\", \"USDC\", \"USDT\")")
    }

    fn visit_i64<E: de::Error>(self, v: i64) -> Result<Currency, E> {
        let disc = u8::try_from(v).map_err(E::custom)?;
        Currency::from_discriminant(disc)
            .ok_or_else(|| E::custom(format!("unknown currency discriminant: {v}")))
    }

    fn visit_u64<E: de::Error>(self, v: u64) -> Result<Currency, E> {
        let disc = u8::try_from(v).map_err(E::custom)?;
        Currency::from_discriminant(disc)
            .ok_or_else(|| E::custom(format!("unknown currency discriminant: {v}")))
    }

    fn visit_str<E: de::Error>(self, v: &str) -> Result<Currency, E> {
        match v.to_ascii_lowercase().as_str() {
            "cspr" => Ok(Currency::Cspr),
            "usdc" | "tusdc" => Ok(Currency::Usdc),
            "usdt" | "tusdt" => Ok(Currency::Usdt),
            _ => Err(E::custom(format!("unknown currency: {v}"))),
        }
    }
}

// -----------------------------------------------------------------------------
// ICO events
// -----------------------------------------------------------------------------

/// A user purchased BIG tokens during an ICO round.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokensPurchased {
    /// Number of BIG tokens purchased (U256 as string).
    pub amount: String,
    /// Payment currency.
    pub currency: Currency,
    /// Token price at the time of purchase (U256 as string).
    pub price: String,
    /// Total cost paid by the buyer (U256 as string).
    pub cost: String,
    /// Block timestamp of the purchase.
    pub timestamp: u64,
}

/// A new ICO schedule (sale round) was registered.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcoScheduleAdded {
    /// Schedule identifier (U128 as string).
    pub id: String,
}

/// A payment currency was enabled for ICO purchases.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrencyAdded {
    /// The currency that was enabled.
    pub currency: Currency,
}

/// A payment currency was disabled for ICO purchases.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrencyRemoved {
    /// The currency that was disabled.
    pub currency: Currency,
}

/// Unsold tokens from a completed ICO round were withdrawn by the owner.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnsoldTokensWithdrawn {
    /// Recipient Casper address (Key as string).
    pub recipient: String,
    /// Amount of tokens withdrawn (U256 as string).
    pub amount: String,
}

// -----------------------------------------------------------------------------
// Escrow events
// -----------------------------------------------------------------------------

/// A new invoice (rent or security deposit) was created in the escrow.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceCreated {
    /// Invoice identifier (U256 as string).
    pub invoice_id: String,
    /// Block timestamp when the invoice was created.
    pub created_at: u64,
}

/// An invoice was paid by the tenant.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoicePaid {
    /// Invoice identifier (U256 as string).
    pub invoice_id: String,
    /// Block timestamp when payment was confirmed.
    pub paid_at: u64,
}

/// The minimum invoice deadline was changed by the contract owner.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinDeadlineSet {
    /// Previous minimum deadline (seconds).
    pub old_min_deadline: u64,
    /// New minimum deadline (seconds).
    pub new_min_deadline: u64,
}

// -----------------------------------------------------------------------------
// Lease events
// -----------------------------------------------------------------------------

/// A new lease agreement was created on-chain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseAgreementCreated {
    /// Lease agreement identifier (U256 as string).
    pub lease_agreement_id: String,
    /// Block timestamp when the agreement was created.
    pub created_at: u64,
}

/// A lease agreement was finished (tenant moved out or term ended).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseAgreementFinished {
    /// Lease agreement identifier (U256 as string).
    pub lease_agreement_id: String,
    /// Block timestamp when the agreement was finished.
    pub finished_at: u64,
}

/// A lease agreement was prolonged (extended for another term).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseAgreementProlonged {
    /// Lease agreement identifier (U256 as string).
    pub lease_agreement_id: String,
    /// Block timestamp when the extension was recorded.
    pub prolonged_at: u64,
}

// -----------------------------------------------------------------------------
// NFT events (CEP-95)
// -----------------------------------------------------------------------------

/// A new property NFT was minted.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftMint {
    /// Recipient address (Key as string).
    pub to: String,
    /// NFT token identifier (U256 as string).
    pub token_id: String,
}

/// A property NFT was burned (removed from circulation).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftBurn {
    /// Owner whose token was burned (Key as string).
    pub from: String,
    /// NFT token identifier (U256 as string).
    pub token_id: String,
}

/// A property NFT was transferred between accounts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftTransfer {
    /// Previous owner (Key as string).
    pub from: String,
    /// New owner (Key as string).
    pub to: String,
    /// NFT token identifier (U256 as string).
    pub token_id: String,
}

/// An account was approved to manage a specific NFT.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftApproval {
    /// Token owner (Key as string).
    pub owner: String,
    /// Approved spender (Key as string).
    pub spender: String,
    /// NFT token identifier (U256 as string).
    pub token_id: String,
}

/// An operator was approved to manage all NFTs of an owner.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftApprovalForAll {
    /// Token owner (Key as string).
    pub owner: String,
    /// Approved operator (Key as string).
    pub operator: String,
}

/// Approval for a specific NFT was revoked.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftRevokeApproval {
    /// Token owner (Key as string).
    pub owner: String,
    /// Revoked spender (Key as string).
    pub spender: String,
    /// NFT token identifier (U256 as string).
    pub token_id: String,
}

/// Operator approval for all NFTs was revoked.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftRevokeApprovalForAll {
    /// Token owner (Key as string).
    pub owner: String,
    /// Revoked operator (Key as string).
    pub operator: String,
}

/// NFT metadata was updated (e.g. property valuation change).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftMetadataUpdate {
    /// NFT token identifier (U256 as string).
    pub token_id: String,
}

/// A new minter was authorized on the NFT contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftMinterAdded {
    /// Minter address (Key as string).
    pub minter: String,
}

/// A minter was removed from the NFT contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftMinterRemoved {
    /// Minter address (Key as string).
    pub minter: String,
}

/// A new burner was authorized on the NFT contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftBurnerAdded {
    /// Burner address (Key as string).
    pub burner: String,
}

/// A burner was removed from the NFT contract.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftBurnerRemoved {
    /// Burner address (Key as string).
    pub burner: String,
}

// -----------------------------------------------------------------------------
// CEP-18 token events (shared by BIG, tUSDC, tUSDT)
// -----------------------------------------------------------------------------

/// A direct token transfer between two accounts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cep18Transfer {
    /// Sender address (Key as string).
    pub sender: String,
    /// Recipient address (Key as string).
    pub recipient: String,
    /// Amount transferred (U256 as string).
    pub amount: String,
}

/// A delegated transfer (spender moves tokens on behalf of the owner).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cep18TransferFrom {
    /// Account that initiated the transfer (Key as string).
    pub spender: String,
    /// Token owner (Key as string).
    pub owner: String,
    /// Recipient address (Key as string).
    pub recipient: String,
    /// Amount transferred (U256 as string).
    pub amount: String,
}

/// New tokens were minted.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cep18Mint {
    /// Recipient of newly minted tokens (Key as string).
    pub recipient: String,
    /// Amount minted (U256 as string).
    pub amount: String,
}

/// Tokens were burned (removed from circulation).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cep18Burn {
    /// Owner whose tokens were burned (Key as string).
    pub owner: String,
    /// Amount burned (U256 as string).
    pub amount: String,
}

/// Spending allowance was set to an exact value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cep18SetAllowance {
    /// Token owner (Key as string).
    pub owner: String,
    /// Authorised spender (Key as string).
    pub spender: String,
    /// New allowance value (U256 as string).
    pub allowance: String,
}

/// Spending allowance was increased.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cep18IncreaseAllowance {
    /// Token owner (Key as string).
    pub owner: String,
    /// Authorised spender (Key as string).
    pub spender: String,
    /// New total allowance after increase (U256 as string).
    pub allowance: String,
    /// Amount by which the allowance was increased (U256 as string).
    pub inc_by: String,
}

/// Spending allowance was decreased.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cep18DecreaseAllowance {
    /// Token owner (Key as string).
    pub owner: String,
    /// Authorised spender (Key as string).
    pub spender: String,
    /// New total allowance after decrease (U256 as string).
    pub allowance: String,
    /// Amount by which the allowance was decreased (U256 as string).
    pub decr_by: String,
}

// -----------------------------------------------------------------------------
// Treasury events
// -----------------------------------------------------------------------------

/// Rewards (dividends) were deposited into the treasury for distribution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardsDeposited {
    /// Amount deposited (U256 as string).
    pub amount: String,
}

/// Reserve funds were withdrawn by the treasury owner.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReservesWithdrawn {
    /// Recipient address (Key as string).
    pub recipient: String,
    /// Amount withdrawn (U256 as string).
    pub amount: String,
}

/// A specific token was withdrawn from the treasury.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenWithdrawn {
    /// Token contract address, `None` for native CSPR (Option<Key> as optional string).
    pub token: Option<String>,
    /// Amount withdrawn (U256 as string).
    pub amount: String,
    /// Recipient address (Key as string).
    pub recipient: String,
}

// -----------------------------------------------------------------------------
// Roles events
// -----------------------------------------------------------------------------

/// A role was granted to an address (e.g. landlord, agent, manager).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleGranted {
    /// Role identifier (32-byte hash, hex-encoded).
    pub role: String,
    /// Address that received the role (Key as string).
    pub address: String,
    /// Address that granted the role (Key as string).
    pub sender: String,
}

/// A role was revoked from an address.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleRevoked {
    /// Role identifier (32-byte hash, hex-encoded).
    pub role: String,
    /// Address that lost the role (Key as string).
    pub address: String,
    /// Address that revoked the role (Key as string).
    pub sender: String,
}

/// The admin role for a given role was changed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleAdminChanged {
    /// Role whose admin was changed (32-byte hash, hex-encoded).
    pub role: String,
    /// Previous admin role (32-byte hash, hex-encoded).
    pub previous_admin_role: String,
    /// New admin role (32-byte hash, hex-encoded).
    pub new_admin_role: String,
}

// -----------------------------------------------------------------------------
// Shared events
// -----------------------------------------------------------------------------

/// Contract ownership was transferred (emitted by multiple contracts).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OwnershipTransferred {
    /// Previous owner (Key as string), `None` if this is initial ownership.
    pub previous_owner: Option<String>,
    /// New owner (Key as string), `None` if ownership was renounced.
    pub new_owner: Option<String>,
}

// -----------------------------------------------------------------------------
// Event metadata wrapper (used by the processor)
// -----------------------------------------------------------------------------

/// Complete context for a single event ready for processing.
#[derive(Debug, Clone)]
pub struct EventEnvelope {
    /// Which contract emitted this event.
    pub contract_type: crate::config::ContractType,
    /// On-chain contract package hash (hex, no `hash-` prefix).
    pub contract_hash: String,
    /// Deploy hash of the transaction that emitted the event.
    pub deploy_hash: String,
    /// Block height at which deploy was included.
    pub block_height: u64,
    /// Public key of the account that submitted deploy.
    pub caller: String,
    /// Name of the event as it appears in the CES schema.
    pub event_name: String,
    /// The parsed event payload.
    pub event: IndexedEvent,
}
