use odra::{casper_types::U256, prelude::*};
use odra_modules::cep18_token::Cep18;

use crate::big_coin::errors::Error;

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        AlreadyInitialized = 1300,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error)]
pub struct BigCoin {
    big_coin: SubModule<Cep18>,
    initialized: Var<bool>,
}

#[odra::module]
impl BigCoin {
    pub fn init(&mut self, symbol: String, name: String, decimals: u8, initial_supply: U256) {
        if self.initialized.get_or_default() {
            self.env().revert(Error::AlreadyInitialized);
        }

        self.big_coin.init(symbol, name, decimals, initial_supply);

        self.initialized.set(true);
    }

    delegate! {
        to self.big_coin {
            fn transfer(&mut self, recipient: &Address, amount: &U256);
            fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256);
            fn approve(&mut self, spender: &Address, amount: &U256);
            fn decrease_allowance(&mut self, spender: &Address, decr_by: &U256);
            fn increase_allowance(&mut self, spender: &Address, inc_by: &U256);
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn decimals(&self) -> u8;
            fn total_supply(&self) -> U256;
            fn balance_of(&self, address: &Address) -> U256;
            fn allowance(&self, owner: &Address, spender: &Address) -> U256;
        }
    }
}
