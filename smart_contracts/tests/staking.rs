use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::staking::{events::*, Staking, StakingHostRef, StakingInitArgs};
use leasefi_contracts::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};

use crate::{
    staking::{self, errors::Error, UNBONDING_PERIOD},
    vesting::{self, Vesting, VestingInitArgs},
};

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

fn staking_amount() -> U256 {
    U256::from(1000u64) * U256::from(10).pow(U256::from(18))
}

fn rewards_amount() -> U256 {
    U256::from(400u64) * U256::from(10).pow(U256::from(18))
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
// set_vesting()
// =============================================================================

#[test]
fn test_set_vesting_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env());
    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.staking.try_set_vesting(ctx.users.alice).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by non-owner",
    );
}

#[test]
fn test_set_vesting_should_set_vesting_properly() {
    let mut ctx = setup(odra_test::env());
    let new_address = ctx.users.alice;

    ctx.staking.set_vesting(new_address);

    assert_eq!(
        ctx.staking.get_vesting_contract_address(),
        new_address,
        "Invalid Staking contract address",
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
    let stake_amount = staking_amount();
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

#[test]
fn test_get_pending_rewards_should_be_proportional_for_multiple_stakers() {
    let mut ctx = setup(odra_test::env());
    let alice_stake = staking_amount();
    let bob_stake = staking_amount() * 3;
    let rewards_amount = rewards_amount();

    let alice = ctx.users.alice;
    let bob = ctx.users.bob;

    // Fund and approve both users
    fund_and_approve(&mut ctx, alice, alice_stake);
    fund_and_approve(&mut ctx, bob, bob_stake);

    // Both stake
    stake_for(&mut ctx, alice, alice_stake);
    stake_for(&mut ctx, bob, bob_stake);

    // Owner deposits rewards
    ctx.env.set_caller(ctx.users.owner);
    ctx.tailor_coin
        .approve(&ctx.staking.address(), &rewards_amount);
    ctx.staking.deposit_rewards(rewards_amount);

    // Check rewards - alice has 25%, bob has 75%
    let alice_rewards = ctx.staking.get_pending_rewards(ctx.users.alice);
    let bob_rewards = ctx.staking.get_pending_rewards(ctx.users.bob);

    let expected_alice_rewards = rewards_amount / 4; // 25%
    let expected_bob_rewards = rewards_amount * 3 / 4; // 75%

    assert_eq!(
        alice_rewards, expected_alice_rewards,
        "Alice should get 25% of rewards"
    );
    assert_eq!(
        bob_rewards, expected_bob_rewards,
        "Bob should get 75% of rewards"
    );
}

// =============================================================================
// staking_for()
// =============================================================================

#[test]
fn test_stake_for_should_revert_if_amount_is_zero() {
    let mut ctx = setup(odra_test::env());
    let owner = ctx.users.owner;
    let amount = U256::zero();

    ctx.env.set_caller(owner);
    assert_eq!(
        ctx.staking.try_stake_for(owner, amount).unwrap_err(),
        Error::InvalidAmount.into(),
        "Should revert with zero amount",
    );
}

#[test]
fn test_stake_for_should_stake_properly() {
    let mut ctx = setup(odra_test::env());
    let staking_amount = staking_amount();
    let alice = ctx.users.alice;

    fund_and_approve(&mut ctx, alice, staking_amount);
    stake_for(&mut ctx, alice, staking_amount);

    let staker_info = ctx.staking.get_staker_info(alice);
    assert_eq!(staker_info.staked_amount, staking_amount);
    assert_eq!(ctx.staking.get_total_staked(), staking_amount);

    assert!(ctx.env.emitted_native_event(
        &ctx.staking.address(),
        Staked {
            staker: alice,
            amount: staking_amount,
        }
    ));
}

#[test]
fn test_stake_for_should_allow_thirdy_party_to_stake_on_behalf() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let alice = ctx.users.alice;
    let bob = ctx.users.bob;

    // Bob funds but stakes on Alice's behalf
    fund_and_approve(&mut ctx, bob, amount);
    ctx.env.set_caller(bob);
    ctx.staking.stake_for(alice, amount);

    // Alice has stake but Bob does not
    assert_eq!(ctx.staking.get_staker_info(alice).staked_amount, amount);
    assert_eq!(ctx.staking.get_staker_info(bob).staked_amount, U256::zero());
    assert_eq!(ctx.staking.get_total_staked(), amount);
}

#[test]
fn test_stake_for_should_checkpoint_rewards_before_updating_balance() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let rewards = rewards_amount();
    let owner = ctx.users.owner;
    let alice = ctx.users.alice;

    // Alice stakes, then rewards are deposited
    fund_and_approve(&mut ctx, alice, amount * 2);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(owner);
    ctx.tailor_coin.approve(&ctx.staking.address(), &rewards);
    ctx.staking.deposit_rewards(rewards);

    // Alice stakes again, rewards must be checkpointed before balances updates
    ctx.env.set_caller(alice);
    ctx.tailor_coin.approve(&ctx.staking.address(), &amount);
    ctx.staking.stake_for(alice, amount);

    // All rewards should be capture since Alice was the only staker
    assert_eq!(ctx.staking.get_pending_rewards(alice), rewards);
    assert_eq!(ctx.staking.get_total_staked(), amount * 2);
}

// =============================================================================
// unstaking_for()
// =============================================================================

#[test]
fn test_unstake_for_should_revert_if_amount_is_zero() {
    let mut ctx = setup(odra_test::env());
    let owner = ctx.users.owner;
    let amount = U256::zero();

    ctx.env.set_caller(owner);
    assert_eq!(
        ctx.staking.try_unstake_for(owner, amount).unwrap_err(),
        Error::InvalidAmount.into(),
    );
}

#[test]
fn test_unstake_for_should_revert_if_caller_not_authorized() {
    let mut ctx = setup(odra_test::env());
    let alice = ctx.users.alice;
    let bob = ctx.users.bob;

    fund_and_approve(&mut ctx, alice, staking_amount());
    stake_for(&mut ctx, alice, staking_amount());

    ctx.env.set_caller(bob);
    assert_eq!(
        ctx.staking
            .try_unstake_for(alice, staking_amount())
            .unwrap_err(),
        Error::CallerNotAuthorizedToUnstake.into(),
    );
}

#[test]
fn test_unstake_for_should_revert_if_nothing_staked() {
    let mut ctx = setup(odra_test::env());
    let alice = ctx.users.alice;

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.staking
            .try_unstake_for(alice, staking_amount())
            .unwrap_err(),
        Error::NothingStaked.into(),
    );
}

#[test]
fn test_unstake_for_should_revert_if_insufficient_amount() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let alice = ctx.users.alice;

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.staking.try_unstake_for(alice, amount + 1).unwrap_err(),
        Error::InsufficientStakedAmount.into(),
    );
}

#[test]
fn test_unstake_for_should_revert_if_unbonding_already_in_progress() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let alice = ctx.users.alice;

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(alice);
    ctx.staking.unstake_for(alice, amount / 2);

    assert_eq!(
        ctx.staking.try_unstake_for(alice, amount / 2).unwrap_err(),
        Error::UnbondingAlreadyInProgress.into()
    );
}

#[test]
fn test_unstake_for_should_unstake_properly() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let alice = ctx.users.alice;
    let unbonding_ends_at = ctx.env.block_time() + UNBONDING_PERIOD;
    let unstaked_amount = amount / 2;

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(alice);
    ctx.staking.unstake_for(alice, unstaked_amount);

    let staking_info = ctx.staking.get_staker_info(alice);
    assert_eq!(staking_info.staked_amount, amount - unstaked_amount);
    assert_eq!(staking_info.unbonding_amount, unstaked_amount);
    assert_eq!(staking_info.unbonding_ends_at, unbonding_ends_at);
    assert_eq!(ctx.staking.get_total_staked(), amount - unstaked_amount);

    assert!(ctx.env.emitted_native_event(
        &ctx.staking.address(),
        UnstakedInitiated {
            staker: alice,
            amount: unstaked_amount,
            unbonding_ends_at,
        }
    ));
}

#[test]
fn test_unstake_for_vesting_can_unstake_on_behalf() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let alice = ctx.users.alice;
    let vesting_mock = ctx.env.get_account(5);

    ctx.env.set_caller(ctx.users.owner);
    ctx.staking.set_vesting(vesting_mock);

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(vesting_mock);
    ctx.staking.unstake_for(alice, amount);

    let staking_info = ctx.staking.get_staker_info(alice);
    assert_eq!(staking_info.unbonding_amount, amount);
    assert_eq!(staking_info.staked_amount, U256::zero());
}

// =============================================================================
// deposit_rewards()
// =============================================================================

#[test]
fn test_deposit_rewards_should_revert_if_amount_is_zero() {
    let mut ctx = setup(odra_test::env());
    let owner = ctx.users.owner;
    let amount = U256::zero();

    ctx.env.set_caller(owner);
    assert_eq!(
        ctx.staking.try_deposit_rewards(amount).unwrap_err(),
        Error::InvalidAmount.into(),
    );
}

#[test]
fn test_deposit_rewards_should_revert_if_no_active_stake() {
    let mut ctx = setup(odra_test::env());
    let rewards = rewards_amount();

    assert_eq!(
        ctx.staking.try_deposit_rewards(rewards).unwrap_err(),
        Error::NoActiveStake.into(),
    );
}

#[test]
fn test_deposit_rewards_should_deposit_properly() {
    let mut ctx = setup(odra_test::env());
    let owner = ctx.users.owner;
    let alice = ctx.users.alice;
    let amount = staking_amount();
    let rewards = rewards_amount();
    let staking_contract = ctx.staking.address();

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    let prev_staking_bal = ctx.tailor_coin.balance_of(&staking_contract);

    // deposit rewards
    ctx.env.set_caller(owner);
    ctx.tailor_coin.approve(&staking_contract, &rewards);
    ctx.staking.deposit_rewards(rewards);

    let new_staking_bal = ctx.tailor_coin.balance_of(&staking_contract);

    assert_eq!(new_staking_bal, prev_staking_bal + rewards);

    assert_eq!(ctx.staking.get_pending_rewards(alice), rewards);

    assert!(ctx.env.emitted_native_event(
        &ctx.staking.address(),
        RewardsDeposited {
            caller: owner,
            amount: rewards,
        }
    ));
}

// =============================================================================
// claiming_rewards()
// =============================================================================

#[test]
fn test_claim_rewards_should_revert_if_no_rewards_to_claim() {
    let mut ctx = setup(odra_test::env());
    let alice = ctx.users.alice;
    let amount = staking_amount();

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.staking.try_claim_rewards().unwrap_err(),
        Error::NoRewardsToClaim.into(),
    );
}

#[test]
fn test_claim_rewards_should_claim_properly() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let rewards = rewards_amount();
    let owner = ctx.users.owner;
    let alice = ctx.users.alice;

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(owner);
    ctx.tailor_coin.approve(&ctx.staking.address(), &rewards);
    ctx.staking.deposit_rewards(rewards);

    let prev_balance = ctx.tailor_coin.balance_of(&alice);

    ctx.env.set_caller(alice);
    ctx.staking.claim_rewards();

    // Tokens transferred to staker
    assert_eq!(ctx.tailor_coin.balance_of(&alice), prev_balance + rewards);
    // Pending rewards cleared
    assert_eq!(ctx.staking.get_pending_rewards(alice), U256::zero());
    // Active stake unaffected
    assert_eq!(ctx.staking.get_staker_info(alice).staked_amount, amount);

    assert!(ctx.env.emitted_native_event(
        &ctx.staking.address(),
        RewardsClaimed {
            staker: alice,
            amount: rewards
        }
    ));
}

#[test]
fn test_claim_rewards_should_not_accrue_already_claimed_rewards() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let rewards = rewards_amount();
    let owner = ctx.users.owner;
    let alice = ctx.users.alice;

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    // First reward deposit
    ctx.env.set_caller(owner);
    ctx.tailor_coin.approve(&ctx.staking.address(), &rewards);
    ctx.staking.deposit_rewards(rewards);

    // First claim
    ctx.env.set_caller(alice);
    ctx.staking.claim_rewards();
    assert_eq!(ctx.staking.get_pending_rewards(alice), U256::zero());

    // Second reward deposit
    ctx.env.set_caller(owner);
    ctx.tailor_coin.approve(&ctx.staking.address(), &rewards);
    ctx.staking.deposit_rewards(rewards);

    // Only the second deposit should be pending, not both
    assert_eq!(ctx.staking.get_pending_rewards(alice), rewards);
}

// =============================================================================
// withdraw_unbonded()
// =============================================================================

#[test]
fn test_withdraw_unbonded_should_revert_if_no_unbonding_in_progress() {
    let mut ctx = setup(odra_test::env());
    let alice = ctx.users.alice;

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.staking.try_withdraw_unbonded().unwrap_err(),
        Error::NoUnbondingInProgress.into(),
    )
}

#[test]
fn test_withdraw_unbonded_should_revert_if_unbonding_period_not_finished() {
    let mut ctx = setup(odra_test::env());
    let alice = ctx.users.alice;
    let amount = staking_amount();

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(alice);
    ctx.staking.unstake_for(alice, amount);

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.staking.try_withdraw_unbonded().unwrap_err(),
        Error::UnbondingPeriodNotFinished.into(),
    )
}

#[test]
fn test_withdraw_unbonded_should_withdraw_properly() {
    let mut ctx = setup(odra_test::env());
    let amount = staking_amount();
    let unstake_amount = amount / 2;
    let alice = ctx.users.alice;

    fund_and_approve(&mut ctx, alice, amount);
    stake_for(&mut ctx, alice, amount);

    ctx.env.set_caller(alice);
    ctx.staking.unstake_for(alice, unstake_amount);

    ctx.env.advance_block_time(UNBONDING_PERIOD + 1);

    let prev_balance = ctx.tailor_coin.balance_of(&alice);

    ctx.env.set_caller(alice);
    ctx.staking.withdraw_unbonded();

    // Tokens returned to staker
    assert_eq!(
        ctx.tailor_coin.balance_of(&alice),
        prev_balance + unstake_amount
    );

    // Unbonding state cleared
    let staker_info = ctx.staking.get_staker_info(alice);
    assert_eq!(staker_info.unbonding_amount, U256::zero());
    assert_eq!(staker_info.unbonding_ends_at, 0);

    // Remaining active stake unaffected
    assert_eq!(staker_info.staked_amount, amount - unstake_amount);

    assert!(ctx.env.emitted_native_event(
        &ctx.staking.address(),
        UnbondedWithdrawn {
            staker: alice,
            amount: unstake_amount
        }
    ));
}
