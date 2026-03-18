//! Vesting contract events.

pub mod schedule_created;
pub mod tokens_claimed;

pub use schedule_created::ScheduleCreated;
pub use tokens_claimed::TokensClaimed;

use core::str::FromStr;

/// All possible Vesting contract events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VestingEventType {
    /// Emitted when a new vesting schedule is created.
    ScheduleCreated,
    /// Emitted when a beneficiary claims vested tokens.
    TokensClaimed,
    /// Emitted when a whitelisted creator is added (admin-only, not indexed).
    WhitelistedCreatorAdded,
    /// Emitted when a whitelisted creator is removed (admin-only, not indexed).
    WhitelistedCreatorRemoved,
}

impl VestingEventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::ScheduleCreated => "ScheduleCreated",
            Self::TokensClaimed => "TokensClaimed",
            Self::WhitelistedCreatorAdded => "WhitelistedCreatorAdded",
            Self::WhitelistedCreatorRemoved => "WhitelistedCreatorRemoved",
        }
    }
}

impl FromStr for VestingEventType {
    /// The unrecognized event name that failed to parse.
    type Err = String;

    #[inline]
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ScheduleCreated" => Ok(Self::ScheduleCreated),
            "TokensClaimed" => Ok(Self::TokensClaimed),
            "WhitelistedCreatorAdded" => Ok(Self::WhitelistedCreatorAdded),
            "WhitelistedCreatorRemoved" => Ok(Self::WhitelistedCreatorRemoved),
            _ => Err(s.to_owned()),
        }
    }
}
