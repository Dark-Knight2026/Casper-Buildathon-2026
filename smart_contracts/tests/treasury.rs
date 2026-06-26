use odra::{
    casper_types::{U256, U512},
    host::{Deployer, HostEnv, HostRef},
    prelude::Addressable,
    uints::ToU256,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::big_coin::{BigCoin, BigCoinHostRef, BigCoinInitArgs};
use leasefi_contracts::treasury::{
    errors::Error,
    events::{BigCoinSet, ReservesWithdrawn, RewardsDeposited, TokenWithdrawn},
    Treasury, TreasuryHostRef, TreasuryInitArgs,
};

fn setup(env: &HostEnv) -> (TreasuryHostRef, BigCoinHostRef, BigCoinHostRef) {
    let mut treasury = Treasury::deploy(
        env,
        TreasuryInitArgs {
            owner: env.get_account(0),
        },
    );
    let big_coin = BigCoin::deploy(
        env,
        BigCoinInitArgs {
            symbol: String::from("BIG"),
            name: String::from("BIG"),
            decimals: 18,
            initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
        },
    );
    let mock_cep18 = BigCoin::deploy(
        env,
        BigCoinInitArgs {
            symbol: String::from("MOCK"),
            name: String::from("MOCK"),
            decimals: 18,
            initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
        },
    );

    treasury.set_big_coin(big_coin.address());

    (treasury, big_coin, mock_cep18)
}

fn deposit_rewards(
    rewards_amount: &U256,
    big_coin: &mut BigCoinHostRef,
    treasury: &mut TreasuryHostRef,
) {
    big_coin.approve(&treasury.address(), rewards_amount);
    treasury.deposit_rewards(*rewards_amount);
}

#[test]
fn test_init_should_initialize_contract_properly() {
    let env = odra_test::env();
    let (treasury, big_coin, _) = setup(&env);

    assert_eq!(treasury.get_owner(), env.get_account(0), "Invalid owner");
    assert_eq!(
        treasury.get_big_coin_contract_address(),
        big_coin.address(),
        "Invalid BIG coin contract address"
    );
}

#[test]
fn test_set_big_coin_should_revert_if_not_owner_is_calling() {
    let env = odra_test::env();
    let (mut treasury, _, _) = setup(&env);

    env.set_caller(env.get_account(1));

    assert_eq!(
        treasury.try_set_big_coin(env.get_account(1)).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_big_coin_should_set_big_coin_properly() {
    let env = odra_test::env();
    let (mut treasury, _, _) = setup(&env);
    let big_coin = env.get_account(10);

    treasury.set_big_coin(big_coin);

    assert_eq!(
        treasury.get_big_coin_contract_address(),
        big_coin,
        "Invalid BIG coin contract address"
    );

    assert!(env.emitted_event(
        &treasury,
        BigCoinSet { big_coin }
    ));
}

#[test]
fn test_deposit_rewards_should_deposit_rewards_properly() {
    let env = odra_test::env();
    let (mut treasury, mut big_coin, _) = setup(&env);
    let rewards_amount = U256::from_dec_str("5000000000000000000").unwrap();

    let prev_user_balance = big_coin.balance_of(&env.caller());
    let prev_treasury_balance = big_coin.balance_of(&treasury.address());

    deposit_rewards(&rewards_amount, &mut big_coin, &mut treasury);

    let curr_user_balance = big_coin.balance_of(&env.caller());
    let curr_treasury_balance = big_coin.balance_of(&treasury.address());

    assert!(env.emitted_event(
        &treasury,
        RewardsDeposited {
            amount: rewards_amount
        }
    ));
    assert_eq!(
        treasury.get_reserves(),
        rewards_amount,
        "Full deposit should remain as reserves"
    );
    assert_eq!(
        curr_user_balance,
        prev_user_balance - rewards_amount,
        "Invalid current user balance"
    );
    assert_eq!(
        curr_treasury_balance,
        prev_treasury_balance + rewards_amount,
        "Invalid current Treasury balance"
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
    let (mut treasury, mut big_coin, _) = setup(&env);

    deposit_rewards(
        &U256::from_dec_str("10000000000000000000").unwrap(),
        &mut big_coin,
        &mut treasury,
    );

    let reserves_amount = treasury.get_reserves();
    let recipient = env.get_account(5);
    let amount_to_withdraw = reserves_amount / 2;
    let prev_recipient_balance = big_coin.balance_of(&recipient);
    let prev_treasury_balance = big_coin.balance_of(&treasury.address());

    treasury.withdraw_reserves(recipient, amount_to_withdraw);

    let curr_recipient_balance = big_coin.balance_of(&recipient);
    let curr_treasury_balance = big_coin.balance_of(&treasury.address());

    assert!(env.emitted_event(
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
    let (mut treasury, mut big_coin, _) = setup(&env);

    deposit_rewards(
        &U256::from_dec_str("20000000000000000000").unwrap(),
        &mut big_coin,
        &mut treasury,
    );

    let reserves_amount = treasury.get_reserves();
    let recipient = env.get_account(5);
    let prev_recipient_balance = big_coin.balance_of(&recipient);
    let prev_treasury_balance = big_coin.balance_of(&treasury.address());

    treasury.withdraw_reserves(recipient, reserves_amount);

    let curr_recipient_balance = big_coin.balance_of(&recipient);
    let curr_treasury_balance = big_coin.balance_of(&treasury.address());

    assert!(env.emitted_event(
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
    let (mut treasury, _, _) = setup(&env);

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
    let (mut treasury, _, _) = setup(&env);

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
    let (mut treasury, _, _) = setup(&env);

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
    let (mut treasury, big_coin, _) = setup(&env);

    assert_eq!(
        treasury
            .try_withdraw_token(Some(big_coin.address()), U256::one(), env.get_account(1))
            .unwrap_err(),
        Error::DirectReservesTokenWithdrawalIsNotAllowed.into(),
        "Should revert when withdrawal CEP18 token is the same as reserves token"
    );
}

#[test]
fn test_withdraw_token_should_revert_if_withdrawal_cep18_token_amount_is_gt_available_balance() {
    let env = odra_test::env();
    let (mut treasury, _, mock_cep18) = setup(&env);

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
    let (mut treasury, _, _) = setup(&env);
    let amount = U512::from(10u32.pow(9));
    let withdrawal_amount = amount / 2;
    let recipient = env.get_account(1);

    treasury.with_tokens(amount).receive();

    let prev_treasury_balance = env.balance_of(&treasury.address());
    let prev_recipient_balance = env.balance_of(&recipient);

    treasury.withdraw_token(None, withdrawal_amount.to_u256().unwrap(), recipient);

    let curr_treasury_balance = env.balance_of(&treasury.address());
    let curr_recipient_balance = env.balance_of(&recipient);

    assert!(env.emitted_event(
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
    let (mut treasury, _, mut mock_cep18) = setup(&env);
    let amount = U256::from_dec_str("10000000000000000000").unwrap();
    let withdrawal_amount = amount / 2;
    let recipient = env.get_account(1);

    mock_cep18.transfer(&treasury.address(), &amount);

    let prev_treasury_balance = mock_cep18.balance_of(&treasury.address());
    let prev_recipient_balance = mock_cep18.balance_of(&recipient);

    treasury.withdraw_token(Some(mock_cep18.address()), withdrawal_amount, recipient);

    let curr_treasury_balance = mock_cep18.balance_of(&treasury.address());
    let curr_recipient_balance = mock_cep18.balance_of(&recipient);

    assert!(env.emitted_event(
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