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
    /// between the Staking contract and internal reserves
    #[odra(non_reentrant)]
    pub fn deposit_rewards(&mut self, amount: U256) {
        if amount > U256::zero() {
            let mut tailor_coin =
                Cep18ContractRef::new(self.env(), self.get_tailor_coin_contract_address());
            let staking_rewards = amount * STAKING_REWARDS_BPS / ONE_HUNDRED_PERCENT_BPS;

            tailor_coin.transfer_from(&self.env().caller(), &self.env().self_address(), &amount);
            tailor_coin.approve(&self.get_staking_contract_address(), &staking_rewards);

            StakingContractRef::new(self.env(), self.get_staking_contract_address())
                .deposit_rewards(staking_rewards);

            self.env().emit_native_event(RewardsDeposited { amount });
        }
    }

    /// Allows to withdraw any available reserves amount by the owner
    pub fn withdraw_reserves(&mut self, recipient: Address, amount: U256) {
        self.assert_owner();

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

    /// Allows to withdraw any token that is stored on this contract except of the TailorCoin (BIG) token which is the
    /// reserves token. Only the owner can interact with this entrypoint
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

        self.env().emit_native_event(TokenWithdrawn {
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
        TailorCoinContractIsNotSet = 64_000,
        StakingContractIsNotSet = 64_001,
        NotEnoughReserves = 64_002,
        InvalidWithdrawalAmount = 64_003,
        DirectReservesTokenWithdrawalIsNotAllowed = 64_004,
        InsufficientWithdrawalTokenAmount = 64_005,
    }
}

#[cfg(test)]
mod tests {
    use odra::host::{Deployer, HostEnv};
    use odra_modules::access::errors::Error as AccessError;

    use crate::{
        staking::{Staking, StakingHostRef, StakingInitArgs},
        tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs},
    };

    use super::*;

    #[test]
    fn test_init_should_initialize_contract_properly() {
        let env = odra_test::env();
        let (treasury, staking, tailor_coin) = setup(&env);

        assert_eq!(treasury.get_owner(), env.get_account(0), "Invalid owner");
        assert_eq!(
            treasury.get_staking_contract_address(),
            staking.address(),
            "Invalid Staking contract address"
        );
        assert_eq!(
            treasury.get_tailor_coin_contract_address(),
            tailor_coin.address(),
            "Invalid TailorCoin contract address"
        );
    }

    #[test]
    fn test_set_staking_should_revert_if_not_owner_is_calling() {
        let env = odra_test::env();
        let (mut treasury, _, _) = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            treasury.try_set_staking(env.get_account(1)).unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_staking_should_set_staking_properly() {
        let env = odra_test::env();
        let (mut treasury, _, _) = setup(&env);
        let staking = env.get_account(10);

        treasury.set_staking(staking);

        assert_eq!(
            treasury.get_staking_contract_address(),
            staking,
            "Invalid Staking contract address"
        );
    }

    #[test]
    fn test_set_tailor_coin_should_revert_if_not_owner_is_calling() {
        let env = odra_test::env();
        let (mut treasury, _, _) = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            treasury
                .try_set_tailor_coin(env.get_account(1))
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_tailor_coin_should_set_tailor_coin_properly() {
        let env = odra_test::env();
        let (mut treasury, _, _) = setup(&env);
        let tailor_coin = env.get_account(10);

        treasury.set_tailor_coin(tailor_coin);

        assert_eq!(
            treasury.get_tailor_coin_contract_address(),
            tailor_coin,
            "Invalid TailorCoin contract address"
        );
    }

    #[test]
    fn test_deposit_rewards_should_deposit_rewards_properly() {
        let env = odra_test::env();
        let (mut treasury, staking, mut tailor_coin) = setup(&env);
        let rewards_amount = U256::from_dec_str("5000000000000000000").unwrap();
        let expected_staking_rewards =
            rewards_amount * STAKING_REWARDS_BPS / ONE_HUNDRED_PERCENT_BPS;
        let prev_user_balance = tailor_coin.balance_of(&env.caller());
        let prev_treasury_balance = tailor_coin.balance_of(&treasury.address());
        let prev_staking_balance = tailor_coin.balance_of(&staking.address());

        deposit_rewards(&rewards_amount, &mut tailor_coin, &mut treasury);

        let curr_user_balance = tailor_coin.balance_of(&env.caller());
        let curr_treasury_balance = tailor_coin.balance_of(&treasury.address());
        let curr_staking_balance = tailor_coin.balance_of(&staking.address());

        assert!(env.emitted_native_event(
            &treasury,
            RewardsDeposited {
                amount: rewards_amount
            }
        ));
        assert_eq!(
            treasury.get_reserves(),
            rewards_amount - expected_staking_rewards,
            "Invalid reserves balance"
        );
        assert_eq!(
            curr_user_balance,
            prev_user_balance - rewards_amount,
            "Invalid current user balance"
        );
        assert_eq!(
            curr_treasury_balance,
            prev_treasury_balance + rewards_amount - expected_staking_rewards,
            "Invalid current Treasury balance"
        );
        assert_eq!(
            curr_staking_balance,
            prev_staking_balance + expected_staking_rewards,
            "Invalid current Staking balance"
        );
    }

    #[test]
    fn test_withdraw_reserves_should_revert_if_not_owner_is_calling() {
        let env = odra_test::env();
        let (mut treasury, _, _) = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            treasury
                .try_withdraw_reserves(env.get_account(1), U256::zero())
                .unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_withdraw_reserves_should_fail_if_not_enough_reserves() {
        let env = odra_test::env();
        let (mut treasury, _, _) = setup(&env);

        assert_eq!(
            treasury
                .try_withdraw_reserves(treasury.get_owner(), U256::one())
                .unwrap_err(),
            Error::NotEnoughReserves.into(),
            "Should revert when not enough reserves"
        );
    }

    #[test]
    fn test_withdraw_reserves_should_withdraw_part_of_reserves_properly() {
        let env = odra_test::env();
        let (mut treasury, _, mut tailor_coin) = setup(&env);

        deposit_rewards(
            &U256::from_dec_str("10000000000000000000").unwrap(),
            &mut tailor_coin,
            &mut treasury,
        );

        let reserves_amount = treasury.get_reserves();
        let recipient = env.get_account(5);
        let amount_to_withdraw = reserves_amount / 2;
        let prev_recipient_balance = tailor_coin.balance_of(&recipient);
        let prev_treasury_balance = tailor_coin.balance_of(&treasury.address());

        treasury.withdraw_reserves(recipient, amount_to_withdraw);

        let curr_recipient_balance = tailor_coin.balance_of(&recipient);
        let curr_treasury_balance = tailor_coin.balance_of(&treasury.address());

        assert!(env.emitted_native_event(
            &treasury,
            ReservesWithdrawn {
                recipient,
                amount: amount_to_withdraw
            }
        ));
        assert_eq!(
            treasury.get_reserves(),
            reserves_amount - amount_to_withdraw,
            "Invalid reserves balance"
        );
        assert_eq!(
            curr_recipient_balance,
            prev_recipient_balance + amount_to_withdraw,
            "Invalid current recipient balance"
        );
        assert_eq!(
            curr_treasury_balance,
            prev_treasury_balance - amount_to_withdraw,
            "Invalid current Treasury balance"
        );
    }

    #[test]
    fn test_withdraw_reserves_should_withdraw_all_reserves_properly() {
        let env = odra_test::env();
        let (mut treasury, _, mut tailor_coin) = setup(&env);

        deposit_rewards(
            &U256::from_dec_str("20000000000000000000").unwrap(),
            &mut tailor_coin,
            &mut treasury,
        );

        let reserves_amount = treasury.get_reserves();
        let recipient = env.get_account(5);
        let prev_recipient_balance = tailor_coin.balance_of(&recipient);
        let prev_treasury_balance = tailor_coin.balance_of(&treasury.address());

        treasury.withdraw_reserves(recipient, reserves_amount);

        let curr_recipient_balance = tailor_coin.balance_of(&recipient);
        let curr_treasury_balance = tailor_coin.balance_of(&treasury.address());

        assert!(env.emitted_native_event(
            &treasury,
            ReservesWithdrawn {
                recipient,
                amount: reserves_amount
            }
        ));
        assert_eq!(
            treasury.get_reserves(),
            U256::zero(),
            "Invalid reserves balance"
        );
        assert_eq!(
            curr_recipient_balance,
            prev_recipient_balance + reserves_amount,
            "Invalid current recipient balance"
        );
        assert_eq!(
            curr_treasury_balance,
            prev_treasury_balance - reserves_amount,
            "Invalid current Treasury balance"
        );
    }

    fn setup(env: &HostEnv) -> (TreasuryHostRef, StakingHostRef, TailorCoinHostRef) {
        let mut treasury = Treasury::deploy(
            env,
            TreasuryInitArgs {
                owner: env.get_account(0),
            },
        );
        let tailor_coin = TailorCoin::deploy(
            env,
            TailorCoinInitArgs {
                symbol: String::from("BIG"),
                name: String::from("BIG"),
                decimals: 18,
                initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
            },
        );
        let mut staking = Staking::deploy(
            env,
            StakingInitArgs {
                owner: env.get_account(0),
            },
        );

        treasury.set_tailor_coin(tailor_coin.address());
        treasury.set_staking(staking.address());

        staking.set_tailor_coin(tailor_coin.address());

        (treasury, staking, tailor_coin)
    }

    fn deposit_rewards(
        rewards_amount: &U256,
        tailor_coin: &mut TailorCoinHostRef,
        treasury: &mut TreasuryHostRef,
    ) {
        tailor_coin.approve(&treasury.address(), rewards_amount);
        treasury.deposit_rewards(*rewards_amount);
    }
}
