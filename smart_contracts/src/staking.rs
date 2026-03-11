use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{
    staking::{
        errors::Error,
        events::{RewardsClaimed, Staked, UnbondedWithdrawn, UnstakedInitiated},
    },
    treasury::events::RewardsDeposited,
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

    /// All staking state for each user, keyed by wallet address
    stakers: Mapping<Address, StakerInfo>,

    /// Total BIG currently actively staked and eligible for rewards.
    /// This excludes unbonding tokens as they should no longer earn rewards.
    total_staked: Var<U256>,

    /// Global reward accumulator — cumulative rewards per staked token.
    /// This value is updated whenever newly available rewards are deposited.
    reward_per_token_stored: Var<U256>,

    /// Rewards received while no BIG is actively staked.
    /// These rewards stay queued until they can be distributed fairly.
    queued_rewards: Var<U256>,
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
    // Owner-only configurationstaker
    // =========================================================================

    /// Sets the TailorCoin (BIG) token contract address by the owner
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
    }

    // =========================================================================
    // View functions
    // =========================================================================

    /// Returns the TailorCoin (BIG) token contract address
    pub fn get_tailor_coin_contract_address(&self) -> Address {
        *self.tailor_coin.address()
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
    // Staking/Unstaking functions
    // =========================================================================

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

        self.env().emit_native_event(Staked { staker, amount });
    }

    #[odra(non_reentrant)]
    pub fn unstake_for(&mut self, staker: Address, amount: U256) {
        todo!()
    }

    /// Allows to deposit any rewards amount in the TailorCoin (BIG) token by anyone, then distributes these rewards
    /// between all stakers in this contract proportionally to their shares
    #[odra(non_reentrant)]
    pub fn deposit_rewards(&mut self, amount: U256) {
        let mut tailor_coin =
            Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address());

        tailor_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);

        // TODO implement rewards distribution
        todo!()
    }

    #[odra(non_reentrant)]
    pub fn withdraw(&mut self, amount: U256) {
        todo!()
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
