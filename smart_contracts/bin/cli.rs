use odra::{casper_types::U256, host::{HostEnv, InstallConfig}};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use leasefi_contracts::tailor_coin::{TailorCoin, TailorCoinInitArgs};

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
                name: String::from("Tailor Coin"),
                decimals: 18,
                initial_supply: U256::from(5_000_000_000e18 as u64),
            },
            InstallConfig::upgradable::<TailorCoin>(),
            container,
            325_000_000_000,
        )?;

        Ok(())
    }
}

pub fn main() {
    OdraCli::new()
        .about("CLI tool for deploying of leasefi smart contracts")
        .deploy(LeasefiDeployScript)
        .contract::<TailorCoin>()
        .build()
        .run();
}
