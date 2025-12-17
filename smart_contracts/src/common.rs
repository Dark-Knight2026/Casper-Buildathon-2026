use odra::{casper_types::U256, prelude::Address};

#[odra::odra_type]
#[derive(Copy)]
pub struct CurrencyAmount {
    currency: Option<Address>,
    amount: U256,
}

impl CurrencyAmount {
    pub fn new(currency: Option<Address>, amount: U256) -> Self {
        Self { currency, amount }
    }

    pub fn currency(&mut self) -> &mut Option<Address> {
        &mut self.currency
    }

    pub fn amount(&mut self) -> &mut U256 {
        &mut self.amount
    }
}
