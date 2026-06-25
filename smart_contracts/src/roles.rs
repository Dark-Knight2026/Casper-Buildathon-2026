use crate::common;
use odra::prelude::*;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

pub const ROLE_LANDLORD: &str = "LANDLORD";
pub const ROLE_LANDLORD_ADMIN: &str = "LANDLORD_ADMIN";

pub const ROLE_AGENT: &str = "AGENT";
pub const ROLE_AGENT_ADMIN: &str = "AGENT_ADMIN";

pub const ROLE_MANAGER: &str = "MANAGER";
pub const ROLE_MANAGER_ADMIN: &str = "MANAGER_ADMIN";

// =============================================================================
// Contract
// =============================================================================

#[odra::module]
pub struct Roles {
    access_control: SubModule<AccessControl>,
}

#[odra::module]
impl Roles {
    pub fn init(&mut self, admin: Address) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &admin);

        self.set_landlord_admin_role();
        self.set_agent_admin_role();
        self.set_manager_admin_role();
    }

    /// Returns LANDLORD_ROLE role hash
    pub fn get_landlord_role(&self) -> Role {
        common::hash_role(ROLE_LANDLORD)
    }

    /// Returns AGENT_ROLE role hash
    pub fn get_agent_role(&self) -> Role {
        common::hash_role(ROLE_AGENT)
    }

    /// Returns MANAGER_ROLE role hash
    pub fn get_manager_role(&self) -> Role {
        common::hash_role(ROLE_MANAGER)
    }

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

// =============================================================================
// Internal helpers
// =============================================================================

impl Roles {
    fn set_landlord_admin_role(&mut self) {
        self.access_control.set_admin_role(
            &common::hash_role(ROLE_LANDLORD),
            &common::hash_role(ROLE_LANDLORD_ADMIN),
        );
    }

    fn set_agent_admin_role(&mut self) {
        self.access_control.set_admin_role(
            &common::hash_role(ROLE_AGENT),
            &common::hash_role(ROLE_AGENT_ADMIN),
        );
    }

    fn set_manager_admin_role(&mut self) {
        self.access_control.set_admin_role(
            &common::hash_role(ROLE_MANAGER),
            &common::hash_role(ROLE_MANAGER_ADMIN),
        );
    }
}
