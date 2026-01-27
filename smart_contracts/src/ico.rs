use odra::{
    casper_types::{U128, U256, U512},
    prelude::*,
    uints::ToU512,
    ContractRef,
};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};
use styks_contracts::styks_price_feed::StyksPriceFeedContractRef;

use crate::{
    constants::STYKS_ORACLE_CSPR_USDT_PRICE_FEED_ID,
    ico::{
        errors::Error,
        events::{
            CurrencyAdded, CurrencyRemoved, ICOScheduleAdded, TokensPurchased,
            UnsoldTokensWithdrawn,
        },
        types::{Currency, ICOSchedule, ICOScheduleCreateParams},
    },
};

pub type ICOScheduleId = U128;

#[odra::module(
    errors = Error,
    events = [ICOScheduleAdded, CurrencyAdded, CurrencyRemoved, TokensPurchased, UnsoldTokensWithdrawn]
)]
pub struct ICO {
    ownable: SubModule<Ownable>,
    currencies: Mapping<Currency, (bool, Option<Address>)>,
    ico_schedules: Mapping<ICOScheduleId, ICOSchedule>,
    ico_schedules_count: Var<U128>,
    styks_price_feed: External<StyksPriceFeedContractRef>,
    tailor_coin: External<Cep18ContractRef>,
    treasury: Var<Address>,
}

#[odra::module]
impl ICO {
    pub fn init(&mut self, owner: Address, styks_price_feed: Address) {
        self.ownable.init(owner);

        self.styks_price_feed.set(styks_price_feed);
    }

    /// Sets the TailorCoin (BIG) token contract address by the owner
    pub fn set_tailor_coin(&mut self, tailor_coin: Address) {
        self.assert_owner();
        self.tailor_coin.set(tailor_coin);
    }

    /// Sets the Treasury contract address by the owner
    pub fn set_treasury(&mut self, treasury: Address) {
        self.assert_owner();
        self.treasury.set(treasury);
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

        self.env().emit_native_event(CurrencyAdded { currency });
    }

    /// Removes a currency by the owner. Removed currency will not be supported for making purchases during ICOs
    pub fn remove_currency(&mut self, currency: Currency) {
        self.assert_owner();
        self.currencies.set(&currency, (false, None));

        self.env().emit_native_event(CurrencyRemoved { currency });
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

        let owner = self.get_owner();
        let self_address = self.env().self_address();
        let sale_amount = ico_schedule.sale_amount;

        self.ico_schedules.set(&ico_id, ico_schedule.into());
        self.ico_schedules_count.set(ico_id + 1);

        self.tailor_coin
            .transfer_from(&owner, &self_address, &sale_amount);

        self.env()
            .emit_native_event(ICOScheduleAdded { id: ico_id });

        ico_id
    }

    #[odra(payable)]
    #[odra(non_reentrant)]
    pub fn purchase(&mut self, amount: U256, currency: Currency) {
        if amount.is_zero() {
            self.env().revert(Error::InvalidPurchaseAmount);
        }

        let (is_supported_currency, currency_address) = self
            .get_currency_by_key(&currency)
            .unwrap_or_revert_with(&self.env(), Error::UnsupportedCurrency);

        if !is_supported_currency {
            self.env().revert(Error::UnsupportedCurrency);
        }

        let (current_ico_schedule_id, mut current_ico_schedule) = self
            .get_current_ico_schedule()
            .unwrap_or_revert_with(&self.env(), Error::NoActiveIcoSchedule);

        if amount > current_ico_schedule.sale_amount - current_ico_schedule.sold_amount {
            self.env().revert(Error::InsufficientSellingTokensAmount);
        }

        let ico_token_price = self.get_ico_token_price(&currency, &current_ico_schedule);
        let purchase_cost = ico_token_price * amount;
        let caller = &self.env().caller();
        let attached_value = self.env().attached_value();
        let treasury = self.get_treasury_contract_address();

        if currency == Currency::CSPR {
            if attached_value != purchase_cost.to_u512() {
                self.env().revert(Error::InvalidAmountAttached);
            }

            self.env().transfer_tokens(&treasury, &attached_value);
        } else {
            if attached_value > U512::zero() {
                self.env().revert(Error::InvalidAmountAttached);
            }

            Cep18ContractRef::new(
                self.env(),
                currency_address.unwrap_or_revert_with(&self.env(), Error::AddressIsRequired),
            )
            .transfer_from(&caller, &treasury, &purchase_cost);
        }

        current_ico_schedule.sold_amount += amount;
        self.ico_schedules
            .set(&current_ico_schedule_id, current_ico_schedule);

        self.tailor_coin.transfer(&caller, &amount);

        self.env().emit_native_event(TokensPurchased {
            amount,
            currency,
            price: ico_token_price,
            cost: purchase_cost,
            timestamp: self.env().get_block_time(),
        });
    }

    pub fn withdraw_unsold_tokens(&mut self, recipient: Address) {
        self.assert_owner();

        let mut amount = U256::zero();

        for i in 0..self.get_ico_schedules_count().as_u128() {
            let ico_schedule = self
                .get_ico_schedule_by_id(&U128::from(i))
                .unwrap_or_revert_with(&self.env(), Error::InvalidICOScheduleId);

            if self.env().get_block_time() <= ico_schedule.end_timestamp {
                break;
            }

            amount += ico_schedule.sale_amount - ico_schedule.sold_amount;
        }

        if amount > U256::zero() {
            self.tailor_coin.transfer(&recipient, &amount);

            self.env()
                .emit_native_event(UnsoldTokensWithdrawn { recipient, amount });
        }
    }

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

    pub fn get_currency_by_key(&self, currency: &Currency) -> Option<(bool, Option<Address>)> {
        self.currencies.get(currency)
    }

    pub fn get_ico_schedule_by_id(&self, ico_schedule_id: &ICOScheduleId) -> Option<ICOSchedule> {
        self.ico_schedules.get(ico_schedule_id)
    }

    pub fn get_ico_schedules_count(&self) -> U128 {
        self.ico_schedules_count.get_or_default()
    }

    pub fn get_styks_price_feed_contract_address(&self) -> Address {
        *self.styks_price_feed.address()
    }

    pub fn get_tailor_coin_contract_address(&self) -> Address {
        *self.tailor_coin.address()
    }

    pub fn get_treasury_contract_address(&self) -> Address {
        self.treasury
            .get_or_revert_with(Error::TreasuryContractIsNotSet)
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
            if prev_ico_schedule.is_active(&self.env()) {
                if ico_schedule.start_timestamp <= prev_ico_schedule.end_timestamp {
                    self.env().revert(Error::InvalidICOScheduleStartTimestamp);
                }
            } else {
                if ico_schedule.start_timestamp <= self.env().get_block_time() {
                    self.env().revert(Error::InvalidICOScheduleStartTimestamp);
                }
            }
        }

        // Start timestamp validation when no previous ICO schedule exists
        if prev_ico_schedule_id.is_none() {
            if ico_schedule.start_timestamp <= self.env().get_block_time() {
                self.env().revert(Error::InvalidICOScheduleStartTimestamp);
            }
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
    }

    fn get_ico_token_price(&self, currency: &Currency, current_ico_schedule: &ICOSchedule) -> U256 {
        match currency {
            Currency::USDC | Currency::USDT => current_ico_schedule.price,
            Currency::CSPR => {
                let cspr_price_usd = self
                    .styks_price_feed
                    .get_twap_price(&String::from(STYKS_ORACLE_CSPR_USDT_PRICE_FEED_ID))
                    .unwrap_or_revert_with(&self.env(), Error::StyksOracleCanNotReturnTWAP);

                current_ico_schedule.price * 10u32.pow(9) / cspr_price_usd
            }
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
    }

    #[odra::event]
    pub struct TokensPurchased {
        pub amount: U256,
        pub currency: Currency,
        pub price: U256,
        pub cost: U256,
        pub timestamp: u64,
    }

    #[odra::event]
    pub struct UnsoldTokensWithdrawn {
        pub recipient: Address,
        pub amount: U256,
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        InvalidICOScheduleId = 59_000,
        InvalidICOScheduleStartTimestamp = 59_001,
        InvalidICOScheduleEndTimestamp = 59_002,
        InvalidICOScheduleSaleAmount = 59_003,
        InvalidICOSchedulePrice = 59_004,
        InvalidPurchaseAmount = 59_005,
        UnsupportedCurrency = 59_006,
        NoActiveIcoSchedule = 59_007,
        StyksOracleCanNotReturnTWAP = 59_008,
        AddressIsRequired = 59_009,
        InvalidAmountAttached = 59_010,
        TreasuryContractIsNotSet = 59_011,
        InsufficientSellingTokensAmount = 59_012,
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
    }

    #[odra::odra_type]
    pub struct ICOSchedule {
        pub start_timestamp: u64,
        pub end_timestamp: u64,
        pub sale_amount: U256,
        pub sold_amount: U256,
        pub price: U256,
    }

    #[odra::odra_type]
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
                price: ico_schedule.price,
            }
        }
    }
}
