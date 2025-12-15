use odra::{
    casper_types::{bytesrepr::Bytes, U256},
    prelude::*,
};
use odra_modules::cep95::{CEP95Interface, Cep95};

#[odra::module]
pub struct NFT {
    nft: SubModule<Cep95>,
}

#[odra::module]
impl NFT {
    pub fn init(&mut self, symbol: String, name: String) {
        self.nft.init(symbol, name);
    }

    delegate! {
        to self.nft {
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn balance_of(&self, owner: Address) -> U256;
            fn owner_of(&self, token_id: U256) -> Option<Address>;
            fn safe_transfer_from(
                &mut self,
                from: Address,
                to: Address,
                token_id: U256,
                data: Option<Bytes>
            );
            fn transfer_from(&mut self, from: Address, to: Address, token_id: U256);
            fn approve(&mut self, spender: Address, token_id: U256);
            fn revoke_approval(&mut self, token_id: U256);
            fn approved_for(&self, token_id: U256) -> Option<Address>;
            fn approve_for_all(&mut self, operator: Address);
            fn revoke_approval_for_all(&mut self, operator: Address);
            fn is_approved_for_all(&self, owner: Address, operator: Address) -> bool;
            fn token_metadata(&self, token_id: U256) -> Vec<(String, String)>;
        }
    }
}

#[cfg(test)]
mod tests {}
