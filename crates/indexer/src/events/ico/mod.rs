//! ICO contract events.

pub mod ico_schedule_added;
pub mod tokens_purchased;

pub use ico_schedule_added::IcoScheduleAdded;
pub use tokens_purchased::TokensPurchased;

use core::str::FromStr;

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

impl IcoEventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::TokensPurchased => "TokensPurchased",
            Self::IcoScheduleAdded => "ICOScheduleAdded",
            Self::CurrencyAdded => "CurrencyAdded",
            Self::CurrencyRemoved => "CurrencyRemoved",
            Self::UnsoldTokensWithdrawn => "UnsoldTokensWithdrawn",
        }
    }
}

impl FromStr for IcoEventType {
    /// The unrecognized event name that failed to parse.
    type Err = String;

    #[inline]
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "TokensPurchased" => Ok(Self::TokensPurchased),
            "ICOScheduleAdded" => Ok(Self::IcoScheduleAdded),
            "CurrencyAdded" => Ok(Self::CurrencyAdded),
            "CurrencyRemoved" => Ok(Self::CurrencyRemoved),
            "UnsoldTokensWithdrawn" => Ok(Self::UnsoldTokensWithdrawn),
            _ => Err(s.to_owned()),
        }
    }
}
