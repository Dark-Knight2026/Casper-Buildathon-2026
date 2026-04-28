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

}
