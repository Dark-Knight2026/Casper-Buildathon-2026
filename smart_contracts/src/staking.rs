use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::errors::Error;

#[odra::module(errors = Error)]
pub struct Staking {
    ownable: SubModule<Ownable>,
    tailor_coin: Var<Address>,
}

// TODO implement all staking and rewards distribution related logic

#[odra::module]
impl Staking {
    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    /// Sets the TailorCoin (BIG) token contract address by the owner
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
    }

    /// Allows to deposit any rewards amount in the TailorCoin (BIG) token by anyone, then distributes these rewards
    /// between all stakers in this contract proportionally to their shares
    #[odra(non_reentrant)]
    pub fn deposit_rewards(&mut self, amount: U256) {
        let mut tailor_coin =
            Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address());

        tailor_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);

        // TODO implement rewards distribution
    }

    /// Returns the TailorCoin (BIG) token contract address
    pub fn get_tailor_coin_contract_address(&self) -> Address {
        self.tailor_coin
            .get_or_revert_with(Error::TailorCoinContractIsNotSet)
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }
    }
}

impl Staking {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        TailorCoinContractIsNotSet = 63_000,
    }
}

