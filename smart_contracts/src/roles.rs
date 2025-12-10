use odra::prelude::*;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use sha3::{Digest, Keccak256};

pub const ROLE_LANDLORD: &str = "landlord";
pub const ROLE_LANDLORD_ADMIN: &str = "landlord_admin";

pub const ROLE_AGENT: &str = "agent";
pub const ROLE_AGENT_ADMIN: &str = "agent_admin";

pub const ROLE_MANAGER: &str = "manager";
pub const ROLE_MANAGER_ADMIN: &str = "manager_admin";

#[odra::module]
pub struct Roles {
    access_control: SubModule<AccessControl>,
}

#[odra::module]
impl Roles {
    pub fn init(&mut self) {
        let admin = self.env().caller();

        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &admin);

        self.set_landlord_admin_role();
        self.set_agent_admin_role();
        self.set_manager_admin_role();
    }

    pub fn get_landlord_role_info(&self) -> Role {
        Self::hash_role(ROLE_LANDLORD)
    }

    pub fn get_agent_role(&self) -> Role {
        Self::hash_role(ROLE_AGENT)
    }

    pub fn get_manager_role(&self) -> Role {
        Self::hash_role(ROLE_MANAGER)
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

impl Roles {
    fn hash_role(role_name: &str) -> Role {
        let mut hasher = Keccak256::default();

        hasher.update(role_name.as_bytes());
        hasher.finalize().into()
    }

    fn set_landlord_admin_role(&mut self) {
        self.access_control.set_admin_role(
            &Self::hash_role(ROLE_LANDLORD),
            &Self::hash_role(ROLE_LANDLORD_ADMIN),
        );
    }

    fn set_agent_admin_role(&mut self) {
        self.access_control.set_admin_role(
            &Self::hash_role(ROLE_LANDLORD),
            &Self::hash_role(ROLE_AGENT_ADMIN),
        );
    }

    fn set_manager_admin_role(&mut self) {
        self.access_control.set_admin_role(
            &Self::hash_role(ROLE_LANDLORD),
            &Self::hash_role(ROLE_MANAGER_ADMIN),
        );
    }
}

#[cfg(test)]
mod tests {
    // use odra::host::{Deployer, HostEnv};

    // use super::*;

    #[test]
    fn test_init_should_initialize_contract_properly() {}
}
