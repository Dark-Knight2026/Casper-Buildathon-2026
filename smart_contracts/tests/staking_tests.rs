use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::staking::{Staking, StakingHostRef, StakingInitArgs};
use leasefi_contracts::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};

// =============================================================================
// Test Constants
// =============================================================================

// =============================================================================
// Test Context
// =============================================================================

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

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// init()
// =============================================================================

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

// =============================================================================
// set_tailor_coin()
// =============================================================================

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
