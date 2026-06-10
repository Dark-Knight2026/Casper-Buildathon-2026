use odra::{
    casper_types::{U128, U256, U512},
    prelude::*,
    uints::ToU512,
    ContractRef,
};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};

use crate::{
    constants::STYKS_ORACLE_CSPR_USDT_PRICE_FEED_ID,
    ico::{
        errors::Error,
        events::{
            BigCoinSet, CurrencyAdded, CurrencyRemoved, ICOScheduleAdded, StakingSet,
            TokensPurchased, TreasurySet, UnsoldTokensWithdrawn, VestingSet,
        },
        types::{Currency, ICOSchedule, ICOScheduleCreateParams},
    },
    interfaces::styks_price_feed::StyksPriceFeedOracleContractRef,
    staking::StakingContractRef,
    treasury::TreasuryContractRef,
    vesting::VestingContractRef,
};

pub type ICOScheduleId = U128;

#[odra::module(
    errors = Error,
    events = [ICOScheduleAdded, CurrencyAdded, CurrencyRemoved, TokensPurchased, UnsoldTokensWithdrawn, BigCoinSet, TreasurySet, VestingSet, StakingSet]
)]
pub struct ICO {
    ownable: SubModule<Ownable>,
    currencies: Mapping<Currency, (bool, Option<Address>)>,
    ico_schedules: Mapping<ICOScheduleId, ICOSchedule>,
    ico_schedules_count: Var<U128>,
    styks_price_feed: External<StyksPriceFeedOracleContractRef>,
    big_coin: External<Cep18ContractRef>,
    treasury: External<TreasuryContractRef>,
    staking: External<StakingContractRef>,
    vesting: External<VestingContractRef>,
}

#[odra::module]
impl ICO {
    pub fn init(&mut self, owner: Address, styks_price_feed: Address) {
        self.ownable.init(owner);

        self.styks_price_feed.set(styks_price_feed);
    }

    /// Sets the BIG token contract address by the owner
    pub fn set_big_coin(&mut self, big_coin: Address) {
        self.assert_owner();
        self.big_coin.set(big_coin);

        self.env().emit_event(BigCoinSet { big_coin });
    }

    /// Sets the Treasury contract address by the owner
    pub fn set_treasury(&mut self, treasury: Address) {
        self.assert_owner();
        self.treasury.set(treasury);

        self.env().emit_event(TreasurySet { treasury });
    }

    /// Sets the Vesting contract address by the owner
    pub fn set_vesting(&mut self, vesting: Address) {
        self.assert_owner();
        self.vesting.set(vesting);

        self.env().emit_event(VestingSet { vesting });
    }

    /// Sets the Staking contract address by the owner
    pub fn set_staking(&mut self, staking: Address) {
        self.assert_owner();
        self.staking.set(staking);

        self.env().emit_event(StakingSet { staking });
    }

    /// Adds a new currency by the owner. Added currency will be supported for making purchases during ICOs
    pub fn add_currency(&mut self, currency: Currency, address: Option<Address>) {
        self.assert_owner();

        if currency != Currency::CSPR {
            if address.is_none() {
                self.revert(Error::AddressIsRequired);
            }

            self.currencies.set(&currency, (true, address));
        } else {
            self.currencies.set(&currency, (true, None));
        }

        self.env().emit_event(CurrencyAdded { currency });
    }

    /// Removes a currency by the owner. Removed currency will not be supported for making purchases during ICOs
    pub fn remove_currency(&mut self, currency: Currency) {
        self.assert_owner();
        self.currencies.set(&currency, (false, None));

        self.env().emit_event(CurrencyRemoved { currency });
    }

    /// Adds a new ICO schedule by the owner
    pub fn add_ico_schedule(&mut self, ico_schedule: ICOScheduleCreateParams) -> ICOScheduleId {
        self.assert_owner();

        let ico_id = self.get_ico_schedules_count();

        if ico_id > U128::zero() {
            self.validate_ico_schedule(&ico_schedule, Some(ico_id - 1));
        } else {
            self.validate_ico_schedule(&ico_schedule, None);
        }

        let caller = self.env().caller();
        let self_address = self.env().self_address();
        let sale_amount = ico_schedule.sale_amount;

        self.ico_schedules.set(&ico_id, ico_schedule.clone().into());
        self.ico_schedules_count.set(ico_id + 1);

        // Funding requirement: The caller (who must be the current owner of this ICO contract,
        // thanks to the assert_owner() above) must personally hold (or have approved) the full
        // sale_amount of BIG tokens. This contract pulls via transfer_from(caller, self, sale_amount).
        //
        // If ownership of the *ICO contract* is later transferred to a different address that
        // does not hold/approve sufficient BIG, future add_ico_schedule calls from the new owner
        // will fail with insufficient balance.
        //
        // The deploy script (which uses new_owner = env.caller()) ensures the final owner retains
        // the remaining BIG supply after the initial schedule(s) are created.
        self.big_coin
            .transfer_from(&caller, &self_address, &sale_amount);

        self.env().emit_event(ICOScheduleAdded {
            id: ico_id,
            start_timestamp: ico_schedule.start_timestamp,
            end_timestamp: ico_schedule.end_timestamp,
            sale_amount: ico_schedule.sale_amount,
            price: ico_schedule.price,
        });

        ico_id
    }

    /// Gives a possibility to purchase tokens from active ICO schedule
    #[odra(payable)]
    #[odra(non_reentrant)]
    pub fn purchase(&mut self, amount_to_spend: U256, currency: Currency) -> U256 {
        if amount_to_spend.is_zero() {
            self.env().revert(Error::InvalidAmountToSpend);
        }

        let (is_supported_currency, currency_address) = self.get_currency_by_key(&currency);

        if !is_supported_currency {
            self.env().revert(Error::UnsupportedCurrency);
        }

        let (current_ico_schedule_id, mut current_ico_schedule) = self
            .get_current_ico_schedule()
            .unwrap_or_revert_with(&self.env(), Error::NoActiveIcoSchedule);
        let ico_token_price = self.get_ico_token_price(currency);

        // For CSPR, amount_to_spend is in motes (10^9 per CSPR). Normalize to 6 decimal
        // units (like USDC/USDT and the schedule price) to match the conversion formula.
        // Without this, CSPR purchases over-issue BIG by ~10^3 (motes vs price decimals)
        // plus potential oracle scaling mismatches (up to 10^6 total in some cases).
        let spend_for_calc = if currency == Currency::CSPR {
            amount_to_spend / U256::from(1_000)
        } else {
            amount_to_spend
        };
        let purchase_amount = spend_for_calc * U256::from(10).pow(U256::from(18)) / ico_token_price;

        if purchase_amount.is_zero() {
            self.env().revert(Error::InvalidPurchaseAmount);
        }

        if purchase_amount > current_ico_schedule.sale_amount - current_ico_schedule.sold_amount {
            self.env().revert(Error::InsufficientSellingTokensAmount);
        }

        let caller = &self.env().caller();
        let attached_value = self.env().attached_value();
        let cliff_duration = current_ico_schedule.cliff_duration;
        let vesting_duration = current_ico_schedule.vesting_duration;

        match currency {
            Currency::CSPR => {
                if attached_value != amount_to_spend.to_u512() {
                    self.env().revert(Error::InvalidAmountAttached);
                }

                self.treasury.with_tokens(attached_value).receive();
            }
            Currency::USDC | Currency::USDT => {
                if attached_value > U512::zero() {
                    self.env().revert(Error::InvalidAmountAttached);
                }

                let mut currency = Cep18ContractRef::new(
                    self.env(),
                    currency_address.unwrap_or_revert_with(&self.env(), Error::AddressIsRequired),
                );

                currency.transfer_from(caller, self.treasury.address(), &amount_to_spend);
            }
        }

        current_ico_schedule.sold_amount += purchase_amount;

        self.ico_schedules
            .set(&current_ico_schedule_id, current_ico_schedule);

        self.big_coin
            .approve(self.staking.address(), &purchase_amount);

        self.staking.stake_for(*caller, purchase_amount);

        let vesting_id = self.vesting.create_schedule(
            *caller,
            purchase_amount,
            cliff_duration,
            vesting_duration,
        );

        self.env().emit_event(TokensPurchased {
            amount: purchase_amount,
            currency,
            price: ico_token_price,
            cost: amount_to_spend,
            timestamp: self.env().get_block_time(),
            buyer: *caller,
            vesting_id,
        });

        purchase_amount
    }

    /// Allows to withdraw all unsold tokens from all finished ICO schedules. Only the owner can interact with this
    /// entrypoint
    pub fn withdraw_unsold_tokens(&mut self, recipient: Address) {
        self.assert_owner();

        let mut amount = U256::zero();

        for i in 0..self.get_ico_schedules_count().as_u128() {
            let ico_schedule_id = U128::from(i);
            let mut ico_schedule = self
                .get_ico_schedule_by_id(&ico_schedule_id)
                .unwrap_or_revert_with(&self.env(), Error::InvalidICOScheduleId);

            if self.env().get_block_time() <= ico_schedule.end_timestamp {
                break;
            }

            let withdrawable =
                ico_schedule.sale_amount - ico_schedule.sold_amount - ico_schedule.withdrawn_amount;

            if withdrawable.is_zero() {
                continue;
            }

            ico_schedule.withdrawn_amount += withdrawable;
            self.ico_schedules.set(&ico_schedule_id, ico_schedule);

            amount += withdrawable;
        }

        if amount > U256::zero() {
            self.big_coin.transfer(&recipient, &amount);

            self.env()
                .emit_event(UnsoldTokensWithdrawn { recipient, amount });
        }
    }

    /// Returns current ICO schedule and its ID if some schedule is active, `None` otherwise
    pub fn get_current_ico_schedule(&self) -> Option<(ICOScheduleId, ICOSchedule)> {
        let mut result = None;

        for i in 0..self.get_ico_schedules_count().as_u128() {
            let ico_schedule = self
                .get_ico_schedule_by_id(&U128::from(i))
                .unwrap_or_revert_with(&self.env(), Error::InvalidICOScheduleId);

            if ico_schedule.is_active(&self.env()) {
                result = Some((U128::from(i), ico_schedule));

                break;
            }
        }

        result
    }

    /// Returns ICO token price in USD
    pub fn get_ico_token_price(&self, currency: Currency) -> U256 {
        match self.get_current_ico_schedule() {
            None => U256::zero(),
            Some(current_ico_schedule) => match currency {
                Currency::CSPR => {
                    let cspr_price_usd = self
                        .styks_price_feed
                        .get_twap_price(&String::from(STYKS_ORACLE_CSPR_USDT_PRICE_FEED_ID))
                        .unwrap_or_revert_with(&self.env(), Error::StyksOracleCanNotReturnTWAP);

                    if cspr_price_usd == 0 {
                        self.env().revert(Error::StyksOracleCanNotReturnTWAP);
                    }

                    // Styks Oracle returns price with 8 decimals
                    current_ico_schedule.1.price * U256::from(10).pow(U256::from(8))
                        / cspr_price_usd
                }
                Currency::USDC | Currency::USDT => current_ico_schedule.1.price,
            },
        }
    }

    /// Returns info about currency by its key
    pub fn get_currency_by_key(&self, currency: &Currency) -> (bool, Option<Address>) {
        self.currencies.get(currency).unwrap_or_default()
    }

    /// Returns ICO schedule by its ID, `None` if ICO schedule does not exist
    pub fn get_ico_schedule_by_id(&self, ico_schedule_id: &ICOScheduleId) -> Option<ICOSchedule> {
        self.ico_schedules.get(ico_schedule_id)
    }

    /// Returns a number of registered ICO schedules
    pub fn get_ico_schedules_count(&self) -> U128 {
        self.ico_schedules_count.get_or_default()
    }

    /// Returns the Styks Oracle Price Feed contract address
    pub fn get_styks_price_feed_contract_address(&self) -> Address {
        *self.styks_price_feed.address()
    }

    /// Returns the BIG token contract address
    pub fn get_big_coin_contract_address(&self) -> Address {
        *self.big_coin.address()
    }

    /// Returns the Treasury contract address
    pub fn get_treasury_contract_address(&self) -> Address {
        *self.treasury.address()
    }

    /// Returns the Staking contract address
    pub fn get_staking_contract_address(&self) -> Address {
        *self.staking.address()
    }

    /// Returns the Vesting contract address
    pub fn get_vesting_contract_address(&self) -> Address {
        *self.vesting.address()
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }
    }
}

impl ICO {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    fn validate_ico_schedule(
        &self,
        ico_schedule: &ICOScheduleCreateParams,
        prev_ico_schedule_id: Option<ICOScheduleId>,
    ) {
        if prev_ico_schedule_id.is_some() {
            let prev_ico_schedule = self
                .get_ico_schedule_by_id(&prev_ico_schedule_id.unwrap())
                .unwrap_or_revert_with(&self.env(), Error::InvalidICOScheduleId);

            // Start timestamp validation when previous ICO schedule exists
            if prev_ico_schedule.end_timestamp > self.env().get_block_time() {
                if ico_schedule.start_timestamp <= prev_ico_schedule.end_timestamp {
                    self.env().revert(Error::InvalidICOScheduleStartTimestamp);
                }
            } else if ico_schedule.start_timestamp <= self.env().get_block_time() {
                self.env().revert(Error::InvalidICOScheduleStartTimestamp);
            }
        }

        // Start timestamp validation when no previous ICO schedule exists
        if prev_ico_schedule_id.is_none()
            && ico_schedule.start_timestamp <= self.env().get_block_time()
        {
            self.env().revert(Error::InvalidICOScheduleStartTimestamp);
        }

        // End timestamp validation
        if ico_schedule.end_timestamp <= ico_schedule.start_timestamp {
            self.env().revert(Error::InvalidICOScheduleEndTimestamp);
        }

        // Sale amount validation
        if ico_schedule.sale_amount.is_zero() {
            self.env().revert(Error::InvalidICOScheduleSaleAmount);
        }

        // Price validation
        if ico_schedule.price.is_zero() {
            self.env().revert(Error::InvalidICOSchedulePrice);
        }

        // Vesting terms validation
        if ico_schedule.vesting_duration == 0 {
            self.env().revert(Error::InvalidICOScheduleVestingDuration);
        }
        if ico_schedule.cliff_duration > ico_schedule.vesting_duration {
            self.env()
                .revert(Error::ICOScheduleCliffExceedsVestingDuration);
        }
    }
}

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    use crate::ico::{types::Currency, ICOScheduleId};

    #[odra::event]
    pub struct CurrencyAdded {
        pub currency: Currency,
    }

    #[odra::event]
    pub struct CurrencyRemoved {
        pub currency: Currency,
    }

    #[odra::event]
    pub struct ICOScheduleAdded {
        pub id: ICOScheduleId,
        pub start_timestamp: u64,
        pub end_timestamp: u64,
        pub sale_amount: U256,
        pub price: U256,
    }

    #[odra::event]
    pub struct TokensPurchased {
        pub amount: U256,
        pub currency: Currency,
        pub price: U256,
        pub cost: U256,
        pub timestamp: u64,
        pub buyer: Address,
        pub vesting_id: U256,
    }

    #[odra::event]
    pub struct UnsoldTokensWithdrawn {
        pub recipient: Address,
        pub amount: U256,
    }

    #[odra::event]
    pub struct BigCoinSet {
        pub big_coin: Address,
    }

    #[odra::event]
    pub struct TreasurySet {
        pub treasury: Address,
    }

    #[odra::event]
    pub struct VestingSet {
        pub vesting: Address,
    }

    #[odra::event]
    pub struct StakingSet {
        pub staking: Address,
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        InvalidICOScheduleId = 500,
        InvalidICOScheduleStartTimestamp = 501,
        InvalidICOScheduleEndTimestamp = 502,
        InvalidICOScheduleSaleAmount = 503,
        InvalidICOSchedulePrice = 504,
        InvalidAmountToSpend = 505,
        UnsupportedCurrency = 506,
        NoActiveIcoSchedule = 507,
        StyksOracleCanNotReturnTWAP = 508,
        AddressIsRequired = 509,
        InvalidAmountAttached = 510,
        InsufficientSellingTokensAmount = 511,
        InvalidPurchaseAmount = 512,
        InvalidICOScheduleVestingDuration = 513,
        ICOScheduleCliffExceedsVestingDuration = 514,
    }
}

pub mod types {
    use odra::{casper_types::U256, ContractEnv};

    #[odra::odra_type]
    pub struct ICOScheduleCreateParams {
        pub start_timestamp: u64,
        pub end_timestamp: u64,
        pub sale_amount: U256,
        pub price: U256,
        pub cliff_duration: u64,
        pub vesting_duration: u64,
    }

    #[odra::odra_type]
    pub struct ICOSchedule {
        pub start_timestamp: u64,
        pub end_timestamp: u64,
        pub sale_amount: U256,
        pub sold_amount: U256,
        pub price: U256,
        pub cliff_duration: u64,
        pub vesting_duration: u64,
        pub withdrawn_amount: U256,
    }

    #[odra::odra_type]
    #[derive(Copy)]
    pub enum Currency {
        CSPR,
        USDC,
        USDT,
    }

    impl ICOSchedule {
        pub fn is_active(&self, env: &ContractEnv) -> bool {
            let now = env.get_block_time();

            self.start_timestamp <= now && now <= self.end_timestamp
        }
    }

    impl From<ICOScheduleCreateParams> for ICOSchedule {
        fn from(ico_schedule: ICOScheduleCreateParams) -> Self {
            Self {
                start_timestamp: ico_schedule.start_timestamp,
                end_timestamp: ico_schedule.end_timestamp,
                sale_amount: ico_schedule.sale_amount,
                sold_amount: U256::zero(),
                withdrawn_amount: U256::zero(),
                price: ico_schedule.price,
                cliff_duration: ico_schedule.cliff_duration,
                vesting_duration: ico_schedule.vesting_duration,
            }
        }
    }
}
