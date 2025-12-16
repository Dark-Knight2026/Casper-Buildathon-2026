use odra::{
    casper_types::{bytesrepr::Bytes, U256},
    prelude::*,
};
use odra_modules::{
    access::Ownable,
    cep95::{CEP95Interface, Cep95},
};

use crate::nft::errors::Error;

#[odra::module]
pub struct NFT {
    ownable: SubModule<Ownable>,
    cep95: SubModule<Cep95>,
    minters: Mapping<Address, bool>,
    burners: Mapping<Address, bool>,
    tokens_count: Var<U256>,
}

#[odra::module]
impl NFT {
    pub fn init(
        &mut self,
        owner: Address,
        symbol: String,
        name: String,
        minters: Vec<Address>,
        burners: Vec<Address>,
    ) {
        self.ownable.init(owner);
        self.cep95.init(symbol, name);

        minters
            .iter()
            .for_each(|minter| self.minters.set(&minter, true));
        burners
            .iter()
            .for_each(|burner| self.burners.set(&burner, true));
    }

    /// Allows to add a new minter by the owner
    pub fn add_minter(&mut self, minter: &Address) {
        self.assert_owner();
        self.minters.set(&minter, true);
    }

    /// Allows to remove a minter by the owner
    pub fn remove_minter(&mut self, minter: &Address) {
        self.assert_owner();
        self.minters.set(&minter, false);
    }

    /// Allows to add a new burner by the owner
    pub fn add_burner(&mut self, burner: &Address) {
        self.assert_owner();
        self.burners.set(&burner, true);
    }

    /// Allows to remove a burner by the owner
    pub fn remove_burner(&mut self, burner: &Address) {
        self.assert_owner();
        self.burners.set(&burner, false);
    }

    /// Allows to mint new token and set its metadata by the minter
    pub fn mint(&mut self, to: Address, metadata: Vec<(String, String)>) {
        self.assert_minter();

        let token_id = self.tokens_count.get_or_default();

        self.cep95.raw_mint(to, token_id, metadata);
        self.tokens_count.set(token_id + 1);
    }

    /// Allows to burn a token by the burner
    pub fn burn(&mut self, token_id: U256) {
        self.assert_burner();
        self.cep95.raw_burn(token_id);
    }

    /// Allows to set new metadata for a token by the minter or the burner
    pub fn set_metadata(&mut self, token_id: U256, metadata: Vec<(String, String)>) {
        self.assert_minter_or_burner();
        self.assert_valid_token_id(&token_id);
        self.cep95.set_metadata(token_id, metadata);
    }

    /// Allows to update metadata for a token by the minter or the burner
    pub fn update_metadata(&mut self, token_id: U256, metadata: Vec<(String, String)>) {
        self.assert_minter_or_burner();
        self.assert_valid_token_id(&token_id);
        self.cep95.update_metadata(token_id, metadata);
    }

    /// Returns `true` if `address` has the `minter` role, `false` otherwise
    pub fn is_minter(&self, address: &Address) -> bool {
        self.minters.get_or_default(&address)
    }

    /// Returns `true` if `address` has the `burner` role, `false` otherwise
    pub fn is_burner(&self, address: &Address) -> bool {
        self.burners.get_or_default(&address)
    }

    /// Returns a number of minted tokens
    pub fn get_tokens_count(&self) -> U256 {
        self.tokens_count.get_or_default()
    }

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }

        to self.cep95 {
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn balance_of(&self, owner: Address) -> U256;
            fn owner_of(&self, token_id: U256) -> Option<Address>;
            fn safe_transfer_from(&mut self, from: Address, to: Address, token_id: U256, data: Option<Bytes>);
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

impl NFT {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn assert_minter(&self) {
        if !self.is_minter(&self.env().caller()) {
            self.env().revert(Error::CallerNotMinter);
        }
    }

    #[inline]
    fn assert_burner(&self) {
        if !self.is_burner(&self.env().caller()) {
            self.env().revert(Error::CallerNotBurner);
        }
    }

    #[inline]
    fn assert_minter_or_burner(&self) {
        if !self.is_minter(&self.env().caller()) && !self.is_burner(&self.env().caller()) {
            self.env().revert(Error::CallerNotMinterNorBurner);
        }
    }

    #[inline]
    fn assert_valid_token_id(&self, token_id: &U256) {
        if *token_id >= self.tokens_count.get_or_default() {
            self.env().revert(Error::InvalidTokenId);
        }
    }
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotMinter = 62_000,
        CallerNotBurner = 62_001,
        CallerNotMinterNorBurner = 62_002,
        InvalidTokenId = 62_003,
    }
}

#[cfg(test)]
mod tests {}
