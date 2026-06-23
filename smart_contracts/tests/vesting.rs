use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::big_coin::{BigCoin, BigCoinHostRef, BigCoinInitArgs};
use leasefi_contracts::constants::{
    ONE_MONTH_IN_MILLISECONDS, PRIVATE_SALE_CLIFF_DURATION, PRIVATE_SALE_VESTING_DURATION,
};
use leasefi_contracts::staking::{
    errors::Error::UnstakeBlockedByVestingLock, Staking, StakingHostRef, StakingInitArgs,
};
use leasefi_contracts::vesting::{
    errors::Error,
    events::{ScheduleCreated, StakingSet, TokensClaimed},
    Vesting, VestingHostRef, VestingId, VestingInitArgs,
};

use crate::constants::UNBONDING_PERIOD;

// =============================================================================
// Test Constants
// =============================================================================

const INITIAL_SUPPLY: u64 = 5_000_000_000;

/// Initial supply converted into wei
fn initial_supply() -> U256 {
    U256::from(INITIAL_SUPPLY) * U256::from(10).pow(U256::from(18))
}

/// Some vesting amount for tests: 1000 tokens converted to wei
fn vesting_amount() -> U256 {
    U256::from(1000u64) * U256::from(10).pow(U256::from(18))
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
    big_coin: BigCoinHostRef,
    vesting: VestingHostRef,
    staking: StakingHostRef,
    users: Users,
    cliff_duration: u64,
    vesting_duration: u64,
}

fn setup(env: HostEnv) -> Context {
    let users = Users {
        owner: env.get_account(0),
        alice: env.get_account(1),
        bob: env.get_account(2),
    };

    let big_coin = BigCoin::deploy(
        &env,
        BigCoinInitArgs {
            symbol: String::from("BIG"),
            name: String::from("BIG"),
            decimals: 18,
            initial_supply: initial_supply(),
        },
    );

    let mut vesting = Vesting::deploy(&env, VestingInitArgs { owner: users.owner });
    let mut staking = Staking::deploy(&env, StakingInitArgs { owner: users.owner });

    vesting.add_whitelisted_creator(users.owner);
    vesting.set_staking(staking.address());

    staking.set_big_coin(big_coin.address());
    staking.set_vesting(vesting.address());

    Context {
        env,
        big_coin,
        vesting,
        staking,
        users,
        cliff_duration: PRIVATE_SALE_CLIFF_DURATION,
        vesting_duration: PRIVATE_SALE_VESTING_DURATION,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn create_test_schedule(
    ctx: &mut Context,
    beneficiary: Address,
    total_amount: U256,
    cliff_duration: u64,
    vesting_duration: u64,
) -> VestingId {
    ctx.env.set_caller(ctx.users.owner);

    ctx.big_coin.approve(&ctx.staking.address(), &total_amount);
    ctx.staking.stake_for(beneficiary, total_amount);

    ctx.vesting
        .create_schedule(beneficiary, total_amount, cliff_duration, vesting_duration)
}

// =============================================================================
// init()
// =============================================================================

#[test]
fn test_init_should_initialize_contract_properly() {
    let ctx = setup(odra_test::env());

    assert_eq!(ctx.vesting.get_owner(), ctx.users.owner, "Invalid Owner");
    assert_eq!(
        ctx.vesting.get_schedules_count(),
        U256::zero(),
        "Should start with zero schedules"
    );
}

// =============================================================================
// set_staking()
// =============================================================================

#[test]
fn test_set_staking_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env());
    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.vesting.try_set_staking(ctx.users.alice).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by non-owner",
    );
}

#[test]
fn test_set_staking_should_set_staking_properly() {
    let mut ctx = setup(odra_test::env());
    let new_address = ctx.users.alice;

    ctx.vesting.set_staking(new_address);

    assert_eq!(
        ctx.vesting.get_staking_contract_address(),
        new_address,
        "Invalid Staking contract address",
    );

    assert!(ctx.env.emitted_event(
        &ctx.vesting,
        StakingSet { staking: new_address }
    ));
}

// =============================================================================
// add/remove_whitelisted_creator()
// =============================================================================

#[test]
fn test_add_whitelisted_creator_should_revert_if_not_owner_calling() {
    let mut ctx = setup(odra_test::env());
    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.vesting
            .try_add_whitelisted_creator(ctx.users.alice)
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by non-owner",
    )
}

#[test]
fn test_add_whitelisted_creator_should_add_properly() {
    let mut ctx = setup(odra_test::env());
    ctx.env.set_caller(ctx.users.owner);

    assert!(
        !ctx.vesting.is_whitelisted_creator(&ctx.users.alice),
        "Alice should not initially be whitelisted",
    );

    ctx.vesting.add_whitelisted_creator(ctx.users.alice);
    assert!(
        ctx.vesting.is_whitelisted_creator(&ctx.users.alice),
        "Alice should be whitelisted",
    );
}

#[test]
fn test_remove_whitelisted_creator_should_remove_properly() {
    let mut ctx = setup(odra_test::env());
    ctx.env.set_caller(ctx.users.owner);

    // Owner was whitelisted in the setup
    assert!(
        ctx.vesting.is_whitelisted_creator(&ctx.users.owner),
        "Owner should be whitelisted",
    );

    ctx.vesting.remove_whitelisted_creator(ctx.users.owner);
    assert!(
        !ctx.vesting.is_whitelisted_creator(&ctx.users.owner),
        "Owner should no longer be whitelisted",
    );
}

// =============================================================================
// create_schedule()
// =============================================================================

#[test]
fn test_create_schedule_should_revert_if_not_whitelisted() {
    let mut ctx = setup(odra_test::env());
    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.vesting
            .try_create_schedule(
                ctx.users.alice,
                vesting_amount(),
                ctx.cliff_duration,
                ctx.vesting_duration
            )
            .unwrap_err(),
        Error::CallerNotWhitelisted.into(),
        "Should revert when caller is not whitelisted",
    )
}

#[test]
fn test_create_schedule_should_revert_if_amount_is_zero() {
    let mut ctx = setup(odra_test::env());

    assert_eq!(
        ctx.vesting
            .try_create_schedule(
                ctx.users.alice,
                U256::zero(),
                ctx.cliff_duration,
                ctx.vesting_duration,
            )
            .unwrap_err(),
        Error::InvalidAmount.into(),
        "Should revert with zero amount"
    )
}

#[test]
fn test_create_schedule_should_revert_if_vesting_duration_is_zero() {
    let mut ctx = setup(odra_test::env());

    assert_eq!(
        ctx.vesting
            .try_create_schedule(ctx.users.alice, vesting_amount(), 0, 0)
            .unwrap_err(),
        Error::InvalidVestingDuration.into(),
        "Should revert with zero vesting duration"
    )
}

#[test]
fn test_create_schedule_should_revert_if_cliff_exceeds_duration() {
    let mut ctx = setup(odra_test::env());

    let cliff_duration = ctx.vesting_duration + ONE_MONTH_IN_MILLISECONDS;

    assert_eq!(
        ctx.vesting
            .try_create_schedule(
                ctx.users.alice,
                vesting_amount(),
                cliff_duration,
                ctx.vesting_duration,
            )
            .unwrap_err(),
        Error::CliffExceedsVestingDuration.into(),
        "Should revert if cliff duration exceeds vesting duration"
    )
}

#[test]
fn test_create_schedule_should_create_properly() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let prev_owner_balance = ctx.big_coin.balance_of(&ctx.users.owner);
    let prev_staking_balance = ctx.big_coin.balance_of(&ctx.staking.address());

    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    // Verify schedule ID.
    assert_eq!(vesting_id, U256::zero(), "First schedule should have ID 0");
    assert_eq!(
        ctx.vesting.get_schedules_count(),
        U256::from(1),
        "Schedules count should be 1"
    );

    let current_owner_balance = ctx.big_coin.balance_of(&ctx.users.owner);
    let current_staking_balance = ctx.big_coin.balance_of(&ctx.staking.address());
    assert_eq!(
        current_owner_balance,
        prev_owner_balance - vesting_amount(),
        "Owner should send tokens to staking on schedule creation"
    );
    assert_eq!(
        current_staking_balance,
        prev_staking_balance + vesting_amount(),
        "Staking contract should hold the tokens"
    );

    // Verified stored data
    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(schedule.beneficiary, alice, "Invalid beneficiary");
    assert_eq!(
        schedule.total_amount,
        vesting_amount(),
        "Invalid total amount"
    );
    assert_eq!(
        schedule.unstaked_amount,
        U256::zero(),
        "Unstaked should be zero"
    );
    assert_eq!(schedule.cliff_duration, cliff, "Invalid Cliff duration");
    assert_eq!(
        schedule.vesting_duration, vesting,
        "Invalid Vesting duration"
    );

    // Verify user tracking
    assert_eq!(
        ctx.vesting.get_user_schedules_count(alice),
        1,
        "Alice should have 1 schedule"
    );

    // Verify event.
    assert!(
        ctx.env.emitted_event(
            &ctx.vesting,
            ScheduleCreated {
                vesting_id,
                whitelisted_creator: ctx.users.owner,
                beneficiary: ctx.users.alice,
                total_amount: vesting_amount(),
                start_timestamp: ctx.env.block_time(),
                cliff_duration: cliff,
                vesting_duration: vesting,
            }
        ),
        "ScheduleCreated event should be emitted"
    );
}

#[test]
fn test_create_schedule_should_support_multiple_schedules_per_user() {
    let mut ctx = setup(odra_test::env());
    let amount = vesting_amount();
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let id_0 = create_test_schedule(&mut ctx, alice, amount, cliff, vesting);
    let id_1 = create_test_schedule(
        &mut ctx,
        alice,
        amount,
        cliff + 3 * ONE_MONTH_IN_MILLISECONDS,
        vesting + 6 * ONE_MONTH_IN_MILLISECONDS,
    );

    assert_eq!(id_0, U256::zero(), "First schedule ID should be 0");
    assert_eq!(id_1, U256::from(1), "Second schedule ID should be 1");
    assert_eq!(
        ctx.vesting.get_schedules_count(),
        U256::from(2),
        "Total schedules should be 2"
    );
    assert_eq!(
        ctx.vesting.get_user_schedules_count(alice),
        2,
        "Alice should have 2 schedules"
    );
}

// =============================================================================
// claim()
// =============================================================================

#[test]
fn test_claim_should_revert_if_schedule_not_found() {
    let mut ctx = setup(odra_test::env());
    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.vesting.try_claim(U256::from(999)).unwrap_err(),
        Error::ScheduleNotFound.into(),
        "Should revert when schedule does not exist"
    );
}

#[test]
fn test_claim_should_revert_if_caller_not_beneficiary() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    ctx.env
        .advance_block_time(cliff + ONE_MONTH_IN_MILLISECONDS);

    // Bob tries to claim Alice's schedule
    ctx.env.set_caller(ctx.users.bob);

    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::CallerNotBeneficiary.into(),
        "Should revert when caller is not the beneficiary"
    );
}

#[test]
fn test_claim_should_revert_if_still_in_cliff_period() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    // Advance to just before the cliff
    ctx.env
        .advance_block_time(cliff - ONE_MONTH_IN_MILLISECONDS);

    ctx.env.set_caller(alice);

    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::NothingToClaim.into(),
        "Should revert if still in the cliff period"
    );
}

#[test]
fn test_claim_should_revert_if_active_unbonding_from_direct_staking() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;
    let stake_amount = vesting_amount();

    // Alice stakes directly (outside of vesting)
    ctx.env.set_caller(ctx.users.owner);
    ctx.big_coin.transfer(&alice, &stake_amount);

    ctx.env.set_caller(alice);
    ctx.big_coin.approve(&ctx.staking.address(), &stake_amount);
    ctx.staking.stake_for(alice, stake_amount);

    // Alice initiates unstaking directly via staking contract
    ctx.staking.unstake_for(alice, stake_amount / 2);

    // Verify Alice has an active unbonding position
    let staker_info = ctx.staking.get_staker_info(alice);
    assert!(
        !staker_info.unbonding_amount.is_zero(),
        "Alice should have an active unbonding position"
    );

    // Create a vesting schedule for Alice
    ctx.env.set_caller(ctx.users.owner);
    ctx.big_coin.approve(&ctx.staking.address(), &stake_amount);
    ctx.staking.stake_for(alice, stake_amount);

    let vesting_id = ctx
        .vesting
        .create_schedule(alice, stake_amount, cliff, vesting);

    // Advance past cliff into the linear vesting window
    ctx.env.advance_block_time(cliff + ONE_MONTH_IN_MILLISECONDS);

    // Try to claim from vesting while having active unbonding from direct staking
    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::ClaimBlockedByActiveUnbonding.into(),
        "Should revert when beneficiary has active unbonding from direct staking"
    );
}

#[test]
fn test_claim_should_have_zero_claimable_just_before_cliff() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    ctx.env.advance_block_time(cliff - 1);

    assert_eq!(
        ctx.vesting.get_claimable_amount(vesting_id),
        U256::zero(),
        "Nothing should be claimable just before the cliff boundary"
    );
    assert_eq!(
        ctx.vesting.get_vested_amount(vesting_id),
        U256::zero(),
        "Nothing should be vested just before the cliff boundary"
    );

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::NothingToClaim.into(),
        "Claim should revert just before the cliff boundary"
    );
}

#[test]
fn test_claim_should_update_unstaked_amount_after_cliff() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;
    let total = vesting_amount();
    let linear_duration = vesting - cliff;

    let vesting_id = create_test_schedule(&mut ctx, alice, total, cliff, vesting);

    // At exactly the cliff boundary, linear vesting has not started yet.
    ctx.env.advance_block_time(cliff);
    assert_eq!(
        ctx.vesting.get_claimable_amount(vesting_id),
        U256::zero(),
        "Nothing should be claimable at the cliff boundary"
    );

    // One month into the post-cliff linear window.
    ctx.env.advance_block_time(ONE_MONTH_IN_MILLISECONDS);
    let expected_claim = total * U256::from(ONE_MONTH_IN_MILLISECONDS) / U256::from(linear_duration);

    ctx.env.set_caller(alice);
    ctx.vesting.claim(vesting_id);

    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(
        schedule.unstaked_amount, expected_claim,
        "Unstaked amount should reflect one month of post-cliff linear vesting"
    );

    assert!(
        ctx.env.emitted_event(
            &ctx.vesting,
            TokensClaimed {
                vesting_id,
                beneficiary: alice,
                amount: expected_claim,
            }
        ),
        "TokensClaimed event should be emitted",
    );
}

#[test]
fn test_claim_should_increase_beneficiary_balance_by_unstaked_amount() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    let total = vesting_amount();
    let linear_duration = vesting - cliff;

    // One month into the post-cliff linear window.
    ctx.env.advance_block_time(cliff + ONE_MONTH_IN_MILLISECONDS);

    let prev_alice_balance = ctx.big_coin.balance_of(&alice);
    let prev_staking_balance = ctx.big_coin.balance_of(&ctx.staking.address());

    // Claim initiates unstaking (enters unbonding period)
    ctx.env.set_caller(alice);
    ctx.vesting.claim(vesting_id);

    let expected_claim = total * U256::from(ONE_MONTH_IN_MILLISECONDS) / U256::from(linear_duration);

    // Balance should not increase yet, tokens are in unbonding
    let mid_alice_balance = ctx.big_coin.balance_of(&alice);
    assert_eq!(
        mid_alice_balance, prev_alice_balance,
        "Balance should not increase immediately after claim, tokens are unbonding"
    );

    ctx.env.advance_block_time(UNBONDING_PERIOD + 1);

    // Now withdraw the unbonded tokens
    ctx.env.set_caller(alice);
    ctx.staking.withdraw_unbonded();

    // Verify beneficiary balance increased
    let curr_alice_balance = ctx.big_coin.balance_of(&alice);
    let curr_staking_balance = ctx.big_coin.balance_of(&ctx.staking.address());

    assert_eq!(
        curr_alice_balance,
        prev_alice_balance + expected_claim,
        "Beneficiary balance should increase by claimed amount after withdrawing unbonded"
    );
    assert_eq!(
        curr_staking_balance,
        prev_staking_balance - expected_claim,
        "Staking contract balance should decrease by claimed amount"
    );

    // Verify schedule state
    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(
        schedule.unstaked_amount, expected_claim,
        "Unstaked amount should be tracked in schedule"
    );
}

#[test]
fn test_claim_should_claim_full_amt_after_vesting_ends() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    ctx.env
        .advance_block_time(vesting + ONE_MONTH_IN_MILLISECONDS);
    ctx.env.set_caller(alice);
    ctx.vesting.claim(vesting_id);

    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();

    assert_eq!(
        schedule.unstaked_amount,
        vesting_amount(),
        "Unstaked amt should equal total amount",
    );

    // Withdraw unbonded tokens
    ctx.env.advance_block_time(UNBONDING_PERIOD + 1);
    ctx.env.set_caller(alice);
    ctx.staking.withdraw_unbonded();

    // Nothing left to claim
    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::NothingToClaim.into(),
        "Should revert when fully claimed",
    );
}

#[test]
fn test_claim_should_allow_incremental_claims() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;

    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    let total = vesting_amount();

    // First claim at 9 months (50% vested: 3 of 6 post-cliff months elapsed)
    ctx.env.advance_block_time(9 * ONE_MONTH_IN_MILLISECONDS);
    ctx.env.set_caller(alice);
    ctx.vesting.claim(vesting_id);

    let first_claim = total / U256::from(2u64);
    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(
        schedule.unstaked_amount, first_claim,
        "First claim should be 50%",
    );

    // Withdraw and make second claim at end of vesting (100% vested)
    ctx.env.advance_block_time(3 * ONE_MONTH_IN_MILLISECONDS);
    ctx.env.set_caller(alice);
    ctx.staking.withdraw_unbonded();
    ctx.env.set_caller(alice);
    ctx.vesting.claim(vesting_id);

    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(
        schedule.unstaked_amount, total,
        "Second claim should complete full vesting",
    );

    // Withdraw final unbonded tokens, then verify NothingToClaim
    ctx.env.advance_block_time(UNBONDING_PERIOD + 1);
    ctx.env.set_caller(alice);
    ctx.staking.withdraw_unbonded();

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::NothingToClaim.into(),
        "Should revert when nothing to claim",
    );
}

#[test]
fn test_claim_end_to_end_lifecycle() {
    let mut ctx = setup(odra_test::env());
    let cliff = ctx.cliff_duration;
    let vesting = ctx.vesting_duration;
    let alice = ctx.users.alice;
    let total_amount = vesting_amount();

    let start_time = ctx.env.block_time();
    let vesting_id = create_test_schedule(&mut ctx, alice, vesting_amount(), cliff, vesting);

    // Advanced to just before the cliff period ends
    ctx.env.advance_block_time(5 * ONE_MONTH_IN_MILLISECONDS);

    // Try claiming before the cliff period has ended
    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::NothingToClaim.into(),
        "Should revert when claiming before cliff period has ended",
    );

    // Advanced to exactly to the cliff end
    ctx.env.advance_block_time(ONE_MONTH_IN_MILLISECONDS);
    let cliff_time = start_time + cliff;
    assert_eq!(ctx.env.block_time(), cliff_time, "Should be at cliff time");

    // At the cliff boundary, linear vesting has not started yet.
    assert_eq!(
        ctx.vesting.get_vested_amount(vesting_id),
        U256::zero(),
        "Nothing should be vested at the cliff boundary",
    );
    assert_eq!(
        ctx.vesting.get_claimable_amount(vesting_id),
        U256::zero(),
        "Nothing should be claimable at the cliff boundary",
    );

    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::NothingToClaim.into(),
        "Claim should revert at the cliff boundary",
    );

    // Advance to 9 months (50% vested: 3 of 6 post-cliff months elapsed)
    ctx.env.advance_block_time(3 * ONE_MONTH_IN_MILLISECONDS);

    let expected_vested_at_9mo = total_amount / U256::from(2u64);

    assert_eq!(
        ctx.vesting.get_vested_amount(vesting_id),
        expected_vested_at_9mo,
        "Should be 50% vested at 9 months",
    );

    assert_eq!(
        ctx.vesting.get_claimable_amount(vesting_id),
        expected_vested_at_9mo,
        "All vested tokens should be claimable at 9 months",
    );

    ctx.env.set_caller(alice);
    ctx.vesting.claim(vesting_id);
    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(
        schedule.unstaked_amount, expected_vested_at_9mo,
        "Total unstaked so far should be 50%",
    );

    // Wait out unbonding, then advance to the full vesting period (12 months)
    ctx.env.advance_block_time(UNBONDING_PERIOD + 1);
    ctx.env.set_caller(alice);
    ctx.staking.withdraw_unbonded();

    let vesting_end_time = start_time + vesting;
    let remaining_to_vesting_end = vesting_end_time - ctx.env.block_time();
    ctx.env.advance_block_time(remaining_to_vesting_end);
    assert_eq!(
        ctx.env.block_time(),
        vesting_end_time,
        "Should be at the vesting end time"
    );

    assert_eq!(
        ctx.vesting.get_vested_amount(vesting_id),
        total_amount,
        "Should be 100% vested at 12 months",
    );

    // Should be 50% more left to claim
    let last_claimable = total_amount - expected_vested_at_9mo;
    assert_eq!(
        ctx.vesting.get_claimable_amount(vesting_id),
        last_claimable,
        "Should have remaining 50% left to be claimed",
    );

    // Claim the remaining tokens
    ctx.env.set_caller(alice);
    ctx.vesting.claim(vesting_id);
    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(
        schedule.unstaked_amount, total_amount,
        "All the tokens should be unstaked",
    );

    // Advance past vesting and unbonding period
    ctx.env
        .advance_block_time(ONE_MONTH_IN_MILLISECONDS + UNBONDING_PERIOD + 1);

    // Withdraw unbonded tokens from the final claim
    ctx.env.set_caller(alice);
    ctx.staking.withdraw_unbonded();

    // Try to claim past the vesting period
    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.vesting.try_claim(vesting_id).unwrap_err(),
        Error::NothingToClaim.into(),
        "Should revert when all tokens have been claimed",
    );

    // Verify the entire final state
    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();
    assert_eq!(schedule.beneficiary, alice);
    assert_eq!(schedule.total_amount, total_amount);
    assert_eq!(schedule.unstaked_amount, total_amount);
    assert_eq!(schedule.start_timestamp, start_time);
    assert_eq!(schedule.cliff_duration, cliff);
    assert_eq!(schedule.vesting_duration, vesting);
}

#[test]
fn test_beneficiary_cannot_bypass_cliff_via_direct_unstake() {
    let mut ctx = setup(odra_test::env());
    let alice = ctx.users.alice;
    let cliff_duration = ctx.cliff_duration;
    let vesting_duration = ctx.vesting_duration;
    let amt = vesting_amount();

    create_test_schedule(&mut ctx, alice, amt, cliff_duration, vesting_duration);

    // Alice tries to unstake thru staking contract during the cliff, but its blocked
    ctx.env.set_caller(alice);
    assert_eq!(
        ctx.staking.try_unstake_for(alice, amt).unwrap_err(),
        UnstakeBlockedByVestingLock.into(),
    );
}
