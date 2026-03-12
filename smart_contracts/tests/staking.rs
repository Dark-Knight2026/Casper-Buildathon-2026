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

/// Helper to give tokens to a user and approve staking contract to spend them
fn fund_and_approve(ctx: &mut Context, user: Address, amount: U256) {
    // Owner transfers tokens to user
    ctx.env.set_caller(ctx.users.owner);
    ctx.tailor_coin.transfer(&user, &amount);

    // User approves staking contract
    ctx.env.set_caller(user);
    ctx.tailor_coin.approve(&ctx.staking.address(), &amount);
}

/// Helper to stake tokens for a user
fn stake_for(ctx: &mut Context, staker: Address, amount: U256) {
    ctx.env.set_caller(staker);
    ctx.staking.stake_for(staker, amount);
}

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

// =============================================================================
// get_pending_rewards()
// =============================================================================

#[test]
fn test_get_pending_rewards_should_return_zero_for_new_staker() {
    let ctx = setup(odra_test::env());

    let pending_rewards = ctx.staking.get_pending_rewards(ctx.users.alice);

    assert_eq!(
        pending_rewards,
        U256::zero(),
        "Pending rewards should be zero for a new staker"
    );
}

#[test]
fn test_get_pending_rewards_should_return_zero_after_staking_without_rewards() {
    let mut ctx = setup(odra_test::env());
    let stake_amount = U256::from(1000) * U256::from(10).pow(U256::from(18));
    let alice = ctx.users.alice;

    // Fund, approve and stake for Alice
    fund_and_approve(&mut ctx, alice, stake_amount);
    stake_for(&mut ctx, alice, stake_amount);

    let pending_rewards = ctx.staking.get_pending_rewards(alice);

    assert_eq!(
        pending_rewards,
        U256::zero(),
        "Pending rewards should be zero after staking when no rewards have been added deposited",
    );
}
