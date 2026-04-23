use odra::{casper_types::U256, prelude::Address};
use odra_modules::access::Role;
use sha3::{Digest, Keccak256};

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

pub fn hash_role(role_name: &str) -> Role {
    let mut hasher = Keccak256::default();
    hasher.update(role_name.as_bytes());
    hasher.finalize().into()
}
