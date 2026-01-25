use odra::{
    casper_types::{account::AccountHash, U256},
    host::{HostEnv, InstallConfig},
    prelude::{Address, Addressable},
};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use leasefi_contracts::{
    escrow::{Escrow, EscrowInitArgs},
    ico::ICO,
    lease::{Lease, LeaseInitArgs},
    nft::{NFTInitArgs, NFT},
    roles::{Roles, RolesInitArgs},
    staking::Staking,
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
        let new_owner = Address::Account(
            AccountHash::from_formatted_str(
                "account-hash-4314047331390718c1aba071219b386d100f5a668633aa93c1cca3dc4b154e24",
            )
            .unwrap(),
        );
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
        let mut nft = NFT::load_or_deploy_with_cfg(
            &env,
            NFTInitArgs {
                owner: env.caller(),
                symbol: String::from("BIG"),
                name: String::from("BIG"),
                minters: vec![],
                burners: vec![],
            },
            InstallConfig::upgradable::<NFT>(),
            container,
            450_000_000_000,
        )?;
        let roles = Roles::load_or_deploy_with_cfg(
            &env,
            RolesInitArgs { admin: new_owner },
            InstallConfig::upgradable::<Roles>(),
            container,
            310_000_000_000,
        )?;
        let mut treasury = Treasury::load_or_deploy_with_cfg(
            &env,
            TreasuryInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Treasury>(),
            container,
            400_000_000_000,
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
        let mut lease = Lease::load_or_deploy_with_cfg(
            &env,
            LeaseInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Lease>(),
            container,
            400_000_000_000,
        )?;

        treasury.set_tailor_coin(tailor_coin.address());
        // treasury.set_staking(staking.address());

        lease.set_roles(roles.address());
        lease.set_escrow(escrow.address());

        escrow.set_lease(lease.address());
        escrow.set_treasury(treasury.address());

        // Transfer ownership
        nft.transfer_ownership(&new_owner);
        treasury.transfer_ownership(&new_owner);
        escrow.transfer_ownership(&new_owner);
        lease.transfer_ownership(&new_owner);

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
        .contract::<Lease>()
        .contract::<Staking>()
        .contract::<ICO>()
        .build()
        .run();
}
