use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::staking::{Staking, StakingHostRef, StakingInitArgs};
use leasefi_contracts::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};

use crate::vesting::{Vesting, VestingInitArgs};

// =============================================================================
// Test Constants
// =============================================================================

const INITIAL_SUPPLY: u64 = 5_000_000_000;

/// Initial supply converted into wei
fn initial_supply() -> U256 {
    U256::from(INITIAL_SUPPLY) * U256::from(10).pow(U256::from(18))
}

// =============================================================================
// Test Context
// =============================================================================

struct Users {
    owner: Address,
    alice: Address,
    bob: Address,
}

struct Context {
    env: HostEnv,
    tailor_coin: TailorCoinHostRef,
    staking: StakingHostRef,
    vesting: Address,
    users: Users,
}

fn setup(env: HostEnv) -> Context {
    let users = Users {
        owner: env.get_account(0),
        alice: env.get_account(1),
        bob: env.get_account(2),
    };

    let tailor_coin = TailorCoin::deploy(
        &env,
        TailorCoinInitArgs {
            symbol: String::from("BIG"),
            name: String::from("BIG"),
            decimals: 18,
            initial_supply: initial_supply(),
        },
    );

    let mut staking = Staking::deploy(&env, StakingInitArgs { owner: users.owner });
    let vesting = Vesting::deploy(&env, VestingInitArgs { owner: users.owner });

    staking.set_tailor_coin(tailor_coin.address());
    staking.set_vesting(vesting.address());

    Context {
        env,
        tailor_coin,
        staking,
        vesting: vesting.address(),
        users,
    }
}

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// init()
// =============================================================================

#[test]
fn test_init_should_initialize_contract_properly() {
    let ctx = setup(odra_test::env());

    assert_eq!(ctx.staking.get_owner(), ctx.users.owner, "Invalid owner");
    assert_eq!(
        ctx.staking.get_tailor_coin_contract_address(),
        ctx.tailor_coin.address(),
        "Invalid TailorCoin contract address"
    );
    assert_eq!(
        ctx.staking.get_vesting_contract_address(),
        ctx.vesting,
        "Invalid Vesting contract address"
    );
}

// =============================================================================
// set_tailor_coin()
// =============================================================================

#[test]
fn test_set_tailor_coin_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.staking
            .try_set_tailor_coin(ctx.users.alice)
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_tailor_coin_should_set_tailor_coin_properly() {
    let mut ctx = setup(odra_test::env());

    let tailor_coin = ctx.env.get_account(10);

    ctx.staking.set_tailor_coin(tailor_coin);

    assert_eq!(
        ctx.staking.get_tailor_coin_contract_address(),
        tailor_coin,
        "Invalid TailorCoin contract address"
    );
}
