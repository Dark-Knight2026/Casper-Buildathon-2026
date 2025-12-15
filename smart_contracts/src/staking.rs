use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::staking::errors::Error;

#[odra::module(errors = Error)]
pub struct Staking {
    ownable: SubModule<Ownable>,
    tailor_coin: Var<Address>,
}

#[odra::module]
impl Staking {
    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.tailor_coin.set(tailor_coin);
    }

    pub fn deposit_rewards(&mut self, amount: U256) {
        let mut tailor_coin =
            Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address());

        tailor_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);

        // TODO implement rewards distribution
    }

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

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        TailorCoinContractIsNotSet = 63_000,
    }
}
