use odra::{
    casper_types::U256,
    host::{HostEnv, InstallConfig},
    prelude::Addressable,
};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use leasefi_contracts::{
    roles::{Roles, RolesInitArgs},
    tailor_coin::{TailorCoin, TailorCoinInitArgs},
    treasury::{Treasury, TreasuryInitArgs},
};

struct LeasefiDeployScript;

impl DeployScript for LeasefiDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        Roles::load_or_deploy_with_cfg(
            &env,
            RolesInitArgs {
                admin: env.caller(),
            },
            InstallConfig::upgradable::<Roles>(),
            container,
            310_000_000_000,
        )?;

        let tailor_coin = TailorCoin::load_or_deploy_with_cfg(
            &env,
            TailorCoinInitArgs {
                symbol: String::from("BIG"),
                name: String::from("BIG"),
                decimals: 18,
                initial_supply: U256::from_dec_str("5000000000000000000000000000000").unwrap(),
            },
            InstallConfig::upgradable::<TailorCoin>(),
            container,
            350_000_000_000,
        )?;
        let mut treasury = Treasury::load_or_deploy_with_cfg(
            &env,
            TreasuryInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Treasury>(),
            container,
            100_000_000_000,
        )?;

        treasury.set_tailor_coin(tailor_coin.address());
        // treasury.set_staking(staking.address());

        Ok(())
    }
}

pub fn main() {
    OdraCli::new()
        .about("CLI tool for deploying of leasefi smart contracts")
        .deploy(LeasefiDeployScript)
        .contract::<TailorCoin>()
        .contract::<Roles>()
        .contract::<Treasury>()
        .build()
        .run();
}
