use odra::{
    casper_types::{account::AccountHash, U256},
    host::{HostEnv, InstallConfig},
    prelude::{Address, Addressable},
};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use leasefi_contracts::{
    escrow::{Escrow, EscrowInitArgs},
    ico::{types::Currency, ICOInitArgs, ICO},
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
            None,
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
            None,
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
            None,
            RolesInitArgs { admin: new_owner },
            InstallConfig::upgradable::<Roles>(),
            container,
            310_000_000_000,
        )?;
        let mut treasury = Treasury::load_or_deploy_with_cfg(
            &env,
            None,
            TreasuryInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Treasury>(),
            container,
            400_000_000_000,
        )?;
        let mut escrow = Escrow::load_or_deploy_with_cfg(
            &env,
            None,
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
            None,
            LeaseInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Lease>(),
            container,
            400_000_000_000,
        )?;
        let mut ico = ICO::load_or_deploy_with_cfg(
            &env,
            None,
            ICOInitArgs {
                owner: env.caller(),
                styks_price_feed: Address::new(
                    "814fedbd4ae53b82ab19b1ff6698ce412445c3266271fcb639986d37dc0ae121", // mainnet, 2879d6e927289197aab0101cc033f532fe22e4ab4686e44b5743cb1333031acc - testnet
                )
                .unwrap(),
            },
            InstallConfig::upgradable::<ICO>(),
            container,
            400_000_000_000,
        )?;

        // Setup Treasury
        treasury.set_tailor_coin(tailor_coin.address());
        // treasury.set_staking(staking.address());

        // Setup Lease
        lease.set_roles(roles.address());
        lease.set_escrow(escrow.address());

        // Setup Escrow
        escrow.set_lease(lease.address());
        escrow.set_treasury(treasury.address());

        // Setup ICO
        ico.set_tailor_coin(tailor_coin.address());
        ico.set_treasury(treasury.address());
        ico.add_currency(Currency::CSPR, None);
        ico.add_currency(
            Currency::USDC,
            Some(
                Address::new(
                    "48bd364532febf044cca8d2d716336b93d27458ce0aa48ad292ca28304fa8649", // mainnet
                )
                .unwrap(),
            ),
        );
        ico.add_currency(
            Currency::USDT,
            Some(
                Address::new(
                    "b53fa728c7074c84f35407f4d0989eb4133d391402b7ce13b7feeb01479a4f01", // mainnet
                )
                .unwrap(),
            ),
        );
        // TODO setup ICO sales

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
