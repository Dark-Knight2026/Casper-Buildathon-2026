use odra::{
    casper_types::{bytesrepr::Bytes, U256},
    prelude::*,
};
use odra_modules::{
    access::{AccessControl, Ownable, Role, DEFAULT_ADMIN_ROLE},
    cep95::{CEP95Interface, Cep95},
};

use sha3::{Digest, Keccak256};

use crate::nft::{
    errors::Error,
    events::{BurnerAdded, BurnerRemoved, MinterAdded, MinterRemoved},
};

// =============================================================================
// Roles
// =============================================================================

pub const ROLE_MINTER: &str = "MINTER";
pub const ROLE_BURNER: &str = "BURNER";
pub const ROLE_WHITELIST_MANAGER: &str = "WHITELIST_MANAGER";
pub const ROLE_FREEZER: &str = "FREEZER";
pub const ROLE_FORCE_TRANSFERER: &str = "FORCE_TRANSFERER";

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct MinterAdded {
        pub minter: Address,
    }

    #[odra::event]
    pub struct MinterRemoved {
        pub minter: Address,
    }

    #[odra::event]
    pub struct BurnerAdded {
        pub burner: Address,
    }

    #[odra::event]
    pub struct BurnerRemoved {
        pub burner: Address,
    }

    #[odra::event]
    pub struct Whitelisted {
        pub account: Address,
        pub status: bool,
    }

    #[odra::event]
    pub struct Frozen {
        pub account: Address,
        pub token_id: U256,
        pub frozen_status: bool,
    }

    #[odra::event]
    pub struct ForcedTransfer {
        pub from: Address,
        pub to: Address,
        pub token_id: U256,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        // TODO: Evaluate if we need backward compatibility
        // Backward Compatible
        CallerNotMinter = 100,
        CallerNotBurner = 101,

        CallerNotMinterNorBurner = 102,
        CannotTransact = 200,
        CannotTransfer = 201,
        TokenIsFrozen = 202,
        NotAuthorized = 203,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [MinterAdded, MinterRemoved, BurnerAdded, BurnerRemoved])]
pub struct NFT {
    access_control: SubModule<AccessControl>,
    ownable: SubModule<Ownable>,
    cep95: SubModule<Cep95>,
    tokens_count: Var<U256>,
    whitelist: Mapping<Address, bool>,
    frozen_tokens: Mapping<U256, bool>,
}

#[odra::module]
impl NFT {
    // =========================================================================
    // Initialization
    // =========================================================================

    pub fn init(
        &mut self,
        owner: Address,
        symbol: String,
        name: String,
        minters: Vec<Address>,
        burners: Vec<Address>,
    ) {
        // TODO: Evaluate with we need the ownable module
        // self.ownable.init(owner);

        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &owner);
        self.cep95.init(symbol, name);

        let minter_role = Self::hash_role(ROLE_MINTER);
        let burner_role = Self::hash_role(ROLE_BURNER);

        // TODO: Check if we can refactor this logic into the add_minter internal function
        // TODO: Check if a foor loop would be better than an iterator
        minters.iter().for_each(|minter| {
            self.access_control
                .unchecked_grant_role(&minter_role, minter);
            self.env().emit_event(MinterAdded { minter: *minter });
        });
        burners.iter().for_each(|burner| {
            self.access_control
                .unchecked_grant_role(&burner_role, burner);
            self.env().emit_event(BurnerAdded { burner: *burner });
        });
    }

    /// Allows to add a new minter by the owner
    pub fn add_minter(&mut self, minter: &Address) {
        self.assert_owner();
        self.add_minter_internal(minter);
    }

    /// Allows to remove a minter by the owner
    pub fn remove_minter(&mut self, minter: &Address) {
        self.assert_owner();
        self.minters.set(&minter, false);

        self.env().emit_event(MinterRemoved { minter: *minter });
    }

    /// Allows to add a new burner by the owner
    pub fn add_burner(&mut self, burner: &Address) {
        self.assert_owner();
        self.add_burner_internal(burner);
    }

    /// Allows to remove a burner by the owner
    pub fn remove_burner(&mut self, burner: &Address) {
        self.assert_owner();
        self.burners.set(&burner, false);

        self.env().emit_event(BurnerRemoved { burner: *burner });
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
        self.cep95.set_metadata(token_id, metadata);
    }

    /// Allows to update metadata for a token by the minter or the burner
    pub fn update_metadata(&mut self, token_id: U256, metadata: Vec<(String, String)>) {
        self.assert_minter_or_burner();
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
    pub fn hash_role(role_name: &str) -> Role {
        let mut hasher = Keccak256::default();

        hasher.update(role_name.as_bytes());
        hasher.finalize().into()
    }

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

    fn add_minter_internal(&mut self, minter: &Address) {
        self.minters.set(&minter, true);

        self.env().emit_event(MinterAdded { minter: *minter });
    }

    fn add_burner_internal(&mut self, burner: &Address) {
        self.burners.set(&burner, true);

        self.env().emit_event(BurnerAdded { burner: *burner });
    }
}
