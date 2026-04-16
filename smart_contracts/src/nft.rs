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
    events::{
        BurnerAdded, BurnerRemoved, ForcedTransfer, Frozen, MinterAdded, MinterRemoved, Whitelisted,
    },
};

// QUESTION: Should we build out the ERC-7943 interface and put it in the interfaces directory? Is that necessary for Odra like we might do in Solidity? In Solidity we would build out the interface and then import it and then have the contract inherit it. But in Odra, i think we might only need an interface to actually interact with an existing contract. I don't think we can or should or need to inherit the interface like we do in Solidity. I don't think Odra even has inheritance.

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

#[odra::module(errors = Error, events = [
  BurnerAdded,
  BurnerRemoved,
  ForcedTransfer,
  MinterAdded,
  MinterRemoved,
])]
pub struct NFT {
    access_control: SubModule<AccessControl>,
    ownable: SubModule<Ownable>,
    cep95: SubModule<Cep95>,
    tokens_count: Var<U256>,
    whitelist: Mapping<Address, bool>,
    // TODO: I'm not completely sure if we can do it this way or if we need like a nested mapping like  mapping(address account => mapping(uint256 tokenId => bool frozen)). This nested mapping is from the reference implementation (https://github.com/xaler5/uRWA/blob/master/contracts/uRWA721.sol) but i don't understand why they did it like that. Why can't you just freeze a token regardless of the account? If its frozen, its frozen. What difference does it make if the mapping references the account if each NFT only has exactly one owner? Need to perfectly evaluate if each NFT really does have exactly one owner.
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

    // =========================================================================
    // ERC-7943 View Functions
    // =========================================================================

    /// Returns true if the account is whitelisted and allowed to transact.
    /// @dev This is often used for allowlist/KYC/KYB/AML checks.
    pub fn can_transact(&self, account: &Address) -> bool {
        self.whitelist.get_or_default(account)
    }

    /// Returns true if transfer of token from `from` to `to is allowed.
    /// Checks: `from` owns the token, token is not frozen, both parties are whitelisted
    pub fn can_transfer(&self, from: &Address, to: &Address, token_id: &U256) -> bool {
        if self.cep95.owner_of(*token_id) != Some(*from) {
            return false;
        }
        if self.frozen_tokens.get_or_default(token_id) {
            return false;
        }
        self.can_transact(from) && self.can_transact(to)
    }

    /// Returns true if the given token is frozen
    /// The `account` parameter is accepted for interface compliance;
    /// frozen status is tracked per token ID (each NFT has exactly one owner)
    /// TODO: Evaluate if we can delete the account argument from here since we are not completely beholden by the interface
    pub fn get_frozen_tokens(&self, account: &Address, token_id: &U256) -> bool {
        let _ = account;
        self.frozen_tokens.get_or_default(token_id)
    }

    /// Returns true if the address is on the whitelist
    pub fn is_whitelisted(&self, account: &Address) -> bool {
        self.whitelist.get_or_default(account)
    }

    // =========================================================================
    // ERC-7943 Admin Functions
    // =========================================================================

    /// Freeze or unfreeze a specific token. Restricted to FREEZER role.
    pub fn set_frozen_tokens(&mut self, account: &Address, token_id: &U256, frozen_status: bool) {
        self.assert_role(ROLE_FREEZER);
        self.frozen_tokens.set(token_id, frozen_status);

        self.env().emit_event(Frozen {
            account: *account,
            token_id: *token_id,
            frozen_status,
        });
    }

    /// Takes `token_id` from one address and transfers it to another.
    /// Restricted to FORCE_TRANSFERER role.
    /// Bypass freeze and approval checks but still requires receiver to be whitelisted.
    /// @dev Forced transfer for regulatory enforcement or recovery scenarios.
    pub fn forced_transfer(&mut self, from: Address, to: Address, token_id: U256) {
        self.assert_role(ROLE_FORCE_TRANSFERER);

        if self.cep95.owner_of(token_id) != Some(from) {
            self.env().revert(Error::CannotTransact);
        }

        if self.can_transact(&to) {
            self.env().revert(Error::CannotTransact);
        }

        // Unfreeze if frozen; new owner gets an unfrozen token
        if self.frozen_tokens.get_or_default(&token_id) {
            self.frozen_tokens.set(&token_id, false);
            self.env().emit_event(Frozen {
                account: from,
                token_id,
                frozen_status: false,
            });
        }

        self.cep95.clear_approval(&token_id);
        self.cep95.raw_transfer(to, token_id);

        self.env().emit_event(ForcedTransfer { from, to, token_id });
    }

    // =========================================================================
    // Whitelist Management
    // =========================================================================

    pub fn add_to_whitelist(&mut self, account: &Address) {
        self.assert_role(ROLE_WHITELIST_MANAGER);
        self.whitelist.set(account, true);

        self.env().emit_event(Whitelisted {
            account: *account,
            status: true,
        })
    }

    pub fn remove_from_whitelist(&mut self, account: &Address) {
        self.assert_role(ROLE_WHITELIST_MANAGER);
        self.whitelist.set(account, false);

        self.env().emit_event(Whitelisted {
            account: *account,
            status: true,
        })
    }

    // =========================================================================
    // Minter / Burner Management (backward compatibility API)
    // =========================================================================

    /// Allows to add a new minter by the admin
    pub fn add_minter(&mut self, minter: &Address) {
        self.assert_admin();
        let role = Self::hash_role(ROLE_MINTER);
        self.access_control.unchecked_grant_role(&role, minter);

        self.env().emit_event(MinterAdded { minter: *minter });
    }

    /// Allows to remove a minter by the admin
    pub fn remove_minter(&mut self, minter: &Address) {
        self.assert_admin();
        let role = Self::hash_role(ROLE_MINTER);
        self.access_control.revoke_role(&role, minter);

        self.env().emit_event(MinterRemoved { minter: *minter });
    }

    /// Allows to add a new burner by the admin
    pub fn add_burner(&mut self, burner: &Address) {
        self.assert_admin();
        let role = Self::hash_role(ROLE_BURNER);
        self.access_control.unchecked_grant_role(&role, burner);
        self.env().emit_event(BurnerAdded { burner: *burner });
    }

    /// Allows to remove a burner by the admin
    pub fn remove_burner(&mut self, burner: &Address) {
        self.assert_admin();
        let role = Self::hash_role(ROLE_BURNER);
        self.access_control.revoke_role(&role, burner);
        self.env().emit_event(BurnerRemoved { burner: *burner });
    }

    /// Returns `true` if `address` has the `minter` role, `false` otherwise
    pub fn is_minter(&self, address: &Address) -> bool {
        let role = Self::hash_role(ROLE_MINTER);
        self.access_control.has_role(&role, address)
    }

    /// Returns `true` if `address` has the `burner` role, `false` otherwise
    pub fn is_burner(&self, address: &Address) -> bool {
        let role = Self::hash_role(ROLE_BURNER);
        self.access_control.has_role(&role, address)
    }

    // =========================================================================
    // Token Operations (compliance aware)
    // =========================================================================

    /// Mint a new token and set its metadata. Requires the MINTER role.
    /// @dev ERC-7943: recipient must be whitelisted.
    pub fn mint(&mut self, to: Address, metadata: Vec<(String, String)>) {
        self.assert_minter();

        if !self.can_transact(&to) {
            self.env().revert(Error::CannotTransact);
        }

        let token_id = self.tokens_count.get_or_default();

        self.cep95.raw_mint(to, token_id, metadata);
        self.tokens_count.set(token_id + 1);
    }

    /// Burn a token. Requires the BURNER role.
    /// @dev Unfreezes the token if frozen before burning.
    pub fn burn(&mut self, token_id: U256) {
        self.assert_burner();

        if self.frozen_tokens.get_or_default(&token_id) {
            self.frozen_tokens.set(&token_id, false);
            if let Some(owner) = self.cep95.owner_of(token_id) {
                self.env().emit_event(Frozen {
                    account: owner,
                    token_id,
                    frozen_status: false,
                });
            }
        }

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

    /// Returns a number of minted tokens
    pub fn get_tokens_count(&self) -> U256 {
        self.tokens_count.get_or_default()
    }

    // =========================================================================
    // Transfers (compliance-wrapped)
    // =========================================================================

    /// Pulled out of `delegate!` so we can enforce ERC-7943 check
    /// @dev CEP-95 still does its own checks (caller must be owner or approved operator)
    pub fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) {
        if !self.can_transfer(&from, &to, &token_id) {
            self.env().revert(Error::CannotTransfer);
        }
        self.cep95.transfer_from(from, to, token_id);
    }

    /// Pulled out of `delegate!` so we can enforce ERC-7943 check
    /// @dev CEP-95 still does its own checks (caller must be owner or approved operator)
    pub fn safe_transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
        data: Option<Bytes>,
    ) {
        if !self.can_transfer(&from, &to, &token_id) {
            self.env().revert(Error::CannotTransfer);
        }
        self.cep95.safe_transfer_from(from, to, token_id, data);
    }

    // =========================================================================
    // Role Hash Getters
    // =========================================================================

    pub fn minter_role(&self) -> Role {
        Self::hash_role(ROLE_MINTER)
    }

    pub fn burner_role(&self) -> Role {
        Self::hash_role(ROLE_BURNER)
    }

    pub fn whitelist_manager_role(&self) -> Role {
        Self::hash_role(ROLE_WHITELIST_MANAGER)
    }

    pub fn freezer_role(&self) -> Role {
        Self::hash_role(ROLE_FREEZER)
    }

    pub fn force_transferer_role(&self) -> Role {
        Self::hash_role(ROLE_FORCE_TRANSFERER)
    }

    // =========================================================================
    // Access Control & CEP-95 Delegation
    // =========================================================================

    delegate! {
      // Question: Do we need the ownable module anymore now that we are using the access control module?
        // to self.ownable {
        //     fn transfer_ownership(&mut self, new_owner: &Address);
        //     fn renounce_ownership(&mut self);
        //     fn get_owner(&self) -> Address;
        // }

        to self.access_control {
          fn has_role(&self, role: &Role, address: &Address) -> bool;
          fn get_role_admin(&self, role: &Role) -> Role;
          fn grant_role(&mut self, role: &Role, address: &Address);
          fn revoke_role(&mut self, role: &Role, address: &Address);
          fn renounce_role(&mut self, role: &Role, address: &Address);

        }

        to self.cep95 {
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn balance_of(&self, owner: Address) -> U256;
            fn owner_of(&self, token_id: U256) -> Option<Address>;
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

// =========================================================================
// Internal Helpers
// =========================================================================

impl NFT {
    pub fn hash_role(role_name: &str) -> Role {
        let mut hasher = Keccak256::default();

        hasher.update(role_name.as_bytes());
        hasher.finalize().into()
    }

    #[inline]
    fn assert_role(&self, role_name: &str) {
        let role = Self::hash_role(role_name);
        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::NotAuthorized);
        }
    }

    #[inline]
    fn assert_admin(&self) {
        if !self
            .access_control
            .has_role(&DEFAULT_ADMIN_ROLE, &self.env().caller())
        {
            self.env().revert(Error::NotAuthorized);
        }
    }

    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    // TODO: Can we or should we just use the is_minter function in the minter/burner management?
    #[inline]
    fn assert_minter(&self) {
        let role = Self::hash_role(ROLE_MINTER);
        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::CallerNotMinter);
        }
    }

    #[inline]
    fn assert_burner(&self) {
        let role = Self::hash_role(ROLE_BURNER);
        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::CallerNotBurner);
        }
    }

    #[inline]
    fn assert_minter_or_burner(&self) {
        let caller = self.env().caller();
        let minter_role = Self::hash_role(ROLE_MINTER);
        let burner_role = Self::hash_role(ROLE_BURNER);
        if !self.access_control.has_role(&minter_role, &caller)
            && !self.access_control.has_role(&burner_role, &caller)
        {
            self.env().revert(Error::CallerNotMinterNorBurner);
        }
    }
}
