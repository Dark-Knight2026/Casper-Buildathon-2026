//! ICO contract events.

pub mod tokens_purchased;

pub use tokens_purchased::TokensPurchased;

use core::{fmt, str::FromStr};

/// All possible ICO contract events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IcoEventType {
    /// Emitted when a user purchases tokens during the ICO.
    TokensPurchased,
    /// Emitted when a new vesting schedule is added.
    IcoScheduleAdded,
    /// Emitted when a new payment currency is enabled.
    CurrencyAdded,
    /// Emitted when a payment currency is disabled.
    CurrencyRemoved,
    /// Emitted when unsold tokens are withdrawn after ICO ends.
    UnsoldTokensWithdrawn,
}

impl FromStr for IcoEventType {
    /// The unrecognized event name that failed to parse.
    type Err = String;

    #[inline]
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "TokensPurchased" => Ok(Self::TokensPurchased),
            "IcoScheduleAdded" => Ok(Self::IcoScheduleAdded),
            "CurrencyAdded" => Ok(Self::CurrencyAdded),
            "CurrencyRemoved" => Ok(Self::CurrencyRemoved),
            "UnsoldTokensWithdrawn" => Ok(Self::UnsoldTokensWithdrawn),
            _ => Err(s.to_owned()),
        }
    }
}

impl fmt::Display for IcoEventType {
    #[inline]
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::TokensPurchased => "TokensPurchased",
            Self::IcoScheduleAdded => "IcoScheduleAdded",
            Self::CurrencyAdded => "CurrencyAdded",
            Self::CurrencyRemoved => "CurrencyRemoved",
            Self::UnsoldTokensWithdrawn => "UnsoldTokensWithdrawn",
        })
    }
}
