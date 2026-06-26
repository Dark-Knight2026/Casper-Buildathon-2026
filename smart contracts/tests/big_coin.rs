use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
};

use leasefi_contracts::big_coin::{BigCoin, BigCoinHostRef, BigCoinInitArgs};

fn deploy_big_coin(env: &HostEnv) -> BigCoinHostRef {
    BigCoin::deploy(
        env,
        BigCoinInitArgs {
            symbol: String::from("BIG"),
            name: String::from("BIG"),
            decimals: 18,
            initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
        },
    )
}

#[test]
fn test_init_should_initialize_token_properly() {
    let env = odra_test::env();
    let big_coin = deploy_big_coin(&env);
    let expected_symbol = String::from("BIG");
    let expected_name = String::from("BIG");
    let expected_decimals = 18;
    let expected_initial_supply = U256::from_dec_str("5000000000000000000000000000000").unwrap();

    assert_eq!(big_coin.symbol(), expected_symbol, "Invalid coin symbol");
    assert_eq!(big_coin.name(), expected_name, "Invalid coin name");
    assert_eq!(
        big_coin.decimals(),
        expected_decimals,
        "Invalid coin decimals"
    );
    assert_eq!(
        big_coin.total_supply(),
        expected_initial_supply,
        "Invalid coin total supply"
    );
    assert_eq!(
        big_coin.balance_of(&env.caller()),
        expected_initial_supply,
        "Invalid balance of deployer"
    );
}

#[test]
fn test_transfer_should_transfer_properly() {
    let env = odra_test::env();
    let mut big_coin = deploy_big_coin(&env);
    let recipient = env.get_account(1);
    let amount = U256::from_dec_str("1000000000000000000").unwrap();
    let prev_sender_balance = big_coin.balance_of(&env.caller());
    let prev_recipient_balance = big_coin.balance_of(&recipient);

    big_coin.transfer(&recipient, &amount);

    let curr_sender_balance = big_coin.balance_of(&env.caller());
    let curr_recipient_balance = big_coin.balance_of(&recipient);

    assert_eq!(
        curr_sender_balance,
        prev_sender_balance - amount,
        "Invalid current sender balance"
    );
    assert_eq!(
        curr_recipient_balance,
        prev_recipient_balance + amount,
        "Invalid current recipient balance"
    );
}

#[test]
fn test_transfer_from_should_transfer_properly() {
    let env = odra_test::env();
    let mut big_coin = deploy_big_coin(&env);
    let owner = env.caller();
    let spender = env.get_account(1);
    let amount = U256::from_dec_str("10000000000000000000").unwrap();
    let prev_owner_balance = big_coin.balance_of(&owner);
    let prev_spender_balance = big_coin.balance_of(&spender);

    big_coin.approve(&spender, &amount);
    env.set_caller(spender);
    big_coin.transfer_from(&owner, &spender, &amount);

    let curr_owner_balance = big_coin.balance_of(&owner);
    let curr_spender_balance = big_coin.balance_of(&spender);

    assert_eq!(
        curr_owner_balance,
        prev_owner_balance - amount,
        "Invalid current owner balance"
    );
    assert_eq!(
        curr_spender_balance,
        prev_spender_balance + amount,
        "Invalid current spender balance"
    );
}

#[test]
fn test_approve_should_approve_properly() {
    let env = odra_test::env();
    let mut big_coin = deploy_big_coin(&env);
    let owner = env.caller();
    let spender = env.get_account(1);
    let amount = U256::from_dec_str("500000000000000000").unwrap();
    let prev_allowance = big_coin.allowance(&owner, &spender);

    big_coin.approve(&spender, &amount);

    let curr_allowance = big_coin.allowance(&owner, &spender);

    assert_eq!(
        curr_allowance,
        prev_allowance + amount,
        "Invalid current spender allowance"
    );
}

#[test]
fn test_decrease_allowance_should_decrease_allowance_properly() {
    let env = odra_test::env();
    let mut big_coin = deploy_big_coin(&env);
    let owner = env.caller();
    let spender = env.get_account(1);
    let amount = U256::from_dec_str("500000000000000000").unwrap();
    let prev_allowance = big_coin.allowance(&owner, &spender);

    big_coin.approve(&spender, &amount);
    big_coin.decrease_allowance(&spender, &(amount / 2));

    let curr_allowance = big_coin.allowance(&owner, &spender);

    assert_eq!(
        curr_allowance,
        prev_allowance + (amount / 2),
        "Invalid current spender allowance"
    );
}

#[test]
fn test_increase_allowance_should_increase_allowance_properly() {
    let env = odra_test::env();
    let mut big_coin = deploy_big_coin(&env);
    let owner = env.caller();
    let spender = env.get_account(1);
    let amount = U256::from_dec_str("500000000000000000").unwrap();
    let prev_allowance = big_coin.allowance(&owner, &spender);

    big_coin.approve(&spender, &amount);
    big_coin.increase_allowance(&spender, &(amount / 2));

    let curr_allowance = big_coin.allowance(&owner, &spender);

    assert_eq!(
        curr_allowance,
        prev_allowance + (amount * 3 / 2),
        "Invalid current spender allowance"
    );
}
