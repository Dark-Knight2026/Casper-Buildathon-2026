use odra::{casper_types::U256, prelude::*, uints::ToU512, ContractRef};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::constants::{ONE_HUNDRED_PERCENT_BPS, STAKING_REWARDS_BPS};
use crate::staking::StakingContractRef;
use crate::treasury::{
    errors::Error,
    events::{ReservesWithdrawn, RewardsDeposited, TokenWithdrawn},
};

#[odra::module(errors = Error, events = [RewardsDeposited, ReservesWithdrawn, TokenWithdrawn])]
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

    /// Allows to receive CSPR tokens by this contract
    #[odra(payable)]
    pub fn receive(&self) {}

    /// Sets the Staking contract address by the owner
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);
    }

    /// Sets the TailorCoin (BIG) token contract address by the owner
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
    }

    /// Allows to deposit any rewards amount in the TailorCoin (BIG) token by anyone, then distributes these rewards
    /// between the Staking contract and internal reserves.
    ///
    /// If there is no active stake yet, the full deposit remains in Treasury reserves instead of reverting.
    #[odra(non_reentrant)]
    pub fn deposit_rewards(&mut self, amount: U256) {
        if amount > U256::zero() {
            let mut tailor_coin =
                Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address());
            let staking_rewards = amount * STAKING_REWARDS_BPS / ONE_HUNDRED_PERCENT_BPS;
            let staking_address = self.get_staking_contract_address();
            let mut staking = StakingContractRef::new(self.env(), staking_address);

            tailor_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);

            if !staking_rewards.is_zero() && !staking.get_total_staked().is_zero() {
                tailor_coin.approve(&staking_address, &staking_rewards);
                staking.deposit_rewards(staking_rewards);
            }

            self.env().emit_event(RewardsDeposited { amount });
        }
    }

    /// Allows to withdraw any available reserves amount by the owner
    #[odra(non_reentrant)]
    pub fn withdraw_reserves(&mut self, recipient: Address, amount: U256) {
        self.assert_owner();

        if self.get_reserves() < amount {
            self.env().revert(Error::NotEnoughReserves);
        }

        if amount > U256::zero() {
            Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address())
                .transfer(&recipient, &amount);

            self.env()
                .emit_event(ReservesWithdrawn { recipient, amount });
        }
    }

    /// Allows to withdraw any token that is stored on this contract except of the TailorCoin (BIG) token which is the
    /// reserves token. Only the owner can interact with this entrypoint
    #[odra(non_reentrant)]
    pub fn withdraw_token(&mut self, token: Option<Address>, amount: U256, recipient: Address) {
        self.assert_owner();

        if amount.is_zero() {
            self.env().revert(Error::InvalidWithdrawalAmount);
        }

        match token {
            None => {
                let amount = amount.to_u512();

                if amount > self.env().self_balance() {
                    self.env().revert(Error::InsufficientWithdrawalTokenAmount);
                }

                self.env().transfer_tokens(&recipient, &amount);
            }
            Some(token) => {
                if token == self.get_tailor_coin_contract_address() {
                    self.env()
                        .revert(Error::DirectReservesTokenWithdrawalIsNotAllowed);
                }

                let mut token = Cep18ContractRef::new(self.env(), token);

                if amount > token.balance_of(&self.env().self_address()) {
                    self.env().revert(Error::InsufficientWithdrawalTokenAmount);
                }

                token.transfer(&recipient, &amount);
            }
        }

        self.env().emit_event(TokenWithdrawn {
            token,
            amount,
            recipient,
        });
    }

    /// Returns the TailorCoin (BIG) token reserves stored on this contract and available to withdraw by the owner
    pub fn get_reserves(&self) -> U256 {
        Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address())
            .balance_of(&self.env().self_address())
    }

    /// Returns the Staking contract address
    pub fn get_staking_contract_address(&self) -> Address {
        self.staking
            .get_or_revert_with(Error::StakingContractIsNotSet)
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

impl Treasury {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
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

    #[odra::event]
    pub struct TokenWithdrawn {
        pub token: Option<Address>,
        pub amount: U256,
        pub recipient: Address,
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        TailorCoinContractIsNotSet = 200,
        StakingContractIsNotSet = 201,
        NotEnoughReserves = 202,
        InvalidWithdrawalAmount = 203,
        DirectReservesTokenWithdrawalIsNotAllowed = 204,
        InsufficientWithdrawalTokenAmount = 205,
    }
}
