//! Staking contract events.

pub mod rewards_claimed;
pub mod rewards_deposited;
pub mod staked;
pub mod staker_snapshot;
pub mod unbonded_withdrawn;
pub mod unstaked_initiated;

pub use rewards_claimed::RewardsClaimed;
pub use rewards_deposited::RewardsDeposited;
pub use staked::Staked;
pub use staker_snapshot::StakerSnapshot;
pub use unbonded_withdrawn::UnbondedWithdrawn;
pub use unstaked_initiated::UnstakedInitiated;

use core::str::FromStr;

use crate::{
    backfill::parser::{CesEvent, EventSchema},
    error::{IndexerError, IndexerResult},
};

/// CES binary schemas for all indexed Staking events.
pub static CES_SCHEMAS: &[EventSchema] = &[
    <Staked as CesEvent>::SCHEMA,
    <UnstakedInitiated as CesEvent>::SCHEMA,
    <UnbondedWithdrawn as CesEvent>::SCHEMA,
    <RewardsDeposited as CesEvent>::SCHEMA,
    <RewardsClaimed as CesEvent>::SCHEMA,
    <StakerSnapshot as CesEvent>::SCHEMA,
];

/// All possible Staking contract events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StakingEventType {
    /// Emitted when a user stakes BIG tokens.
    Staked,
    /// Emitted when a user initiates unstaking (starts unbonding period).
    UnstakedInitiated,
    /// Emitted when unbonding completes and tokens are withdrawn.
    UnbondedWithdrawn,
    /// Emitted when treasury deposits rewards into the staking pool.
    RewardsDeposited,
    /// Emitted when a staker claims accumulated rewards.
    RewardsClaimed,
    /// Emitted after stake/unstake/claim with the staker's updated reward state.
    StakerSnapshot,
}

impl StakingEventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Staked => "Staked",
            Self::UnstakedInitiated => "UnstakedInitiated",
            Self::UnbondedWithdrawn => "UnbondedWithdrawn",
            Self::RewardsDeposited => "RewardsDeposited",
            Self::RewardsClaimed => "RewardsClaimed",
            Self::StakerSnapshot => "StakerSnapshot",
        }
    }
}

impl FromStr for StakingEventType {
    type Err = IndexerError;

    #[inline]
    fn from_str(s: &str) -> IndexerResult<Self> {
        match s {
            "Staked" => Ok(Self::Staked),
            "UnstakedInitiated" => Ok(Self::UnstakedInitiated),
            "UnbondedWithdrawn" => Ok(Self::UnbondedWithdrawn),
            "RewardsDeposited" => Ok(Self::RewardsDeposited),
            "RewardsClaimed" => Ok(Self::RewardsClaimed),
            "StakerSnapshot" => Ok(Self::StakerSnapshot),
            _ => Err(IndexerError::InvalidEventName(s.to_owned())),
        }
    }
}
