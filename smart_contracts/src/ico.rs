use odra::{casper_types::U128, prelude::*};
use odra_modules::{access::Ownable, cep18_token::Cep18ContractRef};
use styks_contracts::styks_price_feed::StyksPriceFeedContractRef;

use crate::ico::{
    errors::Error,
    events::{CurrencyAdded, CurrencyRemoved, ICOScheduleAdded},
    types::{Currency, ICOSchedule, ICOScheduleCreateParams},
};

pub type ICOScheduleId = U128;

#[odra::module(errors = Error, events = [ICOScheduleAdded, CurrencyAdded, CurrencyRemoved])]
pub struct ICO {
    ownable: SubModule<Ownable>,
    currencies: Mapping<Currency, Option<Address>>,
    ico_schedules: Mapping<ICOScheduleId, ICOSchedule>,
    ico_schedules_count: Var<U128>,
    current_ico_id: Var<ICOScheduleId>,
    styks_price_feed: External<StyksPriceFeedContractRef>,
    tailor_coin: External<Cep18ContractRef>,
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

    /// Adds a new currency by the owner. Added currency will be supported for making purchases during ICOs
    pub fn add_currency(&mut self, currency: Currency, address: Address) {
        self.assert_owner();
        self.currencies.set(&currency, Some(address));

        self.env().emit_native_event(CurrencyAdded { currency });
    }

    /// Removes a currency by the owner. Removed currency will not be supported for making purchases during ICOs
    pub fn remove_currency(&mut self, currency: Currency) {
        self.assert_owner();
        self.currencies.set(&currency, None);

        self.env().emit_native_event(CurrencyRemoved { currency });
    }

    /// Adds a new ICO schedule by the owner
    pub fn add_ico_schedule(&mut self, ico_schedule: ICOScheduleCreateParams) -> ICOScheduleId {
        self.assert_owner();

        let ico_id = self.ico_schedules_count.get_or_default();

        if ico_id > U128::zero() {
            self.validate_ico_schedule(&ico_schedule, Some(ico_id - 1));
        } else {
            self.validate_ico_schedule(&ico_schedule, None);
            self.current_ico_id.set(ico_id);
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
                .ico_schedules
                .get(&prev_ico_schedule_id.unwrap())
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
}

pub mod events {
    use odra::prelude::*;

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
            env.get_block_time() <= self.end_timestamp
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
