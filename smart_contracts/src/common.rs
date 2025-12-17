use derive_getters::Getters;
use odra::{casper_types::U256, prelude::Address};

#[odra::odra_type]
#[derive(Getters)]
pub struct CurrencyAmount {
    currency: Option<Address>,
    amount: U256,
}

impl CurrencyAmount {
    pub fn new(currency: Option<Address>, amount: U256) -> Self {
        Self { currency, amount }
    }
}
