use odra::{casper_types::U256, prelude::*};
use odra_modules::cep18_token::Cep18;

#[odra::module]
pub struct TailorCoin {
    tailor_coin: SubModule<Cep18>,
}

#[odra::module]
impl TailorCoin {
    pub fn init(&mut self, symbol: String, name: String, decimals: u8, initial_supply: U256) {
        self.tailor_coin
            .init(symbol, name, decimals, initial_supply);
    }

    delegate! {
        to self.tailor_coin {
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
