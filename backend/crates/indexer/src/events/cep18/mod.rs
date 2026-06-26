//! CEP-18 token standard events (BIG, tUSDC, tUSDT).

pub mod mint;
pub mod set_allowance;
pub mod transfer;

pub use mint::Mint;
pub use set_allowance::SetAllowance;
pub use transfer::Transfer;

use core::str::FromStr;

use crate::error::{IndexerError, IndexerResult};

/// All possible CEP-18 token events (BIG, USDC, USDT).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Cep18EventType {
    /// Direct token transfer from sender to recipient.
    Transfer,
    /// Transfer on behalf of another account (using allowance).
    TransferFrom,
    /// New tokens minted into circulation.
    Mint,
    /// Tokens removed from circulation.
    Burn,
    /// Allowance set to an exact value.
    SetAllowance,
    /// Allowance increased by a delta.
    IncreaseAllowance,
    /// Allowance decreased by a delta.
    DecreaseAllowance,
}

impl Cep18EventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Transfer => "Transfer",
            Self::TransferFrom => "TransferFrom",
            Self::Mint => "Mint",
            Self::Burn => "Burn",
            Self::SetAllowance => "SetAllowance",
            Self::IncreaseAllowance => "IncreaseAllowance",
            Self::DecreaseAllowance => "DecreaseAllowance",
        }
    }
}

impl FromStr for Cep18EventType {
    type Err = IndexerError;

    #[inline]
    fn from_str(s: &str) -> IndexerResult<Self> {
        match s {
            "Transfer" => Ok(Self::Transfer),
            "TransferFrom" => Ok(Self::TransferFrom),
            "Mint" => Ok(Self::Mint),
            "Burn" => Ok(Self::Burn),
            "SetAllowance" => Ok(Self::SetAllowance),
            "IncreaseAllowance" => Ok(Self::IncreaseAllowance),
            "DecreaseAllowance" => Ok(Self::DecreaseAllowance),
            _ => Err(IndexerError::InvalidEventName(s.to_owned())),
        }
    }
}
