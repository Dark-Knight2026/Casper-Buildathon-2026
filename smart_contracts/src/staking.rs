use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::errors::Error;

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
    /// Snapshot of the global reward index value already accounted for this staker.
    pub reward_index_snapshot: U256,
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
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        TailorCoinContractIsNotSet = 63_000,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [])]
pub struct Staking {
    /// Ownership control — only the owner can configure the contract.
    ownable: SubModule<Ownable>,

    /// Reference to the TailorCoin (BIG) CEP-18 token contract.
    tailor_coin: External<Cep18ContractRef>,

    /// All staking state for each user, keyed by wallet address
    stakers: Mapping<Address, StakerInfo>,

    /// Total BIG currently activele staked and elible for rewards.
    /// This excludes unbonding tokens as they should no longer earn rewards.
    total_staked: Var<U256>,

    /// Cumulative rewards distributed per unit of active stake
    /// This value is updated whenever newly available rewards are allocated
    /// across all active stakers. Each staker stores the last accounted value
    /// in their `reward_index_snapshot` field, which allows newly acrrued rewards
    /// to be calculated without iterating over every staker.
    reward_index: Var<U256>,

    /// Rewards received while no BIG is actively staked. 
    /// These rewards stay queued until they can be distributed fairly.
    queued_rewards: Var<U256>,
}

// TODO implement all staking and rewards distribution related logic

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

    // =========================================================================
    // View functions
    // =========================================================================

    /// Returns the TailorCoin (BIG) token contract address
    pub fn get_tailor_coin_contract_address(&self) -> Address {
        *self.tailor_coin.address()
    }

    // =========================================================================
    // Staking/Unstaking functions
    // =========================================================================

    #[odra(non_reentrant)]
    pub fn stake_for(&mut self, recipient: Address, amount: U256) {
        todo!()
    }

    #[odra(non_reentrant)]
    pub fn unstake_for(&mut self, recipient: Address, amount: U256) {
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
}

// =============================================================================
// Tests
// =============================================================================

