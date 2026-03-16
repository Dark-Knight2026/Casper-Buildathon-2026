use odra::{
    casper_types::{U256, U512},
    host::{Deployer, HostEnv, HostRef},
    prelude::Addressable,
    uints::ToU256,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::constants::{ONE_HUNDRED_PERCENT_BPS, STAKING_REWARDS_BPS};
use leasefi_contracts::staking::{Staking, StakingHostRef, StakingInitArgs};
use leasefi_contracts::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};
use leasefi_contracts::treasury::{
    errors::Error,
    events::{ReservesWithdrawn, RewardsDeposited, TokenWithdrawn},
    Treasury, TreasuryHostRef, TreasuryInitArgs,
};

fn setup(
    env: &HostEnv,
) -> (
    TreasuryHostRef,
    StakingHostRef,
    TailorCoinHostRef,
    TailorCoinHostRef,
) {
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
    let mock_cep18 = TailorCoin::deploy(
        env,
        TailorCoinInitArgs {
            symbol: String::from("MOCK"),
            name: String::from("MOCK"),
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

    (treasury, staking, tailor_coin, mock_cep18)
}

fn deposit_rewards(
    rewards_amount: &U256,
    tailor_coin: &mut TailorCoinHostRef,
    treasury: &mut TreasuryHostRef,
) {
    tailor_coin.approve(&treasury.address(), rewards_amount);
    treasury.deposit_rewards(*rewards_amount);
}

#[test]
fn test_init_should_initialize_contract_properly() {
    let env = odra_test::env();
    let (treasury, staking, tailor_coin, _) = setup(&env);

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
    let (mut treasury, _, _, _) = setup(&env);

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
    let (mut treasury, _, _, _) = setup(&env);
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
    let (mut treasury, _, _, _) = setup(&env);

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
    let (mut treasury, _, _, _) = setup(&env);
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
    let (mut treasury, staking, mut tailor_coin, _) = setup(&env);
    let rewards_amount = U256::from_dec_str("5000000000000000000").unwrap();
    let expected_staking_rewards = rewards_amount * STAKING_REWARDS_BPS / ONE_HUNDRED_PERCENT_BPS;
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
    let (mut treasury, _, _, _) = setup(&env);

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
    let (mut treasury, _, _, _) = setup(&env);

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
    let (mut treasury, _, mut tailor_coin, _) = setup(&env);

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
    let (mut treasury, _, mut tailor_coin, _) = setup(&env);

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

#[test]
fn test_withdraw_token_should_revert_if_not_owner_is_calling() {
    let env = odra_test::env();
    let (mut treasury, _, _, _) = setup(&env);

    env.set_caller(env.get_account(1));

    assert_eq!(
        treasury
            .try_withdraw_token(None, U256::zero(), env.get_account(1))
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_withdraw_token_should_revert_if_withdrawal_amount_is_zero() {
    let env = odra_test::env();
    let (mut treasury, _, _, _) = setup(&env);

    assert_eq!(
        treasury
            .try_withdraw_token(None, U256::zero(), env.get_account(1))
            .unwrap_err(),
        Error::InvalidWithdrawalAmount.into(),
        "Should revert when withdrawal amount is zero"
    );
}

#[test]
fn test_withdraw_token_should_revert_if_withdrawal_cspr_token_amount_is_gt_available_balance() {
    let env = odra_test::env();
    let (mut treasury, _, _, _) = setup(&env);

    assert_eq!(
        treasury
            .try_withdraw_token(None, U256::one(), env.get_account(1))
            .unwrap_err(),
        Error::InsufficientWithdrawalTokenAmount.into(),
        "Should revert when CSPR token withdrawal amount is greater than available balance"
    );
}

#[test]
fn test_withdraw_token_should_revert_if_withdrawal_cep18_token_is_reserves_token() {
    let env = odra_test::env();
    let (mut treasury, _, tailor_coin, _) = setup(&env);

    assert_eq!(
        treasury
            .try_withdraw_token(Some(tailor_coin.address()), U256::one(), env.get_account(1))
            .unwrap_err(),
        Error::DirectReservesTokenWithdrawalIsNotAllowed.into(),
        "Should revert when withdrawal CEP18 token is the same as reserves token"
    );
}

#[test]
fn test_withdraw_token_should_revert_if_withdrawal_cep18_token_amount_is_gt_available_balance() {
    let env = odra_test::env();
    let (mut treasury, _, _, mock_cep18) = setup(&env);

    assert_eq!(
        treasury
            .try_withdraw_token(Some(mock_cep18.address()), U256::one(), env.get_account(1))
            .unwrap_err(),
        Error::InsufficientWithdrawalTokenAmount.into(),
        "Should revert when CEP18 token withdrawal amount is greater than available balance"
    );
}

#[test]
fn test_withdraw_token_should_should_withdraw_cspr_token_properly() {
    let env = odra_test::env();
    let (mut treasury, _, _, _) = setup(&env);
    let amount = U512::from(1 * 10u32.pow(9));
    let withdrawal_amount = amount / 2;
    let recipient = env.get_account(1);

    treasury.with_tokens(amount).receive();

    let prev_treasury_balance = env.balance_of(&treasury.address());
    let prev_recipient_balance = env.balance_of(&recipient);

    treasury.withdraw_token(None, withdrawal_amount.to_u256().unwrap(), recipient);

    let curr_treasury_balance = env.balance_of(&treasury.address());
    let curr_recipient_balance = env.balance_of(&recipient);

    assert!(env.emitted_native_event(
        &treasury,
        TokenWithdrawn {
            token: None,
            amount: withdrawal_amount.to_u256().unwrap(),
            recipient,
        }
    ));
    assert_eq!(
        curr_treasury_balance,
        prev_treasury_balance - withdrawal_amount,
        "Invalid current Treasury CSPR token balance"
    );
    assert_eq!(
        curr_recipient_balance,
        prev_recipient_balance + withdrawal_amount,
        "Invalid current recipient CSPR token balance"
    );
}

#[test]
fn test_withdraw_token_should_should_withdraw_cep18_token_properly() {
    let env = odra_test::env();
    let (mut treasury, _, _, mut mock_cep18) = setup(&env);
    let amount = U256::from_dec_str("10000000000000000000").unwrap();
    let withdrawal_amount = amount / 2;
    let recipient = env.get_account(1);

    mock_cep18.transfer(&treasury.address(), &amount);

    let prev_treasury_balance = mock_cep18.balance_of(&treasury.address());
    let prev_recipient_balance = mock_cep18.balance_of(&recipient);

    treasury.withdraw_token(Some(mock_cep18.address()), withdrawal_amount, recipient);

    let curr_treasury_balance = mock_cep18.balance_of(&treasury.address());
    let curr_recipient_balance = mock_cep18.balance_of(&recipient);

    assert!(env.emitted_native_event(
        &treasury,
        TokenWithdrawn {
            token: Some(mock_cep18.address()),
            amount: withdrawal_amount,
            recipient,
        }
    ));
    assert_eq!(
        curr_treasury_balance,
        prev_treasury_balance - withdrawal_amount,
        "Invalid current Treasury CEP18 token balance"
    );
    assert_eq!(
        curr_recipient_balance,
        prev_recipient_balance + withdrawal_amount,
        "Invalid current recipient CEP18 token balance"
    );
}
