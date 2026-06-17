use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{
    constants::{REWARD_CLAIM_HOLD_PERIOD, UNBONDING_PERIOD},
    staking::{
        errors::Error,
        events::{
            BigCoinSet, DustSwept, RewardsClaimed, RewardsDeposited, Staked, StakerSnapshot,
            UnbondedWithdrawn, UnstakedInitiated, VestingSet,
        },
    },
    vesting::VestingContractRef,
};

// =============================================================================
// Staking Types
// =============================================================================

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
    /// Block timestamp when the current active stake position began (`0` if none).
    pub staked_at: u64,
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
        pub reward_per_token_stored: U256,
    }

    #[odra::event]
    pub struct RewardsClaimed {
        pub staker: Address,
        pub amount: U256,
    }

    #[odra::event]
    pub struct DustSwept {
        pub recipient: Address,
        pub amount: U256,
    }

    #[odra::event]
    pub struct StakerSnapshot {
        pub staker: Address,
        pub staked_amount: U256,
        pub pending_rewards: U256,
        pub reward_per_token_paid: U256,
    }

    #[odra::event]
    pub struct BigCoinSet {
        pub big_coin: Address,
    }

    #[odra::event]
    pub struct VestingSet {
        pub vesting: Address,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        BigCoinContractIsNotSet = 601,
        InvalidAmount = 602,
        CallerNotAuthorizedToUnstake = 603,
        NothingStaked = 604,
        InsufficientStakedAmount = 605,
        UnbondingAlreadyInProgress = 606,
        VestingContractIsNotSet = 607,
        NoRewardsToClaim = 608,
        NoUnbondingInProgress = 609,
        UnbondingPeriodNotFinished = 610,
        NoActiveStake = 611,
        CallerNotAuthorizedToStake = 612,
        UnstakeBlockedByVestingLock = 613,
        CallerNotAuthorizedToManageLocks = 614,
        RenounceOwnershipNotAllowed = 615,
        AlreadyInitialized = 616,
        RewardClaimHoldPeriodNotFinished = 617,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
  errors = Error,
  events = [
    Staked,
    UnstakedInitiated,
    UnbondedWithdrawn,
    RewardsDeposited,
    RewardsClaimed,
    StakerSnapshot,
    BigCoinSet,
    VestingSet,
    DustSwept,
  ]
)]
pub struct Staking {
    /// Ownership control — only the owner can configure the contract.
    ownable: SubModule<Ownable>,

    /// Reference to the BIG CEP-18 token contract.
    big_coin: External<Cep18ContractRef>,

    /// Trusted Vesting contract address allowed to initiate unstaking on behalf of a staker
    vesting: External<VestingContractRef>,

    /// All staking state for each user, keyed by wallet address
    stakers: Mapping<Address, StakerInfo>,

    /// Total BIG currently actively staked and eligible for rewards.
    /// This excludes unbonding tokens as they should no longer earn rewards.
    total_staked: Var<U256>,

    /// Tracks how much of each staker's balance is locked by vesting schedules.
    /// Only the Vesting contract can modify this.
    vesting_locked: Mapping<Address, U256>,

    /// Global reward accumulator — cumulative rewards per staked token.
    /// This value is updated whenever newly available rewards are deposited.
    reward_per_token_stored: Var<U256>,
    unclaimed_rewards: Var<U256>,
    initialized: Var<bool>,
}

#[odra::module]
impl Staking {
    // =========================================================================
    // Initialization
    // =========================================================================

    pub fn init(&mut self, owner: Address) {
        if self.initialized.get_or_default() {
            self.env().revert(Error::AlreadyInitialized);
        }

        self.ownable.init(owner);

        self.initialized.set(true);
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

    /// Sets the BIG token contract address by the owner
    pub fn set_big_coin(&mut self, big_coin: Address) {
        self.assert_owner();
        self.big_coin.set(big_coin);

        self.env().emit_event(BigCoinSet { big_coin });
    }

    /// Sets the Vesting contract address by the owner
    pub fn set_vesting(&mut self, vesting: Address) {
        self.assert_owner();
        self.vesting.set(vesting);

        self.env().emit_event(VestingSet { vesting });
    }

    // =========================================================================
    // View functions
    // =========================================================================

    /// Returns the BIG token contract address
    pub fn get_big_coin_contract_address(&self) -> Address {
        *self.big_coin.address()
    }

    /// Returns the Vesting contract address
    pub fn get_vesting_contract_address(&self) -> Address {
        *self.vesting.address()
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

        self.assert_can_stake_for(&staker);

        self.update_reward_for(&staker);

        let caller = &self.env().caller();
        let staking_contract = &self.env().self_address();
        self.big_coin
            .transfer_from(caller, staking_contract, &amount);

        let mut staker_info = self.stakers.get_or_default(&staker);
        let opening_new_stake_position = staker_info.staked_amount.is_zero();
        staker_info.staked_amount += amount;
        if opening_new_stake_position {
            // Use at least 1 so a stake at block_time 0 still enforces the hold window.
            staker_info.staked_at = self.env().get_block_time().max(1);
        }
        self.stakers.set(&staker, staker_info);

        let new_total_staked = self.total_staked.get_or_default() + amount;
        self.total_staked.set(new_total_staked);

        self.env().emit_event(Staked { staker, amount });
        self.emit_staker_snapshot(staker);
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

        // Enforce the vesting lock
        if self.env().caller() == staker {
            let locked_amt = self.vesting_locked.get_or_default(&staker);

            let available = staker_info
                .staked_amount
                .checked_sub(locked_amt)
                .unwrap_or_revert_with(&self.env(), Error::InvalidAmount);

            if amount > available {
                self.env().revert(Error::UnstakeBlockedByVestingLock);
            }
        }

        self.update_reward_for(&staker);

        let mut staker_info = self.stakers.get_or_default(&staker);
        let unbonding_ends_at = self.env().get_block_time() + UNBONDING_PERIOD;

        staker_info.staked_amount -= amount;
        staker_info.unbonding_amount = amount;
        staker_info.unbonding_ends_at = unbonding_ends_at;
        if staker_info.staked_amount.is_zero() {
            staker_info.staked_at = 0;
        }

        self.stakers.set(&staker, staker_info);

        let new_total_staked = self.total_staked.get_or_default() - amount;
        self.total_staked.set(new_total_staked);

        self.env().emit_event(UnstakedInitiated {
            staker,
            amount,
            unbonding_ends_at,
        });
        self.emit_staker_snapshot(staker);
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
        self.big_coin
            .transfer_from(&caller, &staking_contract, &amount);

        let current = self.reward_per_token_stored.get_or_default();
        let increase = amount * Self::precision() / total_staked;

        self.reward_per_token_stored.set(current + increase);

        // Track the portion of this deposit that the accumulator math allocates to
        // stakers (increase * total / precision). This is <= amount due to truncation
        // in deposit_rewards. The difference (plus any secondary trunc in update_reward_for)
        // is dust that can be swept via sweep_dust. (H-9)
        let newly_unclaimed = increase * total_staked / Self::precision();
        let cur_unclaimed = self.unclaimed_rewards.get_or_default();
        self.unclaimed_rewards.set(cur_unclaimed + newly_unclaimed);

        self.env().emit_event(RewardsDeposited {
            caller,
            amount,
            reward_per_token_stored: self.reward_per_token_stored.get_or_default(),
        });
    }

    /// Allows the owner to recover BIG dust that has accumulated in the contract
    /// due to truncation in the reward accumulator math (deposit_rewards and
    /// update_reward_for / get_pending_rewards). Only the excess over
    /// (total_staked + unclaimed_rewards) is transferred.
    pub fn sweep_dust(&mut self, recipient: Address) {
        self.assert_owner();

        let self_addr = self.env().self_address();
        let balance =
            Cep18ContractRef::new(self.env(), *self.big_coin.address()).balance_of(&self_addr);
        let staked = self.total_staked.get_or_default();
        let unclaimed = self.unclaimed_rewards.get_or_default();
        let reserved = staked + unclaimed;

        let dust = Self::saturating_sub(balance, reserved);
        if !dust.is_zero() {
            self.big_coin.transfer(&recipient, &dust);

            self.env().emit_event(DustSwept {
                recipient,
                amount: dust,
            });
        }
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

        self.assert_reward_claim_hold_elapsed(&staker_info);

        staker_info.pending_rewards = U256::zero();
        self.stakers.set(&staker, staker_info);

        // Reduce unclaimed accounting by the paid amount. Combined with the add in
        // deposit_rewards (using the first truncation's allocated amount), this lets
        // sweep_dust compute excess = balance - total_staked - unclaimed as the trapped dust.
        //
        // Per-deposit `unclaimed_rewards` can under-count relative to multi-cycle
        // per-staker accrual (independent truncation paths), so cap the deduction
        // and use saturating subtraction to avoid U256 underflow panics.
        let cur_unclaimed = self.unclaimed_rewards.get_or_default();
        let unclaimed_deduction = Self::min_u256(rewards, cur_unclaimed);
        self.unclaimed_rewards
            .set(Self::saturating_sub(cur_unclaimed, unclaimed_deduction));

        self.big_coin.transfer(&staker, &rewards);

        self.env().emit_event(RewardsClaimed {
            staker,
            amount: rewards,
        });
        self.emit_staker_snapshot(staker);
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

        self.big_coin.transfer(&staker, &amount);

        self.env().emit_event(UnbondedWithdrawn { staker, amount });
    }

    // =========================================================================
    // Vesting Lock (only called by the vesting contract)
    // =========================================================================

    /// Increases the vesting-locked balance for a staker.
    /// @dev Called by the vesting contract when a new schedule is created.
    pub fn add_vesting_lock(&mut self, staker: Address, amount: U256) {
        self.assert_caller_is_vesting_contract();
        let current = self.vesting_locked.get_or_default(&staker);
        self.vesting_locked.set(&staker, current + amount);
    }

    /// Decreases the vesting-locked balance for a staker.
    /// @dev Called by the vesting contract when tokens are claimed.
    pub fn release_vesting_lock(&mut self, staker: Address, amount: U256) {
        self.assert_caller_is_vesting_contract();
        let current_amt = self.vesting_locked.get_or_default(&staker);
        let new_amt = current_amt
            .checked_sub(amount)
            .unwrap_or_revert_with(&self.env(), Error::InvalidAmount);
        self.vesting_locked.set(&staker, new_amt);
    }

    // =========================================================================
    // Ownable delegation
    // =========================================================================

    /// renounce_ownership is disabled to prevent a single transaction from
    /// permanently removing all admin controls (which would brick staking
    /// reward distribution, etc.).
    pub fn renounce_ownership(&mut self) {
        self.env().revert(Error::RenounceOwnershipNotAllowed);
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
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
    fn assert_can_stake_for(&self, staker: &Address) {
        let caller = self.env().caller();
        if caller == *staker {
            return;
        }

        if !self.vesting.is_whitelisted_creator(&caller) {
            self.env().revert(Error::CallerNotAuthorizedToStake)
        }
    }

    #[inline]
    fn assert_can_unstake_for(&self, staker: &Address) {
        let caller = self.env().caller();
        if caller == *staker {
            return;
        }

        if caller != *self.vesting.address() {
            self.env().revert(Error::CallerNotAuthorizedToUnstake);
        }
    }

    #[inline]
    fn assert_caller_is_vesting_contract(&self) {
        if self.env().caller() != *self.vesting.address() {
            self.env().revert(Error::CallerNotAuthorizedToManageLocks);
        }
    }

    #[inline]
    fn assert_reward_claim_hold_elapsed(&self, staker_info: &StakerInfo) {
        // `staked_at == 0` marks legacy positions that predate this field.
        if staker_info.staked_at > 0
            && self.env().get_block_time() < staker_info.staked_at + REWARD_CLAIM_HOLD_PERIOD
        {
            self.env().revert(Error::RewardClaimHoldPeriodNotFinished);
        }
    }

    /// Precision multiplier (1e18) for reward-per-token fixed-point math.
    fn precision() -> U256 {
        U256::from_dec_str("1000000000000000000").expect("1e18 precision constant")
    }

    #[inline]
    fn min_u256(a: U256, b: U256) -> U256 {
        if a <= b {
            a
        } else {
            b
        }
    }

    #[inline]
    fn saturating_sub(a: U256, b: U256) -> U256 {
        a.checked_sub(b).unwrap_or_else(U256::zero)
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

    /// Emits a post-update snapshot of the staker's reward state.
    fn emit_staker_snapshot(&self, staker: Address) {
        let info = self.stakers.get_or_default(&staker);

        self.env().emit_event(StakerSnapshot {
            staker,
            staked_amount: info.staked_amount,
            pending_rewards: info.pending_rewards,
            reward_per_token_paid: info.reward_per_token_paid,
        });
    }
}
