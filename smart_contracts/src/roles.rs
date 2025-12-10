use odra::prelude::*;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use sha3::{Digest, Keccak256};

pub const ROLE_LANDLORD: &str = "LANDLORD";
pub const ROLE_LANDLORD_ADMIN: &str = "LANDLORD_ADMIN";

pub const ROLE_AGENT: &str = "AGENT";
pub const ROLE_AGENT_ADMIN: &str = "AGENT_ADMIN";

pub const ROLE_MANAGER: &str = "MANAGER";
pub const ROLE_MANAGER_ADMIN: &str = "MANAGER_ADMIN";

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
        Self::hash_role(ROLE_LANDLORD)
    }

    /// Returns AGENT_ROLE role hash
    pub fn get_agent_role(&self) -> Role {
        Self::hash_role(ROLE_AGENT)
    }

    /// Returns MANAGER_ROLE role hash
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
            &Self::hash_role(ROLE_AGENT),
            &Self::hash_role(ROLE_AGENT_ADMIN),
        );
    }

    fn set_manager_admin_role(&mut self) {
        self.access_control.set_admin_role(
            &Self::hash_role(ROLE_MANAGER),
            &Self::hash_role(ROLE_MANAGER_ADMIN),
        );
    }
}

#[cfg(test)]
mod tests {
    use odra::host::{Deployer, HostEnv};

    use super::*;

    #[test]
    fn test_init_should_initialize_contract_properly() {
        let env = odra_test::env();
        let roles_contract = setup(&env);

        assert!(
            roles_contract.has_role(&DEFAULT_ADMIN_ROLE, &env.caller()),
            "Caller should have DEFAULT_ADMIN_ROLE"
        );
        assert_eq!(
            roles_contract.get_role_admin(&roles_contract.get_landlord_role()),
            Roles::hash_role(ROLE_LANDLORD_ADMIN),
            "ROLE_LANDLORD should have proper ROLE_LANDLORD_ADMIN"
        );
        assert_eq!(
            roles_contract.get_role_admin(&roles_contract.get_agent_role()),
            Roles::hash_role(ROLE_AGENT_ADMIN),
            "ROLE_AGENT should have proper ROLE_AGENT_ADMIN"
        );
        assert_eq!(
            roles_contract.get_role_admin(&roles_contract.get_manager_role()),
            Roles::hash_role(ROLE_MANAGER_ADMIN),
            "ROLE_MANAGER should have proper ROLE_MANAGER_ADMIN"
        );
    }

    #[test]
    fn test_grant_role_should_grant_roles_properly() {
        let env = odra_test::env();
        let mut roles_contract = setup(&env);
        let roles = vec![
            roles_contract.get_landlord_role(),
            roles_contract.get_agent_role(),
            roles_contract.get_manager_role(),
        ];
        let roles_names = vec![ROLE_LANDLORD, ROLE_AGENT, ROLE_MANAGER];
        let roles_admins_names = vec![ROLE_LANDLORD_ADMIN, ROLE_AGENT_ADMIN, ROLE_MANAGER_ADMIN];
        let admin_account = env.get_account(0);
        let roles_admin_account = env.get_account(1);
        let roles_account = env.get_account(2);

        for (index, role) in roles.iter().enumerate() {
            let role_admin = roles_contract.get_role_admin(role);

            env.set_caller(admin_account);
            roles_contract.grant_role(&role_admin, &roles_admin_account);

            assert!(
                roles_contract.has_role(&role_admin, &roles_admin_account),
                "{} should be assigned properly",
                roles_admins_names[index]
            );

            env.set_caller(roles_admin_account);
            roles_contract.grant_role(role, &roles_account);

            assert!(
                roles_contract.has_role(role, &roles_account),
                "{} should be assigned properly",
                roles_names[index]
            );
        }
    }

    #[test]
    fn test_revoke_role_should_revoke_roles_properly() {
        let env = odra_test::env();
        let mut roles_contract = setup(&env);
        let roles = vec![
            roles_contract.get_landlord_role(),
            roles_contract.get_agent_role(),
            roles_contract.get_manager_role(),
        ];
        let roles_names = vec![ROLE_LANDLORD, ROLE_AGENT, ROLE_MANAGER];
        let roles_admins_names = vec![ROLE_LANDLORD_ADMIN, ROLE_AGENT_ADMIN, ROLE_MANAGER_ADMIN];
        let admin_account = env.get_account(0);
        let roles_admin_account = env.get_account(1);
        let roles_account = env.get_account(2);

        for (index, role) in roles.iter().enumerate() {
            let role_admin = roles_contract.get_role_admin(role);

            env.set_caller(admin_account);
            roles_contract.grant_role(&role_admin, &roles_admin_account);
            env.set_caller(roles_admin_account);
            roles_contract.grant_role(role, &roles_account);

            roles_contract.revoke_role(role, &roles_account);
            env.set_caller(admin_account);
            roles_contract.revoke_role(&role_admin, &roles_admin_account);

            assert!(
                !roles_contract.has_role(role, &roles_account),
                "{} should be revoked properly",
                roles_names[index]
            );
            assert!(
                !roles_contract.has_role(&role_admin, &roles_admin_account),
                "{} should be revoked properly",
                roles_admins_names[index]
            );
        }
    }

    #[test]
    fn test_revoke_role_should_renounce_roles_properly() {
        let env = odra_test::env();
        let mut roles_contract = setup(&env);
        let roles = vec![
            roles_contract.get_landlord_role(),
            roles_contract.get_agent_role(),
            roles_contract.get_manager_role(),
        ];
        let roles_names = vec![ROLE_LANDLORD, ROLE_AGENT, ROLE_MANAGER];
        let roles_admins_names = vec![ROLE_LANDLORD_ADMIN, ROLE_AGENT_ADMIN, ROLE_MANAGER_ADMIN];
        let admin_account = env.get_account(0);
        let roles_admin_account = env.get_account(1);
        let roles_account = env.get_account(2);

        for (index, role) in roles.iter().enumerate() {
            let role_admin = roles_contract.get_role_admin(role);

            env.set_caller(admin_account);
            roles_contract.grant_role(&role_admin, &roles_admin_account);
            env.set_caller(roles_admin_account);
            roles_contract.grant_role(role, &roles_account);

            env.set_caller(roles_account);
            roles_contract.renounce_role(role, &roles_account);
            env.set_caller(roles_admin_account);
            roles_contract.renounce_role(&role_admin, &roles_admin_account);

            assert!(
                !roles_contract.has_role(role, &roles_account),
                "{} should be revoked properly",
                roles_names[index]
            );
            assert!(
                !roles_contract.has_role(&role_admin, &roles_admin_account),
                "{} should be revoked properly",
                roles_admins_names[index]
            );
        }
    }

    fn setup(env: &HostEnv) -> RolesHostRef {
        Roles::deploy(
            env,
            RolesInitArgs {
                admin: env.caller(),
            },
        )
    }
}
