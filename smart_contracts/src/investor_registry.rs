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
    use odra::{odra_type, prelude::*};
    #[odra_type]
    pub struct InvestorRecord {
        pub verified: bool,
        pub frozen: bool,
        pub verified_until: u64,
        pub jurisdiction: u64,
        pub identity_hash: String,
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

    pub fn set_investor_record(&mut self, account: Address, record: InvestorRecord) {
        self.assert_role(ROLE_VERIFICATION_MANAGER);

        if record.verified && record.identity_hash.is_empty() {
            self.env().revert(Error::MissingIdentityHash);
        }

        self.records.set(&account, record);

        self.env().emit_event(InvestorRecordSet {
            account,
            verified: record.verified,
            verified_until: record.verified_until,
            jurisdiction: record.jurisdiction,
        });
    }

    pub fn set_frozen(&mut self, account: Address, frozen: bool) {
        self.assert_role(ROLE_FREEZER);

        let mut record = self.records.get(&account).unwrap_or(InvestorRecord {
            verified: false,
            frozen: false,
            verified_until: 0,
            jurisdiction: 0,
            identity_hash: String::new(),
        });

        record.frozen = frozen;
        self.records.set(&account, record);

        self.env().emit_event(InvestorFrozen { account, frozen });
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    pub fn get_investor_record(&self, account: Address) -> Option<InvestorRecord> {
        self.records.get(&account)
    }

    pub fn is_registered(&self, account: Address) -> bool {
        self.records
            .get(&account)
            .map(|record| !record.identity_hash.is_empty())
            .unwrap_or(false)
    }

    pub fn is_verified(&self, account: Address) -> bool {
        self.records
            .get(&account)
            .map(|record| {
                record.verified
                    && !record.frozen
                    && !record.identity_hash.is_empty()
                    && record.verified_until > self.env().get_block_time()
            })
            .unwrap_or(false)
    }

    pub fn is_frozen(&self, account: Address) -> bool {
        self.records
            .get(&account)
            .map(|record| record.frozen)
            .unwrap_or(false)
    }

    // =============================================================================
    // Role Getters
    // =============================================================================

    pub fn verification_manager_role(&self) -> Role {
        common::hash_role(ROLE_VERIFICATION_MANAGER)
    }

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
