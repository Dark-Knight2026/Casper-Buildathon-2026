use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::StakingContractRef;

/// Unique identifier for each vesting schedule (auto-incrementing counter).
pub type VestingId = u64;

// =============================================================================
// Vesting Schedule Data
// =============================================================================

#[odra::odra_type]
pub struct VestingSchedule {
    /// The address that can claim tokens from this schedule.
    pub beneficiary: Address,
    /// Total number of tokens locked in this schedule.
    pub total_amount: U256,
    /// Number of tokens already claimed by the beneficiary.
    pub claimed_amount: U256,
    /// Block timestamp when the vesting clock starts (set at creation time).
    pub start_timestamp: u64,
    /// Duration (in time units) before any tokens become claimable.
    /// Must be <= vesting_duration.
    pub cliff_duration: u64,
    /// Total duration (in time units) from start to full vesting.
    /// After start + vesting_duration, all tokens are claimable.
    pub vesting_duration: u64,
}

// =============================================================================
// Errors
// =============================================================================

#[odra::odra_error]
pub enum Error {}

// =============================================================================
// Events
// =============================================================================

/// Emitted when a new vesting schedule is created.
#[odra::event]
pub struct ScheduleCreated {
    pub vesting_id: VestingId,
    pub beneficiary: Address,
    pub total_amount: U256,
    pub cliff_duration: u64,
    pub vesting_duration: u64,
}

/// Emitted when a beneficiary claims vested tokens.
#[odra::event]
pub struct TokensClaimed {
    pub vesting_id: VestingId,
    pub beneficiary: Address,
    pub amount: U256,
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
    errors = Error,
    events = [ScheduleCreated, TokensClaimed],
)]
pub struct Vesting {
    /// Ownership control — only the owner can configure the contract.
    ownable: SubModule<Ownable>,

    /// Reference to the TailorCoin (BIG) CEP-18 token contract.
    /// Used to pull tokens in (create_schedule) and transfer tokens out (claim).
    tailor_coin: External<Cep18ContractRef>,

    /// Reference to the Staking contract (for future auto-staking of vested tokens).
    /// Currently unused — the staking contract does not yet have stake/unstake functions.
    /// Kept here so the address can be wired during deployment, ready for when
    /// staking integration is implemented.
    staking: External<StakingContractRef>,

    /// Stores each vesting schedule by its unique ID.
    schedules: Mapping<VestingId, VestingSchedule>,

    /// Auto-incrementing counter for generating unique schedule IDs.
    schedules_count: Var<VestingId>,

    /// Tracks which addresses are allowed to create vesting schedules.
    /// Typically the ICO contract is whitelisted so it can create schedules
    /// on behalf of token purchasers.
    whitelisted_creators: Mapping<Address, bool>,

    /// Maps (beneficiary, index) to schedule IDs for per-user lookup.
    /// Use with `user_schedules_counts` to iterate a user's schedules.
    user_schedules: Mapping<(Address, u32), VestingId>,

    /// Tracks how many schedules each beneficiary has.
    user_schedules_counts: Mapping<Address, u32>,
}

#[odra::module]
impl Vesting {
    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    pub fn get_schedule(&self, vesting_id: VestingId) -> VestingSchedule {
        // return the schedule data basesd on vesting id
        todo!()
    }

    pub fn get_schedules_count(&self) -> u64 {
        // total amount of schedules created
        self.schedules_count.get_or_default()
    }

    pub fn get_user_schedules_count(&self, user: Address) -> u64 {
        // Number of schedules a user has
        todo!()
    }

    pub fn get_claimable_amount(&self, vesting_id: VestingId) -> U256 {
        // Vested minus claimed
        todo!()
    }

    pub fn get_vested_amount(&self, vesting_id: VestingId) -> U256 {
        // Total amount vested so far
        todo!()
    }

    pub fn is_whitelisted_creator(&self, creator: Address) -> bool {
        // check if this user is whitelisted
        todo!()
    }

    pub fn get_tailor_coin_contract_address(&self) -> Address {
        *self.tailor_coin.address()
    }

    pub fn get_staking_contract_address(&self) -> Address {
        *self.staking.address()
    }

    /// Sets the TailorCoin (BIG) token contract address by the owner
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
    }

    /// Sets the Staking contract address by the owner
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);
    }

    // // Get a list of the user's positions
    // pub fn get_user_schedules_by_key(&self, user: Address) -> List<VestingId> {
    //     // self.user_positions.get_or_default(user);
    //     todo!()
    // }

    pub fn add_whitelisted_creator(&self, creator: Address) {
        todo!()
    }

    pub fn remove_whitelisted_createor(&self, creator: Address) {
        todo!()
    }

    pub fn create_schedule(
        &self,
        beneficiary: Address,
        amount: U256,
        cliff: u64,
        duration: u64,
    ) -> VestingId {
        todo!()
    }

    #[odra(non_reentrant)]
    pub fn claim(&self, vesting_id: VestingId) {
        // Check caller

        // Transfer claimable tokens
        let claimable_amt = self.get_claimable_amount(vesting_id);
        let schedule = self.get_schedule(vesting_id);

        // self.tailor_coin.transfer_from(
        //     &self.env().self_address,
        //     &self.env().caller(),
        //     &claimable_amt,
        // );

        self.env().emit_native_event(TokensClaimed {
            vesting_id,
            beneficiary: schedule.beneficiary,
            amount: claimable_amt,
        });
        todo!()
    }

    delegate! {
      to self.ownable {
        fn transfer_ownership(&mut self, new_owner: &Address);
        fn renounce_ownership(&mut self);
        fn get_owner(&self) -> Address;
      }
    }
}

impl Vesting {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }
}
