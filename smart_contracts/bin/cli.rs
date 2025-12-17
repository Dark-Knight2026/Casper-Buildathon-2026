use odra::{
    casper_types::U256,
    host::{HostEnv, InstallConfig},
    prelude::Addressable,
};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use leasefi_contracts::{
    escrow::{Escrow, EscrowInitArgs},
    nft::{NFTInitArgs, NFT},
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
        NFT::load_or_deploy_with_cfg(
            &env,
            NFTInitArgs {
                owner: env.caller(),
                symbol: String::from("NFT"),
                name: String::from("NFT"),
                minters: vec![],
                burners: vec![],
            },
            InstallConfig::upgradable::<NFT>(),
            container,
            450_000_000_000,
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
        let mut escrow = Escrow::load_or_deploy_with_cfg(
            &env,
            EscrowInitArgs {
                owner: env.caller(),
                min_deadline: 5 * 60,
            },
            InstallConfig::upgradable::<Escrow>(),
            container,
            400_000_000_000,
        )?;

        if treasury.get_tailor_coin_contract_address() != treasury.address() {
            treasury.set_tailor_coin(tailor_coin.address());
        }

        // if treasury.get_staking_contract_address() != staking.address() {
        //     treasury.set_staking(staking.address());
        // }

        // if escrow.get_lease_contract_address() != lease.address() {
        //     escrow.set_lease(lease.address());
        // }

        if escrow.get_treasury_contract_address() != treasury.address() {
            escrow.set_treasury(treasury.address());
        }

        Ok(())
    }
}

pub fn main() {
    OdraCli::new()
        .about("CLI tool for deploying of leasefi smart contracts")
        .deploy(LeasefiDeployScript)
        .contract::<TailorCoin>()
        .contract::<NFT>()
        .contract::<Roles>()
        .contract::<Treasury>()
        .contract::<Escrow>()
        .build()
        .run();
}
