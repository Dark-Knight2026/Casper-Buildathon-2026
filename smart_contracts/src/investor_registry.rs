use odra::prelude::*;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::common;
use crate::investor_registry::{
    errors::Error,
    events::{InvestorFrozen, InvestorRecordSet},
    types::InvestorRecord,
};

// =============================================================================
// Roles
// =============================================================================

pub const ROLE_VERIFICATION_MANAGER: &str = "VERIFICATION_MANAGER";
pub const ROLE_FREEZER: &str = "FREEZER";

// =============================================================================
// Types
// =============================================================================

pub mod types {
    use odra::odra_type;

    #[odra_type]
    pub struct InvestorRecord {
        pub verified: bool,
        pub frozen: bool,
        pub verified_until: u64,
        pub jurisdiction: u64,
        pub identity_hash: [u8; 32],
    }
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{event, prelude::*};

    #[event]
    pub struct InvestorRecordSet {
        pub account: Address,
        pub verified: bool,
        pub verified_until: u64,
        pub jurisdiction: u64,
    }

    #[event]
    pub struct InvestorFrozen {
        pub account: Address,
        pub frozen: bool,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        NotAuthorized = 800,
        MissingIdentityHash = 801,
        AccountNotRegistered = 802,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [InvestorRecordSet, InvestorFrozen])]
pub struct InvestorRegistry {
    access_control: SubModule<AccessControl>,
    records: Mapping<Address, InvestorRecord>,
}

#[odra::module]
impl InvestorRegistry {
    // =============================================================================
    // Initialization
    // =============================================================================

    pub fn init(&mut self, owner: Address) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &owner);
    }

    // =============================================================================
    // Admin Configuration
    // =============================================================================

    /// Stores or replaces the on-chain verification record for an investor wallet.
    /// Restricted to `VERIFICATION_MANAGER`
    /// @dev `identity_hash` should be an opaque off-chain identifier used only for compliance linkage
    pub fn set_investor_record(&mut self, account: Address, record: InvestorRecord) {
        self.assert_role(ROLE_VERIFICATION_MANAGER);

        if record.verified && record.identity_hash == [0u8; 32] {
            self.env().revert(Error::MissingIdentityHash);
        }

        let mut record = record;
        if let Some(existing) = self.records.get(&account) {
            record.frozen = existing.frozen;
        }

        let verified = record.verified;
        let verified_until = record.verified_until;
        let jurisdiction = record.jurisdiction;

        self.records.set(&account, record);

        self.env().emit_event(InvestorRecordSet {
            account,
            verified,
            verified_until,
            jurisdiction,
        });
    }

    /// Freezes or unfreezes an investor wallet.
    /// Restricted to `FREEZER`.
    /// @dev The account must be registered first via `set_investor_record`.
    ///      A frozen wallet remains registered, but `is_verified()` returns false while the wallet is frozen.
    pub fn set_frozen(&mut self, account: Address, frozen: bool) {
        self.assert_role(ROLE_FREEZER);

        let mut record = self.records.get(&account).unwrap_or_else(|| {
            self.env().revert(Error::AccountNotRegistered);
        });

        record.frozen = frozen;
        self.records.set(&account, record);

        self.env().emit_event(InvestorFrozen { account, frozen });
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    /// Returns the stored investor record for `account`, if one exists.
    pub fn get_investor_record(&self, account: Address) -> Option<InvestorRecord> {
        self.records.get(&account)
    }

    /// Returns true if `account` has a non-empty identity hash on-chain
    /// @dev This checks registration only. It does not check verification status, expiry, or freeze status
    pub fn is_registered(&self, account: Address) -> bool {
        self.records
            .get(&account)
            .map(|record| record.identity_hash != [0u8; 32])
            .unwrap_or(false)
    }

    /// Returns true if `account` is currently allowed to pass identity checks.
    /// @dev A wallet is verified only when it has an active record, is not frozen, has a non-empty
    ///      identity hash, and its verification is not expired.
    pub fn is_verified(&self, account: Address) -> bool {
        self.records
            .get(&account)
            .map(|record| {
                record.verified
                    && !record.frozen
                    && record.identity_hash != [0u8; 32]
                    && record.verified_until >= self.env().get_block_time()
            })
            .unwrap_or(false)
    }

    /// Returns true if `account` is currently frozen.
    pub fn is_frozen(&self, account: Address) -> bool {
        self.records
            .get(&account)
            .map(|record| record.frozen)
            .unwrap_or(false)
    }

    // =============================================================================
    // Role Getters
    // =============================================================================

    /// Returns the role hash for accounts allowed to update investor records
    pub fn verification_manager_role(&self) -> Role {
        common::hash_role(ROLE_VERIFICATION_MANAGER)
    }

    /// Returns the role hash for accounts to freeze or unfreeze investors
    pub fn freezer_role(&self) -> Role {
        common::hash_role(ROLE_FREEZER)
    }

    // =========================================================================
    // Delegation
    // =========================================================================

    delegate! {
        to self.access_control {
            fn has_role(&self, role: &Role, address: &Address) -> bool;
            fn get_role_admin(&self, role: &Role) -> Role;
            fn grant_role(&mut self, role: &Role, address: &Address);
            fn revoke_role(&mut self, role: &Role, address: &Address);
            fn renounce_role(&mut self, role: &Role, address: &Address);
        }
    }
}

impl InvestorRegistry {
    fn assert_role(&self, role_name: &str) {
        let role = common::hash_role(role_name);

        if !self.access_control.has_role(&role, &self.env().caller()) {
            self.env().revert(Error::NotAuthorized);
        }
    }
}
