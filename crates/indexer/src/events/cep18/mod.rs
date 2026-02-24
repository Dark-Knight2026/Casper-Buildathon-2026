//! CEP-18 token standard events (BIG, tUSDC, tUSDT).

pub mod set_allowance;
pub mod transfer;

pub use set_allowance::SetAllowance;
pub use transfer::Transfer;

use core::{fmt, str::FromStr};

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

impl FromStr for Cep18EventType {
    /// The unrecognized event name that failed to parse.
    type Err = String;

    #[inline]
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Transfer" => Ok(Self::Transfer),
            "TransferFrom" => Ok(Self::TransferFrom),
            "Mint" => Ok(Self::Mint),
            "Burn" => Ok(Self::Burn),
            "SetAllowance" => Ok(Self::SetAllowance),
            "IncreaseAllowance" => Ok(Self::IncreaseAllowance),
            "DecreaseAllowance" => Ok(Self::DecreaseAllowance),
            _ => Err(s.to_owned()),
        }
    }
}

impl fmt::Display for Cep18EventType {
    #[inline]
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::Transfer => "Transfer",
            Self::TransferFrom => "TransferFrom",
            Self::Mint => "Mint",
            Self::Burn => "Burn",
            Self::SetAllowance => "SetAllowance",
            Self::IncreaseAllowance => "IncreaseAllowance",
            Self::DecreaseAllowance => "DecreaseAllowance",
        })
    }
}
