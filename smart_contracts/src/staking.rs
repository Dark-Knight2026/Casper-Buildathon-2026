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

    /// Sets the TailorCoin (BIG) token contract address by the owner
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.tailor_coin.set(tailor_coin);
    }

    /// Allows to deposit any rewards amount in the TailorCoin (BIG) token by anyone, then distributes these rewards
    /// between all stakers in this contract proportionally to their shares
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

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        TailorCoinContractIsNotSet = 63_000,
    }
}

#[cfg(test)]
mod tests {
    use odra::host::{Deployer, HostEnv};
    use odra_modules::access::errors::Error as AccessError;

    use crate::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};

    use super::*;

    #[test]
    fn test_init_should_initialize_contract_properly() {
        let env = odra_test::env();
        let (staking, tailor_coin) = setup(&env);

        assert_eq!(staking.get_owner(), env.get_account(0), "Invalid owner");
        assert_eq!(
            staking.get_tailor_coin_contract_address(),
            tailor_coin.address(),
            "Invalid TailorCoin contract address"
        );
    }

    #[test]
    fn test_set_tailor_coin_should_revert_if_not_owner_is_calling() {
        let env = odra_test::env();
        let (mut staking, _) = setup(&env);

        env.set_caller(env.get_account(1));

        assert_eq!(
            staking.try_set_tailor_coin(env.get_account(1)).unwrap_err(),
            AccessError::CallerNotTheOwner.into(),
            "Should revert when is called by not the owner"
        );
    }

    #[test]
    fn test_set_tailor_coin_should_set_tailor_coin_properly() {
        let env = odra_test::env();
        let (mut staking, _) = setup(&env);
        let tailor_coin = env.get_account(10);

        staking.set_tailor_coin(tailor_coin);

        assert_eq!(
            staking.get_tailor_coin_contract_address(),
            tailor_coin,
            "Invalid TailorCoin contract address"
        );
    }

    fn setup(env: &HostEnv) -> (StakingHostRef, TailorCoinHostRef) {
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

        staking.set_tailor_coin(tailor_coin.address());

        (staking, tailor_coin)
    }
}
