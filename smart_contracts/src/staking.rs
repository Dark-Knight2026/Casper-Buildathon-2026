use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::{
    errors::Error,
    events::{RewardsClaimed, RewardsDeposited, Staked, UnbondedWithdrawn, UnstakedInitiated},
};

// =============================================================================
// Staking Types
// =============================================================================

/// Required waiting period between unstaking and withdrawal
pub const UNBONDING_PERIOD: u64 = 48 * 60 * 60 * 1_000; // 48 hours

#[derive(Default)]
#[odra::odra_type]
pub struct StakerInfo {
    /// BIG currently staked and still earning rewards.
    pub staked_amount: U256,
    /// Rewards already accounted for, but not yet claimed.
    pub pending_rewards: U256,
    /// Per-user snapshot of `reward_per_token_stored` at last interaction
    pub reward_per_token_paid: U256,
    /// BIG currently in the unbonding window.
    pub unbonding_amount: U256,
    /// Block timestamp for when the current unbonding amount becomes withdrawable.
    pub unbonding_ends_at: u64,
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct Staked {
        pub staker: Address,
        pub amount: U256,
    }

    #[odra::event]
    pub struct UnstakedInitiated {
        pub staker: Address,
        pub amount: U256,
        pub unbonding_ends_at: u64,
    }

    #[odra::event]
    pub struct UnbondedWithdrawn {
        pub staker: Address,
        pub amount: U256,
    }

    #[odra::event]
    pub struct RewardsDeposited {
        pub caller: Address,
        pub amount: U256,
    }

    #[odra::event]
    pub struct RewardsClaimed {
        pub staker: Address,
        pub amount: U256,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        TailorCoinContractIsNotSet = 63_000,
        InvalidAmount = 63_001,
        CallerNotAuthorizedToUnstake = 63_002,
        NothingStaked = 63_003,
        InsufficientStakedAmount = 63_004,
        UnbondingAlreadyInProgress = 63_005,
        VestingContractIsNotSet = 63_006,
        NoRewardsToClaim = 63_007,
        NoUnbondingInProgress = 63_008,
        UnbondingPeriodNotFinished = 63_009,
        NoActiveStake = 63_010,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
  errors = Error,
  events = [Staked, UnstakedInitiated, UnbondedWithdrawn, RewardsDeposited, RewardsClaimed]
)]
pub struct Staking {
    /// Ownership control — only the owner can configure the contract.
    ownable: SubModule<Ownable>,

    /// Reference to the TailorCoin (BIG) CEP-18 token contract.
    tailor_coin: External<Cep18ContractRef>,

    /// Trusted Vesting contract address allowed to intitiate unstaking on behalf of a staker
    vesting: Var<Address>,

    /// All staking state for each user, keyed by wallet address
    stakers: Mapping<Address, StakerInfo>,

    /// Total BIG currently actively staked and eligible for rewards.
    /// This excludes unbonding tokens as they should no longer earn rewards.
    total_staked: Var<U256>,

    /// Global reward accumulator — cumulative rewards per staked token.
    /// This value is updated whenever newly available rewards are deposited.
    reward_per_token_stored: Var<U256>,
}

#[odra::module]
impl Staking {
    // =========================================================================
    // Initialization
    // =========================================================================

    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

    /// Sets the TailorCoin (BIG) token contract address by the owner
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
    }

    /// Sets the Vesting contract address by the owner
    pub fn set_vesting(&mut self, vesting: Address) {
        self.assert_owner();
        self.vesting.set(vesting);
    }

    // =========================================================================
    // View functions
    // =========================================================================

    /// Returns the TailorCoin (BIG) token contract address
    pub fn get_tailor_coin_contract_address(&self) -> Address {
        *self.tailor_coin.address()
    }

    /// Returns the Vesting contract address
    pub fn get_vesting_contract_address(&self) -> Address {
        self.vesting
            .get_or_revert_with(Error::VestingContractIsNotSet)
    }

    /// Returns total staked in contract
    pub fn get_total_staked(&self) -> U256 {
        self.total_staked.get_or_default()
    }

    /// Returns staker info based on wallet address
    pub fn get_staker_info(&self, staker: Address) -> StakerInfo {
        self.stakers.get_or_default(&staker)
    }

    /// Returns pending (unclaimed) rewards for a given staker
    pub fn get_pending_rewards(&self, staker: Address) -> U256 {
        let staker_info = self.get_staker_info(staker);
        let reward_per_token = self.reward_per_token_stored.get_or_default();

        if staker_info.staked_amount.is_zero()
            || reward_per_token == staker_info.reward_per_token_paid
        {
            return staker_info.pending_rewards;
        }

        // Measure how much the global reward has increased since staker's last interaction
        let reward_delta = reward_per_token - staker_info.reward_per_token_paid;

        let newly_accrued_rewards = staker_info.staked_amount * reward_delta / Self::precision();

        staker_info.pending_rewards + newly_accrued_rewards
    }

    // =========================================================================
    // Stake Management
    // =========================================================================

    /// Stakes amount of BIG tokens on behalf of staker.
    ///
    /// Transfers tokens from the **caller** to the staking contract, but credits
    /// the stake to `staker`. This lets approved parties (e.g. the ICO contract)
    /// stake tokens on a user's behalf without the user interacting directly.
    ///
    /// @dev Updates the staker's pending rewards before modifying their balance so
    /// that accrued rewards are not lost.
    #[odra(non_reentrant)]
    pub fn stake_for(&mut self, staker: Address, amount: U256) {
        if amount.is_zero() {
            self.env().revert(Error::InvalidAmount);
        }

        self.update_reward_for(&staker);

        let caller = &self.env().caller();
        let staking_contract = &self.env().self_address();
        self.tailor_coin
            .transfer_from(caller, staking_contract, &amount);

        let mut staker_info = self.stakers.get_or_default(&staker);
        staker_info.staked_amount += amount;
        self.stakers.set(&staker, staker_info);

        let new_total_staked = self.total_staked.get_or_default() + amount;
        self.total_staked.set(new_total_staked);

        self.env().emit_native_event(Staked { staker, amount });
    }

    /// Initiates an unstake of BIG tokens for staker, starting the
    /// unbonding period.
    ///
    /// The caller must be either the staker themselves or the vesting
    /// contract. Tokens are moved from the active stake into an unbonding state
    /// and become withdrawable after [`UNBONDING_PERIOD`] has elapsed.
    ///
    /// Only one unbonding position may be active at a time per staker.
    ///
    /// @dev Updates the staker's pending rewards before modifying their balance so
    /// that accrued rewards are not lost.
    #[odra(non_reentrant)]
    pub fn unstake_for(&mut self, staker: Address, amount: U256) {
        if amount.is_zero() {
            self.env().revert(Error::InvalidAmount);
        }

        self.assert_can_unstake_for(&staker);

        let staker_info = self.stakers.get_or_default(&staker);

        if staker_info.staked_amount.is_zero() {
            self.env().revert(Error::NothingStaked);
        }
        if amount > staker_info.staked_amount {
            self.env().revert(Error::InsufficientStakedAmount);
        }
        if !staker_info.unbonding_amount.is_zero() {
            self.env().revert(Error::UnbondingAlreadyInProgress);
        }

        self.update_reward_for(&staker);

        let mut staker_info = self.stakers.get_or_default(&staker);
        let unbonding_ends_at = self.env().get_block_time() + UNBONDING_PERIOD;

        staker_info.staked_amount -= amount;
        staker_info.unbonding_amount = amount;
        staker_info.unbonding_ends_at = unbonding_ends_at;

        self.stakers.set(&staker, staker_info);

        let new_total_staked = self.total_staked.get_or_default() - amount;
        self.total_staked.set(new_total_staked);

        self.env().emit_native_event(UnstakedInitiated {
            staker,
            amount,
            unbonding_ends_at,
        });
    }

    // =========================================================================
    // Reward Flows
    // =========================================================================

    /// Allows anyone to deposit BIG rewards into the staking contract
    /// Newly deposited rewards are distributed proportionally across all active
    /// stakers using the global reward-per-token accumulator
    ///
    /// @dev This function requires at least some active stake to exist. if nobody
    /// is currently staking, the deposit is rejected.
    #[odra(non_reentrant)]
    pub fn deposit_rewards(&mut self, amount: U256) {
        if amount.is_zero() {
            self.env().revert(Error::InvalidAmount);
        }

        let total_staked = self.total_staked.get_or_default();

        if total_staked.is_zero() {
            self.env().revert(Error::NoActiveStake);
        }

        let caller = self.env().caller();
        let staking_contract = self.env().self_address();
        self.tailor_coin
            .transfer_from(&caller, &staking_contract, &amount);

        let current = self.reward_per_token_stored.get_or_default();
        let increase = amount * Self::precision() / total_staked;

        self.reward_per_token_stored.set(current + increase);

        self.env()
            .emit_native_event(RewardsDeposited { caller, amount });
    }

    /// Claims all pending BIG token rewards accrued by the caller.
    ///
    /// Snapshots the caller's reward state first, then transfers the full
    /// pending balance to the caller and resets it to zero. The caller's
    /// active stake (if any) is unaffected.
    #[odra(non_reentrant)]
    pub fn claim_rewards(&mut self) {
        let staker = self.env().caller();

        self.update_reward_for(&staker);

        let mut staker_info = self.get_staker_info(staker);
        let rewards = staker_info.pending_rewards;

        if rewards.is_zero() {
            self.env().revert(Error::NoRewardsToClaim);
        }

        staker_info.pending_rewards = U256::zero();
        self.stakers.set(&staker, staker_info);

        self.tailor_coin.transfer(&staker, &rewards);

        self.env().emit_native_event(RewardsClaimed {
            staker,
            amount: rewards,
        });
    }

    // =========================================================================
    // Unbonding Withdrawal
    // =========================================================================

    /// Withdraws the caller's unbonded BIG tokens after the unbonding period
    /// has fully elapsed.
    ///
    /// The caller must have previously initiated an unstake via [`unstake_for`]
    /// and waited for [`UNBONDING_PERIOD`] to pass. On success, the unbonding
    /// position is cleared and the tokens are transferred back to the caller.
    #[odra(non_reentrant)]
    pub fn withdraw_unbonded(&mut self) {
        let staker = self.env().caller();
        let mut staker_info = self.stakers.get_or_default(&staker);

        let amount = staker_info.unbonding_amount;
        let unbonding_time = staker_info.unbonding_ends_at;

        if amount.is_zero() {
            self.env().revert(Error::NoUnbondingInProgress);
        }
        if self.env().get_block_time() < unbonding_time {
            self.env().revert(Error::UnbondingPeriodNotFinished);
        }

        staker_info.unbonding_amount = U256::zero();
        staker_info.unbonding_ends_at = 0;
        self.stakers.set(&staker, staker_info);

        self.tailor_coin.transfer(&staker, &amount);

        self.env()
            .emit_native_event(UnbondedWithdrawn { staker, amount });
    }

    // =========================================================================
    // Ownable delegation
    // =========================================================================

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }
    }
}

// =============================================================================
// Internal helpers
// =============================================================================

impl Staking {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn assert_can_unstake_for(&self, staker: &Address) {
        if self.env().caller() == *staker {
            return;
        }

        let vesting = self.get_vesting_contract_address();

        if self.env().caller() != vesting {
            self.env().revert(Error::CallerNotAuthorizedToUnstake);
        }
    }

    /// Precision multiplier (1e18) for reward-per-token fixed-point math.
    fn precision() -> U256 {
        U256::from_dec_str("1000000000000000000").unwrap()
    }

    /// Updates staker's stored reward state to the current global reward per token
    /// After this, `pending_rewards` includes all rewards accrued, and
    /// staker's `reward_per_token_paid` is advanced to the global `reward_per_token_stored`
    fn update_reward_for(&mut self, staker: &Address) {
        let mut staker_info = self.stakers.get_or_default(staker);
        let reward_per_token = self.reward_per_token_stored.get_or_default();
        let paid = staker_info.reward_per_token_paid;
        let staked = staker_info.staked_amount;

        let accrued = staked * (reward_per_token - paid) / Self::precision();

        staker_info.pending_rewards += accrued;
        staker_info.reward_per_token_paid = reward_per_token;

        self.stakers.set(staker, staker_info);
    }
}
