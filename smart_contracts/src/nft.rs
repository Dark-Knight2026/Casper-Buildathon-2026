use odra::{
    casper_types::{bytesrepr::Bytes, U256},
    prelude::*,
};
use odra_modules::{
    access::{AccessControl, Role, DEFAULT_ADMIN_ROLE},
    cep95::{CEP95Interface, Cep95},
};

use crate::common;

use crate::nft::{
    errors::Error,
    events::{
        BurnerAdded, BurnerRemoved, ForceTransfererAdded, ForceTransfererRemoved, ForcedTransfer,
        FreezerAdded, FreezerRemoved, Frozen, MinterAdded, MinterRemoved, WhitelistManagerAdded,
        WhitelistManagerRemoved, Whitelisted,
    },
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
    pub struct WhitelistManagerAdded {
        pub address: Address,
    }

    #[odra::event]
    pub struct WhitelistManagerRemoved {
        pub address: Address,
    }

    #[odra::event]
    pub struct FreezerAdded {
        pub address: Address,
    }

    #[odra::event]
    pub struct FreezerRemoved {
        pub address: Address,
    }

    #[odra::event]
    pub struct ForceTransfererAdded {
        pub address: Address,
    }

    #[odra::event]
    pub struct ForceTransfererRemoved {
        pub address: Address,
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
        CallerNotMinter = 100,
        CallerNotBurner = 101,
        CallerNotMinterNorBurner = 102,
        CannotTransact = 103,
        CannotTransfer = 104,
        TokenIsFrozen = 105,
        NotAuthorized = 106,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
  BurnerAdded,
  BurnerRemoved,
  ForcedTransfer,
  ForceTransfererAdded,
  ForceTransfererRemoved,
  FreezerAdded,
  FreezerRemoved,
  Frozen,
  MinterAdded,
  MinterRemoved,
  WhitelistManagerAdded,
  WhitelistManagerRemoved,
  Whitelisted,
])]
pub struct NFT {
    access_control: SubModule<AccessControl>,
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
        whitelist_managers: Vec<Address>,
        freezers: Vec<Address>,
        force_transferers: Vec<Address>,
    ) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &owner);
        self.cep95.init(symbol, name);

        let minter_role = common::hash_role(ROLE_MINTER);
        let burner_role = common::hash_role(ROLE_BURNER);
        let whitelist_manager_role = common::hash_role(ROLE_WHITELIST_MANAGER);
        let freezer_role = common::hash_role(ROLE_FREEZER);
        let force_transferer_role = common::hash_role(ROLE_FORCE_TRANSFERER);

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
        whitelist_managers.iter().for_each(|address| {
            self.access_control
                .unchecked_grant_role(&whitelist_manager_role, address);
            self.env()
                .emit_event(WhitelistManagerAdded { address: *address });
        });
        freezers.iter().for_each(|address| {
            self.access_control
                .unchecked_grant_role(&freezer_role, address);
            self.env().emit_event(FreezerAdded { address: *address });
        });
        force_transferers.iter().for_each(|address| {
            self.access_control
                .unchecked_grant_role(&force_transferer_role, address);
            self.env()
                .emit_event(ForceTransfererAdded { address: *address });
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
        if self.is_frozen(token_id) {
            return false;
        }
        self.can_transact(from) && self.can_transact(to)
    }

    /// Returns true if token is frozen
    /// frozen status is tracked per token ID (each NFT has exactly one owner)
    pub fn is_frozen(&self, token_id: &U256) -> bool {
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
    pub fn set_frozen_tokens(&mut self, token_id: &U256, frozen_status: bool) {
        self.assert_role(ROLE_FREEZER);
        let account = self.cep95.owner_of(*token_id).unwrap_or_revert(&self.env());

        self.frozen_tokens.set(token_id, frozen_status);

        self.env().emit_event(Frozen {
            account,
            token_id: *token_id,
            frozen_status,
        });
    }

    /// Takes `token_id` from one address and transfers it to another.
    /// Restricted to FORCE_TRANSFERER role. Still requires receiver to be whitelisted.
    /// Forced transfer for regulatory enforcement or recovery scenarios.
    /// @dev `cep95.transfer_from()` checks that the caller is the token owner or an approved
    /// operator. An admin performing a forced transfer isn't either. `raw_transfer(to, token_id)`
    /// bypasses all CEP-95 authorization, which is exactly what forced_transfer needs.
    #[odra(non_reentrant)]
    pub fn forced_transfer(&mut self, from: Address, to: Address, token_id: U256) {
        self.assert_role(ROLE_FORCE_TRANSFERER);

        if self.cep95.owner_of(token_id) != Some(from) {
            self.env().revert(Error::CannotTransfer);
        }
        if !self.can_transact(&to) {
            self.env().revert(Error::CannotTransact);
        }

        // Unfreeze if frozen; new owner gets an unfrozen token
        if self.is_frozen(&token_id) {
            self.frozen_tokens.set(&token_id, false);
        }

        self.cep95.clear_approval(&token_id);
        self.cep95.raw_transfer(to, token_id);

        self.env().emit_event(Frozen {
            account: to,
            token_id,
            frozen_status: false,
        });
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
            status: false,
        })
    }

    // =========================================================================
    // Role Management
    // =========================================================================

    /// Allows to add a new minter by the admin
    pub fn add_minter(&mut self, minter: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_MINTER);
        self.access_control.unchecked_grant_role(&role, minter);

        self.env().emit_event(MinterAdded { minter: *minter });
    }

    /// Allows to remove a minter by the admin
    pub fn remove_minter(&mut self, minter: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_MINTER);
        self.access_control.revoke_role(&role, minter);

        self.env().emit_event(MinterRemoved { minter: *minter });
    }

    /// Allows to add a new burner by the admin
    pub fn add_burner(&mut self, burner: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_BURNER);
        self.access_control.unchecked_grant_role(&role, burner);
        self.env().emit_event(BurnerAdded { burner: *burner });
    }

    /// Allows to remove a burner by the admin
    pub fn remove_burner(&mut self, burner: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_BURNER);
        self.access_control.revoke_role(&role, burner);
        self.env().emit_event(BurnerRemoved { burner: *burner });
    }

    /// Allows to add a new whitelist manager by the admin
    pub fn add_whitelist_manager(&mut self, address: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_WHITELIST_MANAGER);
        self.access_control.unchecked_grant_role(&role, address);
        self.env()
            .emit_event(WhitelistManagerAdded { address: *address });
    }

    /// Allows to remove a whitelist manager by the admin
    pub fn remove_whitelist_manager(&mut self, address: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_WHITELIST_MANAGER);
        self.access_control.revoke_role(&role, address);
        self.env()
            .emit_event(WhitelistManagerRemoved { address: *address });
    }

    /// Allows to add a new freezer by the admin
    pub fn add_freezer(&mut self, address: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_FREEZER);
        self.access_control.unchecked_grant_role(&role, address);
        self.env().emit_event(FreezerAdded { address: *address });
    }

    /// Allows to remove a freezer by the admin
    pub fn remove_freezer(&mut self, address: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_FREEZER);
        self.access_control.revoke_role(&role, address);
        self.env().emit_event(FreezerRemoved { address: *address });
    }

    /// Allows to add a new force transferer by the admin
    pub fn add_force_transferer(&mut self, address: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_FORCE_TRANSFERER);
        self.access_control.unchecked_grant_role(&role, address);
        self.env()
            .emit_event(ForceTransfererAdded { address: *address });
    }

    /// Allows to remove a force transferer by the admin
    pub fn remove_force_transferer(&mut self, address: &Address) {
        self.assert_admin();
        let role = common::hash_role(ROLE_FORCE_TRANSFERER);
        self.access_control.revoke_role(&role, address);
        self.env()
            .emit_event(ForceTransfererRemoved { address: *address });
    }

    /// Returns `true` if `address` has the `minter` role, `false` otherwise
    pub fn is_minter(&self, address: &Address) -> bool {
        let role = common::hash_role(ROLE_MINTER);
        self.access_control.has_role(&role, address)
    }

    /// Returns `true` if `address` has the `burner` role, `false` otherwise
    pub fn is_burner(&self, address: &Address) -> bool {
        let role = common::hash_role(ROLE_BURNER);
        self.access_control.has_role(&role, address)
    }

    // =========================================================================
    // Token Operations (compliance aware)
    // =========================================================================

    /// Mint a new token and set its metadata. Requires the MINTER role.
    /// @dev ERC-7943: recipient must be whitelisted.
    #[odra(non_reentrant)]
    pub fn mint(&mut self, to: Address, metadata: Vec<(String, String)>) -> U256 {
        self.assert_minter();

        if !self.can_transact(&to) {
            self.env().revert(Error::CannotTransact);
        }

        let token_id = self.tokens_count.get_or_default();

        self.cep95.raw_mint(to, token_id, metadata);
        self.tokens_count.set(token_id + 1);

        token_id
    }

    /// Burn a token. Requires the BURNER role.
    /// @dev Token needs to be unfrozen before burning
    #[odra(non_reentrant)]
    pub fn burn(&mut self, token_id: U256) {
        self.assert_burner();

        if self.is_frozen(&token_id) {
            self.env().revert(Error::TokenIsFrozen);
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
    #[odra(non_reentrant)]
    pub fn transfer_from(&mut self, from: Address, to: Address, token_id: U256) {
        if self.is_frozen(&token_id) {
            self.env().revert(Error::TokenIsFrozen);
        }
        if !self.can_transact(&from) || !self.can_transact(&to) {
            self.env().revert(Error::CannotTransact);
        }

        self.cep95.transfer_from(from, to, token_id);
    }

    /// Pulled out of `delegate!` so we can enforce ERC-7943 check
    /// @dev CEP-95 still does its own checks (caller must be owner or approved operator)
    #[odra(non_reentrant)]
    pub fn safe_transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
        data: Option<Bytes>,
    ) {
        if self.is_frozen(&token_id) {
            self.env().revert(Error::TokenIsFrozen);
        }
        if !self.can_transact(&from) || !self.can_transact(&to) {
            self.env().revert(Error::CannotTransact);
        }

        self.cep95.safe_transfer_from(from, to, token_id, data);
    }

    // =========================================================================
    // Role Hash Getters
    // =========================================================================

    pub fn minter_role(&self) -> Role {
        common::hash_role(ROLE_MINTER)
    }

    pub fn burner_role(&self) -> Role {
        common::hash_role(ROLE_BURNER)
    }

    pub fn whitelist_manager_role(&self) -> Role {
        common::hash_role(ROLE_WHITELIST_MANAGER)
    }

    pub fn freezer_role(&self) -> Role {
        common::hash_role(ROLE_FREEZER)
    }

    pub fn force_transferer_role(&self) -> Role {
        common::hash_role(ROLE_FORCE_TRANSFERER)
    }

    // =========================================================================
    // Access Control & CEP-95 Delegation
    // =========================================================================

    delegate! {
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
    #[inline]
    fn assert_role(&self, role_name: &str) {
        let role = common::hash_role(role_name);
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
        let caller = self.env().caller();
        if !self.is_minter(&caller) && !self.is_burner(&caller) {
            self.env().revert(Error::CallerNotMinterNorBurner);
        }
    }
}
