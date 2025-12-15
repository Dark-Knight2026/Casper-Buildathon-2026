use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::constants::{ONE_HUNDRED_PERCENT_BPS, STAKING_REWARDS_BPS};
use crate::staking::StakingContractRef;
use crate::treasury::{
    errors::Error,
    events::{ReservesWithdrawn, RewardsDeposited},
};

#[odra::module(errors = Error, events = [RewardsDeposited, ReservesWithdrawn])]
pub struct Treasury {
    ownable: SubModule<Ownable>,
    staking: Var<Address>,
    tailor_coin: Var<Address>,
}

#[odra::module]
impl Treasury {
    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    pub fn set_staking(&mut self, staking: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.staking.set(staking);
    }

    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.tailor_coin.set(tailor_coin);
    }

    pub fn deposit_rewards(&mut self, amount: U256) {
        if amount > U256::zero() {
            let mut tailor_coin =
                Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address());
            let staking_rewards = amount * STAKING_REWARDS_BPS / ONE_HUNDRED_PERCENT_BPS;

            tailor_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);
            tailor_coin.increase_allowance(&self.get_staking_contract_address(), &staking_rewards);

            StakingContractRef::new(self.env(), self.get_staking_contract_address())
                .deposit_rewards(staking_rewards);

            self.env().emit_native_event(RewardsDeposited { amount });
        }
    }

    pub fn withdraw_reserves(&mut self, recipient: Address, amount: U256) {
        self.ownable.assert_owner(&self.env().caller());

        if self.get_reserves() < amount {
            self.env().revert(Error::NotEnoughReserves);
        }

        if amount > U256::zero() {
            Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address())
                .transfer(&recipient, &amount);

            self.env()
                .emit_native_event(ReservesWithdrawn { recipient, amount });
        }
    }

    pub fn get_reserves(&self) -> U256 {
        Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address())
            .balance_of(&self.env().self_address())
    }

    pub fn get_staking_contract_address(&self) -> Address {
        self.staking
            .get_or_revert_with(Error::StakingContractIsNotSet)
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

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct RewardsDeposited {
        pub amount: U256,
    }

    #[odra::event]
    pub struct ReservesWithdrawn {
        pub recipient: Address,
        pub amount: U256,
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        TailorCoinContractIsNotSet = 64_001,
        StakingContractIsNotSet = 64_002,
        NotEnoughReserves = 64_003,
    }
}
