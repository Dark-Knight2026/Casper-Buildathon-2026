use odra::{casper_types::U256, prelude::*};
use odra_modules::{
    cep18_token::Cep18,
    cep96::{Cep96, Cep96ContractMetadata},
};

// =============================================================================
// Contract
// =============================================================================

#[odra::module]
pub struct BigCoin {
    big_coin: SubModule<Cep18>,
    /// CEP-96 on-chain discoverability metadata. Immutable after deploy.
    metadata: SubModule<Cep96>,
}

#[odra::module]
impl BigCoin {
    pub fn init(&mut self, symbol: String, name: String, decimals: u8, initial_supply: U256) {
        self.big_coin.init(symbol, name, decimals, initial_supply);
        self.metadata.init(
            Some("BIG LeaseFi Token".into()),
            Some(
                "CEP-18 protocol token for LeaseFi payments and treasury operations."
                    .into(),
            ),
            None,
            None,
        );
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

        to self.metadata {
            fn contract_name(&self) -> Option<String>;
            fn contract_description(&self) -> Option<String>;
            fn contract_icon_uri(&self) -> Option<String>;
            fn contract_project_uri(&self) -> Option<String>;
        }
    }
}
