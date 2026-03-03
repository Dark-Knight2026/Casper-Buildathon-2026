use odra::prelude::*;
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::StakingContractRef;

pub type VestingId = u128;

#[odra::module(
  errors = Error,
  events = [CreatedPosition],
)]
pub struct Vesting {
    ownable: SubModule<Ownable>,
    tailor_coin: External<Cep18ContractRef>, // TODO: Shoud we use Var<Address> instead?
    staking: External<StakingContractRef>,
    user_positions: Mapping<Address, List<VestingId>>,
}

#[odra::odra_error]
pub enum Error {}

// Add events
#[odra::event]
pub struct CreatedPosition {
    // Potential fields: user, amount, timestamp
}

// TODO: Don't forget to mark any functions that might be payable with the odra(payable) attribute
// TODO: Don't forget to add odra(non_reentrant) attribute anywhere needed

#[odra::module]
impl Vesting {
    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    // TODO: Verify this contract will receive CSPR tokens
    /// Allows to receive CSPR tokens by this contract
    pub fn receive(&self) {}

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
    // pub fn get_user_positions_by_key(&self, user: Address) -> List<VestingId> {
    //     // self.user_positions.get_or_default(user);
    //     todo!()
    // }

    pub fn create_position(&self) {}
}

impl Vesting {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }
}
