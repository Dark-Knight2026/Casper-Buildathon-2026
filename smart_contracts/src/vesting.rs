use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::StakingContractRef;

pub type VestingId = u64;

#[odra::module(
  errors = Error,
  events = [ScheduleCreated, TokensClaimed],
)]
pub struct Vesting {
    ownable: SubModule<Ownable>,
    tailor_coin: External<Cep18ContractRef>, // TODO: Shoud we use Var<Address> instead?
    staking: External<StakingContractRef>,
    schedules: Mapping<VestingId, VestingSchedule>,
    schedules_count: Var<VestingId>,
    whitelisted_creators: Mapping<Address, bool>,
}

#[odra::odra_type]
pub struct VestingSchedule {
    pub beneficiary: Address,
    pub total_amount: U256,
    pub claimed_amount: U256,
    pub start_timestamp: u64,  // set to block time at creation
    pub cliff_duration: u64,   // seconds until first unlock
    pub vesting_duration: u64, // total seconds from start to full vest
}

#[odra::odra_error]
pub enum Error {}

#[odra::event]
pub struct ScheduleCreated {
    pub vesting_id: VestingId,
    pub beneficiary: Address,
    pub total_amount: U256,
    pub cliff_duration: u64,
    pub vesting_duration: u64,
}

#[odra::event]
pub struct TokensClaimed {
    pub vesting_id: VestingId,
    pub beneficiary: Address,
    pub amount: U256,
}

// TODO: Don't forget to mark any functions that might be payable with the odra(payable) attribute
// TODO: Don't forget to add odra(non_reentrant) attribute anywhere needed

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

    pub fn claim(&self, vesting_id: VestingId) {
        // Transfer claimable tokens
        // Emit Claimed event
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
