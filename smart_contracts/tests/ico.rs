use odra::{
    casper_types::{U256, U512},
    host::{Deployer, HostEnv, HostRef, NoArgs},
    prelude::*,
    uints::ToU512,
};
use odra_modules::access::errors::Error as AccessError;

use leasefi_contracts::constants::{PRIVATE_SALE_CLIFF_DURATION, PRIVATE_SALE_VESTING_DURATION};
use leasefi_contracts::ico::{
    errors::Error,
    events::{
        CurrencyAdded, CurrencyRemoved, ICOScheduleAdded, TokensPurchased, UnsoldTokensWithdrawn,
    },
    types::{Currency, ICOScheduleCreateParams},
    ICOHostRef, ICOInitArgs, ICOScheduleId, ICO,
};
use leasefi_contracts::mocks::styks_price_feed::{StyksPriceFeed, StyksPriceFeedHostRef};
use leasefi_contracts::staking::{Staking, StakingHostRef, StakingInitArgs};
use leasefi_contracts::tailor_coin::{TailorCoin, TailorCoinHostRef, TailorCoinInitArgs};
use leasefi_contracts::treasury::{Treasury, TreasuryHostRef, TreasuryInitArgs};
use leasefi_contracts::vesting::{Vesting, VestingHostRef, VestingInitArgs};

struct Users {
    owner: Address,
    alice: Address,
    bob: Address,
}

struct Context {
    env: HostEnv,
    tailor_coin: TailorCoinHostRef,
    usdc: TailorCoinHostRef,
    usdt: TailorCoinHostRef,
    treasury: TreasuryHostRef,
    vesting: VestingHostRef,
    staking: StakingHostRef,
    ico: ICOHostRef,
    styks_price_feed: StyksPriceFeedHostRef,
    users: Users,
}

/////////////////////////////////////////////////////////////////////////////
//                                  init()                                 //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_init_should_initialize_contract_properly() {
    let ctx = setup(odra_test::env(), false);

    assert_eq!(ctx.ico.get_owner(), ctx.users.owner, "Invalid owner");
    assert_eq!(
        ctx.ico.get_styks_price_feed_contract_address(),
        ctx.styks_price_feed.address(),
        "Invalid Styks Oracle Price Feed contract address"
    );
    assert_eq!(
        ctx.ico.get_tailor_coin_contract_address(),
        ctx.tailor_coin.address(),
        "Invalid TailorCoin contract address"
    );
    assert_eq!(
        ctx.ico.get_treasury_contract_address(),
        ctx.treasury.address(),
        "Invalid Treasury contract address"
    );
    assert_eq!(
        ctx.ico.get_staking_contract_address(),
        ctx.staking.address(),
        "Invalid Staking contract address"
    );
    assert_eq!(
        ctx.ico.get_vesting_contract_address(),
        ctx.vesting.address(),
        "Invalid Vesting contract address"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                            set_tailor_coin()                            //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_set_tailor_coin_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico.try_set_tailor_coin(ctx.usdc.address()).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_tailor_coin_should_set_tailor_coin_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let tailor_coin = ctx.usdc.address();

    ctx.ico.set_tailor_coin(tailor_coin);

    assert_eq!(
        ctx.ico.get_tailor_coin_contract_address(),
        tailor_coin,
        "Invalid TailorCoin contract address"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                              set_treasury()                             //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_set_treasury_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico.try_set_treasury(ctx.usdt.address()).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_treasury_should_set_treasury_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let treasury = ctx.usdt.address();

    ctx.ico.set_treasury(treasury);

    assert_eq!(
        ctx.ico.get_treasury_contract_address(),
        treasury,
        "Invalid Treasury contract address"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                              set_staking()                              //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_set_staking_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico.try_set_staking(ctx.staking.address()).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_staking_should_set_staking_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let staking = ctx.staking.address();

    ctx.ico.set_staking(staking);

    assert_eq!(
        ctx.ico.get_staking_contract_address(),
        staking,
        "Invalid Staking contract address"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                              set_vesting()                              //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_set_vesting_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico.try_set_vesting(ctx.vesting.address()).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_set_vesting_should_set_vesting_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let vesting = ctx.vesting.address();

    ctx.ico.set_vesting(vesting);

    assert_eq!(
        ctx.ico.get_vesting_contract_address(),
        vesting,
        "Invalid Vesting contract address"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                              add_currency()                             //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_add_currency_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico.try_add_currency(Currency::CSPR, None).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_add_currency_should_revert_if_currency_address_is_not_provided_for_cep18_token() {
    let mut ctx = setup(odra_test::env(), false);

    assert_eq!(
        ctx.ico.try_add_currency(Currency::USDC, None).unwrap_err(),
        Error::AddressIsRequired.into(),
        "Should revert when currency address is not provided for CEP18 token"
    );
}

#[test]
fn test_add_currency_should_add_cspr_token_support_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let currency = Currency::CSPR;

    ctx.ico.add_currency(currency, None);

    assert!(
        ctx.env
            .emitted_native_event(&ctx.ico, CurrencyAdded { currency }),
        "CurrencyAdded event should be emitted"
    );
    assert_eq!(
        ctx.ico.get_currency_by_key(&currency),
        (true, None),
        "CSPR currency support should be enabled"
    );
}

#[test]
fn test_add_currency_should_add_cep18_token_support_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let currencies = vec![(Currency::USDC, "USDC"), (Currency::USDT, "USDT")];

    for currency in &currencies {
        let currency_address = Some(if currency.0 == Currency::USDC {
            ctx.usdc.address()
        } else {
            ctx.usdt.address()
        });

        ctx.ico.add_currency(currency.0, currency_address);

        assert!(
            ctx.env.emitted_native_event(
                &ctx.ico,
                CurrencyAdded {
                    currency: currency.0
                }
            ),
            "CurrencyAdded event should be emitted"
        );
        assert_eq!(
            ctx.ico.get_currency_by_key(&currency.0),
            (true, currency_address),
            "{} CEP18 currency support should be enabled",
            currency.1
        );
    }
}

/////////////////////////////////////////////////////////////////////////////
//                            remove_currency()                            //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_remove_currency_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico.try_remove_currency(Currency::CSPR).unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_remove_currency_should_remove_cspr_token_support_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let currency = Currency::CSPR;

    ctx.ico.remove_currency(currency);

    assert!(
        ctx.env
            .emitted_native_event(&ctx.ico, CurrencyRemoved { currency }),
        "CurrencyRemoved event should be emitted"
    );
    assert_eq!(
        ctx.ico.get_currency_by_key(&currency),
        (false, None),
        "CSPR currency support should be disabled"
    );
}

#[test]
fn test_remove_currency_should_remove_cep18_token_support_properly() {
    let mut ctx = setup(odra_test::env(), false);
    let currencies = vec![(Currency::USDC, "USDC"), (Currency::USDT, "USDT")];

    for currency in &currencies {
        ctx.ico.remove_currency(currency.0);

        assert!(
            ctx.env.emitted_native_event(
                &ctx.ico,
                CurrencyRemoved {
                    currency: currency.0
                }
            ),
            "CurrencyRemoved event should be emitted"
        );
        assert_eq!(
            ctx.ico.get_currency_by_key(&currency.0),
            (false, None),
            "{} CEP18 currency support should be disabled",
            currency.1
        );
    }
}

/////////////////////////////////////////////////////////////////////////////
//                            add_ico_schedule()                           //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_add_ico_schedule_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico
            .try_add_ico_schedule(get_ico_schedules_creation_params(&ctx.env)[0].clone())
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_add_ico_schedule_should_fail_if_invalid_ico_schedule_start_timestamp_1() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.env.advance_block_time(ONE_MINUTE * 1_000);

    let now = ctx.env.block_time();

    for start_timestamp in [now, now - 1] {
        creation_params[0].start_timestamp = start_timestamp;

        assert_eq!(
            ctx.ico
                .try_add_ico_schedule(creation_params[0].clone())
                .unwrap_err(),
            Error::InvalidICOScheduleStartTimestamp.into(),
            "Should revert when ICO schedule start timestamp is LTE to block timestamp"
        );
    }
}

#[test]
fn test_add_ico_schedule_should_fail_if_invalid_ico_schedule_start_timestamp_2() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.tailor_coin
        .approve(&ctx.ico.address(), &creation_params[0].sale_amount);
    ctx.ico.add_ico_schedule(creation_params[0].clone());

    let end_timestamp = creation_params[0].end_timestamp;

    for start_timestamp in [end_timestamp, end_timestamp - 1] {
        creation_params[1].start_timestamp = start_timestamp;

        assert_eq!(
            ctx.ico
                .try_add_ico_schedule(creation_params[1].clone())
                .unwrap_err(),
            Error::InvalidICOScheduleStartTimestamp.into(),
            "Should revert when ICO schedule start timestamp is LTE to previous ICO schedule end timestamp"
        );
    }
}

#[test]
fn test_add_ico_schedule_should_fail_if_invalid_ico_schedule_start_timestamp_3() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.tailor_coin
        .approve(&ctx.ico.address(), &creation_params[0].sale_amount);
    ctx.ico.add_ico_schedule(creation_params[0].clone());

    ctx.env
        .advance_block_time(creation_params[0].end_timestamp - ctx.env.block_time());

    let now = ctx.env.block_time();

    for start_timestamp in [now, now - 1] {
        creation_params[1].start_timestamp = start_timestamp;

        assert_eq!(
            ctx.ico
                .try_add_ico_schedule(creation_params[1].clone())
                .unwrap_err(),
            Error::InvalidICOScheduleStartTimestamp.into(),
            "Should revert when ICO schedule start timestamp is LTE to block timestamp"
        );
    }
}

#[test]
fn test_add_ico_schedule_should_fail_if_invalid_ico_schedule_end_timestamp() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);
    let start_timestamp = creation_params[0].start_timestamp;

    for end_timestamp in [start_timestamp, start_timestamp - 1] {
        creation_params[0].end_timestamp = end_timestamp;

        assert_eq!(
            ctx.ico
                .try_add_ico_schedule(creation_params[0].clone())
                .unwrap_err(),
            Error::InvalidICOScheduleEndTimestamp.into(),
            "Should revert when ICO schedule end timestamp is LTE to ICO schedule start timestamp"
        );
    }
}

#[test]
fn test_add_ico_schedule_should_fail_if_invalid_ico_schedule_sale_amount() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);

    creation_params[0].sale_amount = U256::zero();

    assert_eq!(
        ctx.ico
            .try_add_ico_schedule(creation_params[0].clone())
            .unwrap_err(),
        Error::InvalidICOScheduleSaleAmount.into(),
        "Should revert when ICO schedule sale amount is zero"
    );
}

#[test]
fn test_add_ico_schedule_should_fail_if_invalid_ico_schedule_price() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);

    creation_params[0].price = U256::zero();

    assert_eq!(
        ctx.ico
            .try_add_ico_schedule(creation_params[0].clone())
            .unwrap_err(),
        Error::InvalidICOSchedulePrice.into(),
        "Should revert when ICO schedule price is zero"
    );
}

#[test]
fn test_add_ico_schedule_should_fail_if_ico_schedule_vesting_duration_is_zero() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);

    creation_params[0].vesting_duration = 0;

    assert_eq!(
        ctx.ico
            .try_add_ico_schedule(creation_params[0].clone())
            .unwrap_err(),
        Error::InvalidICOScheduleVestingDuration.into(),
        "Should revert when ICO schedule vesting duration is zero"
    );
}

#[test]
fn test_add_ico_schedule_should_fail_if_ico_schedule_cliff_exceeds_vesting_duration() {
    let mut ctx = setup(odra_test::env(), false);
    let mut creation_params = get_ico_schedules_creation_params(&ctx.env);

    creation_params[0].cliff_duration = creation_params[0].vesting_duration + 1;

    assert_eq!(
        ctx.ico
            .try_add_ico_schedule(creation_params[0].clone())
            .unwrap_err(),
        Error::ICOScheduleCliffExceedsVestingDuration.into(),
        "Should revert when ICO schedule cliff duration exceeds vesting duration"
    );
}

#[test]
fn test_add_ico_schedule_should_add_ico_schedules_properly() {
    add_and_verify_ico_schedules(&mut setup(odra_test::env(), false));
}

/////////////////////////////////////////////////////////////////////////////
//                                purchase()                               //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_purchase_should_fail_if_amount_to_spend_is_zero() {
    let mut ctx = setup(odra_test::env(), true);

    assert_eq!(
        ctx.ico
            .try_purchase(U256::zero(), Currency::CSPR)
            .unwrap_err(),
        Error::InvalidAmountToSpend.into(),
        "Should revert when amount to spend is zero"
    );
}

#[test]
fn test_purchase_should_fail_if_currency_is_not_supported() {
    let mut ctx = setup(odra_test::env(), true);

    assert_eq!(
        ctx.ico
            .try_purchase(U256::one(), Currency::USDT)
            .unwrap_err(),
        Error::UnsupportedCurrency.into(),
        "Should revert when currency is not supported"
    );
}

#[test]
fn test_purchase_should_fail_if_no_active_ice_schedule() {
    let mut ctx = setup(odra_test::env(), true);

    assert_eq!(
        ctx.ico
            .try_purchase(U256::one(), Currency::CSPR)
            .unwrap_err(),
        Error::NoActiveIcoSchedule.into(),
        "Should revert when no active ICO schedule exist"
    );
}

#[test]
fn test_purchase_should_fail_if_purchase_amount_is_gt_available_to_purchase_amount() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);
    let amount_to_spend = (creation_params[0].sale_amount * creation_params[0].price
        / U256::from(10).pow(U256::from(18)))
        + U256::one();

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());

    assert_eq!(
        ctx.ico
            .try_purchase(amount_to_spend, Currency::USDC)
            .unwrap_err(),
        Error::InsufficientSellingTokensAmount.into(),
        "Should revert when purchase amount is GT available to purchase amount"
    );
}

#[test]
fn test_purchase_should_fail_if_styks_price_feed_can_not_return_twap() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());

    assert_eq!(
        ctx.ico
            .try_purchase(U256::one(), Currency::CSPR)
            .unwrap_err(),
        Error::StyksOracleCanNotReturnTWAP.into(),
        "Should revert when Styks Oracle Price Feed can not return TWAP"
    );
}

#[test]
fn test_purchase_should_fail_if_attached_value_is_wrong_when_purchasing_with_cspr_token() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);
    let amount_to_spend = U256::one() * U256::from(10).pow(U256::from(18));

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());
    ctx.styks_price_feed.set_twap_price(4342); // 0.004342 * 10^6

    assert_eq!(
        ctx.ico
            .with_tokens(amount_to_spend.to_u512() - 1)
            .try_purchase(
                U256::from(100) * U256::from(10).pow(U256::from(18)),
                Currency::CSPR
            )
            .unwrap_err(),
        Error::InvalidAmountAttached.into(),
        "Should revert when attached CSPR amount is wrong when purchasing with CSPR - 1"
    );
    assert_eq!(
        ctx.ico
            .with_tokens(amount_to_spend.to_u512() + 1)
            .try_purchase(
                U256::from(100) * U256::from(10).pow(U256::from(18)),
                Currency::CSPR
            )
            .unwrap_err(),
        Error::InvalidAmountAttached.into(),
        "Should revert when attached CSPR amount is wrong when purchasing with CSPR - 2"
    );
}

#[test]
fn test_purchase_should_fail_if_attached_value_is_wrong_when_purchasing_with_cep18_token() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());
    ctx.styks_price_feed.set_twap_price(4342); // 0.004342 * 10^6

    assert_eq!(
        ctx.ico
            .with_tokens(U512::one())
            .try_purchase(U256::one(), Currency::USDC)
            .unwrap_err(),
        Error::InvalidAmountAttached.into(),
        "Should revert when attached CSPR amount is wrong when purchasing with CEP18 token"
    );
}

#[test]
fn test_purchase_should_purchase_with_cspr_token_properly() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());
    ctx.styks_price_feed.set_twap_price(4342); // 0.004342 * 10^6

    let currency = Currency::CSPR;
    let price = ctx.ico.get_ico_token_price(currency);
    let amount_to_spend = U256::from(100) * price;
    let expected_purchase_amount = amount_to_spend * U256::from(10).pow(U256::from(18)) / price;
    let prev_current_ico_schedule = ctx.ico.get_current_ico_schedule().unwrap();
    let prev_buyer_balance = ctx.tailor_coin.balance_of(&ctx.users.alice);
    let prev_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());
    let prev_treasury_balance = ctx.env.balance_of(&ctx.treasury.address());
    let prev_user_schedules_count = ctx.vesting.get_user_schedules_count(ctx.users.alice);

    ctx.env.set_caller(ctx.users.alice);

    let actual_purchase_amount = ctx
        .ico
        .with_tokens(amount_to_spend.to_u512())
        .purchase(amount_to_spend, currency);

    ctx.env.set_caller(ctx.users.owner);

    let curr_current_ico_schedule = ctx.ico.get_current_ico_schedule().unwrap();
    let curr_buyer_balance = ctx.tailor_coin.balance_of(&ctx.users.alice);
    let curr_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());
    // TODO: Uncomment this out when staking is implemented to test staking allowance
    // let curr_staking_allowance = ctx
    //     .tailor_coin
    //     .allowance(&ctx.ico.address(), &ctx.staking.address());
    let curr_treasury_balance = ctx.env.balance_of(&ctx.treasury.address());
    let curr_user_schedules_count = ctx.vesting.get_user_schedules_count(ctx.users.alice);

    assert!(
        ctx.env.emitted_native_event(
            &ctx.ico,
            TokensPurchased {
                amount: expected_purchase_amount,
                currency,
                price,
                cost: amount_to_spend,
                timestamp: ctx.env.block_time(),
            }
        ),
        "TokensPurchased event should be emitted"
    );
    assert_eq!(
        expected_purchase_amount, actual_purchase_amount,
        "Invalid purchase amount"
    );
    assert_eq!(
        curr_current_ico_schedule.1.sold_amount,
        prev_current_ico_schedule.1.sold_amount + expected_purchase_amount,
        "Invalid current ICO schedule sold amount"
    );
    assert_eq!(
        curr_buyer_balance, prev_buyer_balance,
        "Buyer should not receive tokens directly"
    );
    // TODO: Uncomment this out when staking is implemented to test staking allowance
    // assert_eq!(
    //     curr_staking_allowance, expected_purchase_amount,
    //     "Staking contract should be approved to transfer the purchased tokens"
    // );
    assert_eq!(
        curr_ico_balance, prev_ico_balance,
        "ICO contract balance should not change (tokens stay in ICO until staking pulls them)"
    );
    assert_eq!(
        curr_treasury_balance,
        prev_treasury_balance + amount_to_spend.to_u512(),
        "Invalid current Treasury CSPR balance"
    );
    assert_eq!(
        curr_user_schedules_count,
        prev_user_schedules_count + 1,
        "Buyer should have a new vesting schedule"
    );
}

#[test]
fn test_purchase_should_purchase_with_cep18_token_properly() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());

    let currency = Currency::USDC;
    let price = ctx.ico.get_ico_token_price(currency);
    let amount_to_spend = U256::from(100) * price;
    let expected_purchase_amount = amount_to_spend * U256::from(10).pow(U256::from(18)) / price;
    let prev_current_ico_schedule = ctx.ico.get_current_ico_schedule().unwrap();
    let prev_buyer_balance = ctx.tailor_coin.balance_of(&ctx.users.alice);
    let prev_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());
    let prev_treasury_balance = ctx.usdc.balance_of(&ctx.treasury.address());
    let prev_user_schedules_count = ctx.vesting.get_user_schedules_count(ctx.users.alice);

    ctx.env.set_caller(ctx.users.alice);
    ctx.usdc.approve(&ctx.ico.address(), &amount_to_spend);

    let actual_purchase_amount = ctx.ico.purchase(amount_to_spend, currency);

    ctx.env.set_caller(ctx.users.owner);

    let curr_current_ico_schedule = ctx.ico.get_current_ico_schedule().unwrap();
    let curr_buyer_balance = ctx.tailor_coin.balance_of(&ctx.users.alice);
    let curr_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());
    // TODO: Uncomment this out when staking is implemented to test staking allowance
    // let curr_staking_allowance = ctx
    //     .tailor_coin
    //     .allowance(&ctx.ico.address(), &ctx.staking.address());
    let curr_treasury_balance = ctx.usdc.balance_of(&ctx.treasury.address());
    let curr_user_schedules_count = ctx.vesting.get_user_schedules_count(ctx.users.alice);

    assert!(
        ctx.env.emitted_native_event(
            &ctx.ico,
            TokensPurchased {
                amount: expected_purchase_amount,
                currency,
                price,
                cost: amount_to_spend,
                timestamp: ctx.env.block_time(),
            }
        ),
        "TokensPurchased event should be emitted"
    );
    assert_eq!(
        expected_purchase_amount, actual_purchase_amount,
        "Invalid purchase amount"
    );
    assert_eq!(
        curr_current_ico_schedule.1.sold_amount,
        prev_current_ico_schedule.1.sold_amount + expected_purchase_amount,
        "Invalid current ICO schedule sold amount"
    );
    assert_eq!(
        curr_buyer_balance, prev_buyer_balance,
        "Buyer should not receive tokens directly"
    );
    // TODO: Uncomment this out when staking is implemented to test staking allowance
    // assert_eq!(
    //     curr_staking_allowance, expected_purchase_amount,
    //     "Staking contract should be approved to transfer the purchased tokens"
    // );
    assert_eq!(
        curr_ico_balance, prev_ico_balance,
        "ICO contract balance should not change (tokens stay in ICO until staking pulls them)"
    );
    assert_eq!(
        curr_treasury_balance,
        prev_treasury_balance + amount_to_spend,
        "Invalid current Treasury USDC balance"
    );
    assert_eq!(
        curr_user_schedules_count,
        prev_user_schedules_count + 1,
        "Buyer should have a new vesting schedule"
    );
}

#[test]
fn test_purchase_should_create_vesting_schedule_with_active_ico_schedule_terms() {
    let mut ctx = setup(odra_test::env(), true);
    let public_sale = get_ico_schedules_creation_params(&ctx.env)[1].clone();
    let currency = Currency::USDC;
    let amount_to_spend = U256::from(10) * public_sale.price;
    let expected_purchase_amount =
        amount_to_spend * U256::from(10).pow(U256::from(18)) / public_sale.price;
    let vesting_id = ctx.vesting.get_schedules_count();

    ctx.env
        .advance_block_time(public_sale.start_timestamp - ctx.env.block_time());

    ctx.env.set_caller(ctx.users.alice);
    ctx.usdc.approve(&ctx.ico.address(), &amount_to_spend);
    ctx.ico.purchase(amount_to_spend, currency);

    let schedule = ctx.vesting.get_schedule(vesting_id).unwrap();

    assert_eq!(
        schedule.beneficiary, ctx.users.alice,
        "Invalid vesting beneficiary"
    );
    assert_eq!(
        schedule.total_amount, expected_purchase_amount,
        "Invalid vesting amount"
    );
    assert_eq!(
        schedule.cliff_duration, public_sale.cliff_duration,
        "Vesting schedule should use the active ICO schedule cliff duration"
    );
    assert_eq!(
        schedule.vesting_duration, public_sale.vesting_duration,
        "Vesting schedule should use the active ICO schedule vesting duration"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                         withdraw_unsold_tokens()                        //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_withdraw_unsold_tokens_should_revert_if_not_owner_is_calling() {
    let mut ctx = setup(odra_test::env(), false);

    ctx.env.set_caller(ctx.users.alice);

    assert_eq!(
        ctx.ico
            .try_withdraw_unsold_tokens(ctx.users.owner)
            .unwrap_err(),
        AccessError::CallerNotTheOwner.into(),
        "Should revert when is called by not the owner"
    );
}

#[test]
fn test_withdraw_unsold_tokens_should_do_nothing_if_withdrawal_amount_is_zero() {
    let ctx = setup(odra_test::env(), false);

    assert!(
        !ctx.env.emitted_native_event(
            &ctx.ico,
            UnsoldTokensWithdrawn {
                recipient: ctx.users.owner,
                amount: U256::zero()
            }
        ),
        "UnsoldTokensWithdrawn event should not be emitted"
    );
}

#[test]
fn test_withdraw_unsold_tokens_should_withdraw_unsold_tokens_from_one_ico_schedule_properly() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);
    let recipient = ctx.users.owner;

    ctx.env
        .advance_block_time(creation_params[0].end_timestamp + 1 - ctx.env.block_time());

    let prev_recipient_balance = ctx.tailor_coin.balance_of(&recipient);
    let prev_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());

    ctx.ico.withdraw_unsold_tokens(recipient);

    let curr_recipient_balance = ctx.tailor_coin.balance_of(&recipient);
    let curr_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());

    assert!(
        ctx.env.emitted_native_event(
            &ctx.ico,
            UnsoldTokensWithdrawn {
                recipient,
                amount: creation_params[0].sale_amount
            }
        ),
        "UnsoldTokensWithdrawn event should be emitted"
    );
    assert_eq!(
        curr_recipient_balance,
        prev_recipient_balance + creation_params[0].sale_amount,
        "Invalid recipient token balance"
    );
    assert_eq!(
        curr_ico_balance,
        prev_ico_balance - creation_params[0].sale_amount,
        "Invalid ICO contract token balance"
    );
}

#[test]
fn test_withdraw_unsold_tokens_should_not_withdraw_same_tokens_twice() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);
    let recipient = ctx.users.owner;
    let first_ico_schedule_id = ICOScheduleId::from(0u8);

    ctx.env
        .advance_block_time(creation_params[0].end_timestamp + 1 - ctx.env.block_time());

    let prev_recipient_balance = ctx.tailor_coin.balance_of(&recipient);
    let prev_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());

    ctx.ico.withdraw_unsold_tokens(recipient);

    let after_first_recipient_balance = ctx.tailor_coin.balance_of(&recipient);
    let after_first_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());
    let after_first_schedule = ctx
        .ico
        .get_ico_schedule_by_id(&first_ico_schedule_id)
        .unwrap();

    ctx.ico.withdraw_unsold_tokens(recipient);

    let after_second_recipient_balance = ctx.tailor_coin.balance_of(&recipient);
    let after_second_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());
    let after_second_schedule = ctx
        .ico
        .get_ico_schedule_by_id(&first_ico_schedule_id)
        .unwrap();

    assert_eq!(
        after_first_schedule.withdrawn_amount, creation_params[0].sale_amount,
        "First withdrawal should mark the entire unsold balance as withdrawn"
    );
    assert_eq!(
        after_second_schedule.withdrawn_amount, after_first_schedule.withdrawn_amount,
        "Second withdrawal should not change the withdrawn amount"
    );
    assert_eq!(
        after_first_recipient_balance,
        prev_recipient_balance + creation_params[0].sale_amount,
        "First withdrawal should transfer the unsold tokens to the recipient"
    );
    assert_eq!(
        after_second_recipient_balance, after_first_recipient_balance,
        "Second withdrawal should not transfer any additional tokens"
    );
    assert_eq!(
        after_first_ico_balance,
        prev_ico_balance - creation_params[0].sale_amount,
        "First withdrawal should reduce the ICO token balance"
    );
    assert_eq!(
        after_second_ico_balance, after_first_ico_balance,
        "Second withdrawal should leave the ICO token balance unchanged"
    );
}

#[test]
fn test_withdraw_unsold_tokens_should_withdraw_unsold_tokens_from_all_ico_schedules_properly() {
    let mut ctx: Context = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);
    let recipient = ctx.users.owner;
    let prev_recipient_balance = ctx.tailor_coin.balance_of(&recipient);
    let prev_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());
    let withdrawn_amount = creation_params
        .iter()
        .fold(U256::zero(), |acc, params| acc + params.sale_amount);

    ctx.env.advance_block_time(
        creation_params[creation_params.len() - 1].end_timestamp + 1 - ctx.env.block_time(),
    );

    ctx.ico.withdraw_unsold_tokens(recipient);

    let curr_recipient_balance = ctx.tailor_coin.balance_of(&recipient);
    let curr_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());

    assert!(
        ctx.env.emitted_native_event(
            &ctx.ico,
            UnsoldTokensWithdrawn {
                recipient,
                amount: withdrawn_amount
            }
        ),
        "UnsoldTokensWithdrawn event should be emitted"
    );
    assert_eq!(
        curr_recipient_balance,
        prev_recipient_balance + withdrawn_amount,
        "Invalid recipient token balance"
    );
    assert_eq!(
        curr_ico_balance,
        prev_ico_balance - withdrawn_amount,
        "Invalid ICO contract token balance"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                        get_current_ico_schedule()                       //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_get_current_ico_schedule_should_return_none_if_no_active_ico_schedule() {
    let ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    for params in &creation_params {
        ctx.env
            .advance_block_time(params.start_timestamp - ctx.env.block_time() - 1);

        assert_eq!(
            ctx.ico.get_current_ico_schedule(),
            None,
            "Should be None if ICO schedule has not started yet"
        );
    }

    ctx.env.advance_block_time(
        creation_params[creation_params.len() - 1].end_timestamp - ctx.env.block_time() + 1,
    );

    assert_eq!(
        ctx.ico.get_current_ico_schedule(),
        None,
        "Should be None if the last ICO schedule has finished already"
    );
}

#[test]
fn test_get_current_ico_schedule_should_return_current_ico_schedule_properly() {
    let ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    for (id, params) in creation_params.iter().enumerate() {
        ctx.env
            .advance_block_time(params.start_timestamp - ctx.env.block_time());

        assert_eq!(
            ctx.ico.get_current_ico_schedule(),
            Some((ICOScheduleId::from(id), params.clone().into())),
            "Should return proper ICO schedule and its ID - 1"
        );

        ctx.env.advance_block_time(1);

        assert_eq!(
            ctx.ico.get_current_ico_schedule(),
            Some((ICOScheduleId::from(id), params.clone().into())),
            "Should return proper ICO schedule and its ID - 2"
        );
    }
}

/////////////////////////////////////////////////////////////////////////////
//                          get_ico_token_price()                          //
/////////////////////////////////////////////////////////////////////////////

#[test]
fn test_get_ico_token_price_should_return_zero_when_no_active_ico_schedule() {
    let ctx = setup(odra_test::env(), true);

    assert_eq!(
        ctx.ico.get_ico_token_price(Currency::CSPR),
        U256::zero(),
        "Invalid ICO token price - 1"
    );
    assert_eq!(
        ctx.ico.get_ico_token_price(Currency::USDC),
        U256::zero(),
        "Invalid ICO token price - 2"
    );
    assert_eq!(
        ctx.ico.get_ico_token_price(Currency::USDT),
        U256::zero(),
        "Invalid ICO token price - 3"
    );
}

#[test]
fn test_get_ico_token_price_should_fail_if_styks_price_feed_can_not_return_twap() {
    let ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());

    assert_eq!(
        ctx.ico.try_get_ico_token_price(Currency::CSPR).unwrap_err(),
        Error::StyksOracleCanNotReturnTWAP.into(),
        "Should revert when Styks Oracle Price Feed can not return TWAP"
    );
}

#[test]
fn test_get_ico_token_price_should_return_proper_ico_token_price_in_cspr() {
    let mut ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);
    let cspr_price_usd = 4342; // 0.004342 * 10^6

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());
    ctx.styks_price_feed.set_twap_price(cspr_price_usd);

    let current_ico_schedule = ctx.ico.get_current_ico_schedule().unwrap();

    assert_eq!(
        ctx.ico.get_ico_token_price(Currency::CSPR),
        current_ico_schedule.1.price * U256::from(10).pow(U256::from(8)) / cspr_price_usd,
        "Invalid ICO token price"
    );
}

#[test]
fn test_get_ico_token_price_should_return_proper_ico_token_price_in_usd() {
    let ctx = setup(odra_test::env(), true);
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    ctx.env
        .advance_block_time(creation_params[0].start_timestamp - ctx.env.block_time());

    let current_ico_schedule = ctx.ico.get_current_ico_schedule().unwrap();

    assert_eq!(
        ctx.ico.get_ico_token_price(Currency::USDC),
        current_ico_schedule.1.price,
        "Invalid ICO token price - 1"
    );
    assert_eq!(
        ctx.ico.get_ico_token_price(Currency::USDT),
        current_ico_schedule.1.price,
        "Invalid ICO token price - 2"
    );
}

/////////////////////////////////////////////////////////////////////////////
//                                 Helpers                                 //
/////////////////////////////////////////////////////////////////////////////

const ONE_MINUTE: u64 = 60;
const ONE_HOUR: u64 = 60 * ONE_MINUTE;
const ONE_DAY: u64 = 24 * ONE_HOUR;
const ONE_MONTH: u64 = 30 * ONE_DAY;

fn setup(env: HostEnv, add_ico_schedules: bool) -> Context {
    let users = Users {
        owner: env.get_account(0),
        alice: env.get_account(1),
        bob: env.get_account(2),
    };
    let initial_supply = 5_000_000_000_000 * 10u128.pow(18);
    let styks_price_feed = StyksPriceFeed::deploy(&env, NoArgs);
    let tailor_coin = deploy_mock_cep18_token(&env, "BIG", "BIG", 18, initial_supply);
    let mut usdc = deploy_mock_cep18_token(&env, "USDC", "USD Coin", 6, initial_supply);
    let mut usdt = deploy_mock_cep18_token(&env, "USDT", "Tether USD", 6, initial_supply);
    let mut treasury = Treasury::deploy(&env, TreasuryInitArgs { owner: users.owner });
    let mut ico = ICO::deploy(
        &env,
        ICOInitArgs {
            owner: users.owner,
            styks_price_feed: styks_price_feed.address(),
        },
    );

    treasury.set_tailor_coin(tailor_coin.address());

    let mut vesting = Vesting::deploy(&env, VestingInitArgs { owner: users.owner });
    let mut staking = Staking::deploy(&env, StakingInitArgs { owner: users.owner });

    vesting.set_tailor_coin(tailor_coin.address());
    vesting.add_whitelisted_creator(ico.address());
    vesting.set_staking(staking.address());

    staking.set_tailor_coin(tailor_coin.address());
    staking.set_vesting(vesting.address());

    ico.set_tailor_coin(tailor_coin.address());
    ico.set_treasury(treasury.address());
    ico.set_vesting(vesting.address());
    ico.set_staking(staking.address());

    ico.add_currency(Currency::CSPR, None);
    ico.add_currency(Currency::USDC, Some(usdc.address()));

    usdc.transfer(&users.alice, &U256::from(initial_supply / 2));
    usdc.transfer(&users.bob, &U256::from(initial_supply / 2));

    usdt.transfer(&users.alice, &U256::from(initial_supply / 2));
    usdt.transfer(&users.bob, &U256::from(initial_supply / 2));

    let mut ctx = Context {
        env,
        tailor_coin,
        usdc,
        usdt,
        treasury,
        vesting,
        staking,
        ico,
        styks_price_feed,
        users,
    };

    if add_ico_schedules {
        add_and_verify_ico_schedules(&mut ctx);
    }

    ctx
}

fn deploy_mock_cep18_token(
    env: &HostEnv,
    symbol: &str,
    name: &str,
    decimals: u8,
    initial_supply: u128,
) -> TailorCoinHostRef {
    TailorCoin::deploy(
        env,
        TailorCoinInitArgs {
            symbol: String::from(symbol),
            name: String::from(name),
            decimals,
            initial_supply: U256::from(initial_supply),
        },
    )
}

fn get_ico_schedules_creation_params(env: &HostEnv) -> [ICOScheduleCreateParams; 2] {
    let private_sale = ICOScheduleCreateParams {
        start_timestamp: env.block_time() + ONE_DAY,
        end_timestamp: env.block_time() + ONE_DAY + ONE_MONTH,
        sale_amount: U256::from(125_000_000_000u64) * U256::from(10).pow(U256::from(18)),
        price: U256::from(500_000), // 0.5 USD (0.5 * 1 * 10^6)
        cliff_duration: PRIVATE_SALE_CLIFF_DURATION,
        vesting_duration: PRIVATE_SALE_VESTING_DURATION,
    };
    let sale = ICOScheduleCreateParams {
        start_timestamp: private_sale.end_timestamp + ONE_DAY,
        end_timestamp: private_sale.end_timestamp + ONE_DAY + ONE_MONTH,
        sale_amount: U256::from(250_000_000_000u64) * U256::from(10).pow(U256::from(18)),
        price: U256::from(1_000_000), // 1 USD (1.0 * 1 * 10^6)
        cliff_duration: PRIVATE_SALE_CLIFF_DURATION,
        vesting_duration: PRIVATE_SALE_VESTING_DURATION,
    };

    [private_sale, sale]
}

fn add_and_verify_ico_schedules(ctx: &mut Context) {
    let creation_params = get_ico_schedules_creation_params(&ctx.env);

    for params in &creation_params {
        let expected_ico_schedule_id = ctx.ico.get_ico_schedules_count();
        let prev_owner_balance = ctx.tailor_coin.balance_of(&ctx.users.owner);
        let prev_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());

        ctx.tailor_coin
            .approve(&ctx.ico.address(), &params.sale_amount);

        let ico_schedule_id = ctx.ico.add_ico_schedule(params.clone());
        let curr_owner_balance = ctx.tailor_coin.balance_of(&ctx.users.owner);
        let curr_ico_balance = ctx.tailor_coin.balance_of(&ctx.ico.address());

        assert!(
            ctx.env.emitted_native_event(
                &ctx.ico,
                ICOScheduleAdded {
                    id: expected_ico_schedule_id,
                    start_timestamp: params.start_timestamp,
                    end_timestamp: params.end_timestamp,
                    sale_amount: params.sale_amount,
                    price: params.price,
                }
            ),
            "ICOScheduleAdded event should be emitted"
        );
        assert_eq!(
            ico_schedule_id, expected_ico_schedule_id,
            "Invalid created ICO schedule ID"
        );
        assert_eq!(
            curr_owner_balance,
            prev_owner_balance - params.sale_amount,
            "Invalid owner token balance"
        );
        assert_eq!(
            curr_ico_balance,
            prev_ico_balance + params.sale_amount,
            "Invalid ICO contract token balance"
        );
        assert_eq!(
            ctx.ico.get_ico_schedules_count(),
            expected_ico_schedule_id + 1,
            "Invalid ICO schedules count"
        );
        assert_eq!(
            ctx.ico.get_ico_schedule_by_id(&expected_ico_schedule_id),
            Some(params.clone().into()),
            "Invalid ICO schedule data"
        );
    }
}
