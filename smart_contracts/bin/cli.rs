use odra::{
    casper_types::U256,
    host::{HostEnv, InstallConfig},
};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use leasefi_contracts::{
    roles::{Roles, RolesInitArgs},
    tailor_coin::{TailorCoin, TailorCoinInitArgs},
};

struct LeasefiDeployScript;

impl DeployScript for LeasefiDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        TailorCoin::load_or_deploy_with_cfg(
            &env,
            TailorCoinInitArgs {
                symbol: String::from("BIG"),
                name: String::from("BIG"),
                decimals: 18,
                initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
            },
            InstallConfig::upgradable::<TailorCoin>(),
            container,
            325_000_000_000,
        )?;
        Roles::load_or_deploy_with_cfg(
            &env,
            RolesInitArgs {
                admin: env.caller(),
            },
            InstallConfig::upgradable::<Roles>(),
            container,
            310_000_000_000,
        )?;

        Ok(())
    }
}

pub fn main() {
    OdraCli::new()
        .about("CLI tool for deploying of leasefi smart contracts")
        .deploy(LeasefiDeployScript)
        .contract::<TailorCoin>()
        .contract::<Roles>()
        .build()
        .run();
}
