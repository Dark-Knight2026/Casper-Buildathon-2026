use odra::{
    casper_types::{account::AccountHash, U256},
    host::{HostEnv, InstallConfig},
    prelude::{Address, Addressable},
};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use odra_modules::access::DEFAULT_ADMIN_ROLE;

use leasefi_contracts::{
    big_coin::{BigCoin, BigCoinInitArgs},
    constants::{PRIVATE_SALE_CLIFF_DURATION, PRIVATE_SALE_VESTING_DURATION},
    escrow::{Escrow, EscrowInitArgs},
    ico::{
        types::{Currency, ICOScheduleCreateParams},
        ICOInitArgs, ICO,
    },
    lease::{Lease, LeaseInitArgs},
    nft::{types::NFTInitParams, NFTInitArgs, NFT},
    property_registry::{PropertyRegistry, PropertyRegistryInitArgs},
    roles::{Roles, RolesInitArgs},
    staking::{Staking, StakingInitArgs},
    treasury::{Treasury, TreasuryInitArgs},
    user_registry::{UserRegistry, UserRegistryInitArgs},
    vesting::{Vesting, VestingInitArgs},
};

struct LeasefiDeployScript;

impl LeasefiDeployScript {
    const ONE_SECOND: u64 = 1_000;
    const ONE_MINUTE: u64 = 60 * Self::ONE_SECOND;
    const ONE_HOUR: u64 = 60 * Self::ONE_MINUTE;
    const ONE_DAY: u64 = 24 * Self::ONE_HOUR;

    fn get_ico_schedule_creation_params(env: &HostEnv) -> ICOScheduleCreateParams {
        ICOScheduleCreateParams {
            start_timestamp: env.block_time() + Self::ONE_MINUTE + Self::ONE_HOUR,
            end_timestamp: env.block_time()
                + Self::ONE_MINUTE
                + Self::ONE_HOUR
                + (20 * Self::ONE_DAY),
            sale_amount: U256::from(500_000_000) * U256::from(10).pow(U256::from(18)),
            price: U256::from(500_000), // 0.5 USD (0.5 * 1 * 10^6)
            cliff_duration: PRIVATE_SALE_CLIFF_DURATION,
            vesting_duration: PRIVATE_SALE_VESTING_DURATION,
        }
    }
}

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
        let mut big_coin = BigCoin::load_or_deploy_with_cfg(
            env,
            None,
            BigCoinInitArgs {
                symbol: String::from("BIG"),
                name: String::from("BIG"),
                decimals: 18,
                initial_supply: U256::from(5_000_000_000_000u128)
                    * U256::from(10).pow(U256::from(18)),
            },
            InstallConfig::upgradable::<BigCoin>(),
            container,
            350_000_000_000,
        )?;

        let nft_params = NFTInitParams {
            owner: env.caller(),
            symbol: String::from("BIG"),
            name: String::from("BIG"),
            minters: vec![],
            burners: vec![],
            whitelist_managers: vec![env.caller()],
            freezers: vec![],
            force_transferers: vec![],
        };

        let mut nft = NFT::load_or_deploy_with_cfg(
            env,
            None,
            NFTInitArgs { params: nft_params },
            InstallConfig::upgradable::<NFT>(),
            container,
            450_000_000_000,
        )?;

        let _roles = Roles::load_or_deploy_with_cfg(
            env,
            None,
            RolesInitArgs { admin: new_owner },
            InstallConfig::upgradable::<Roles>(),
            container,
            310_000_000_000,
        )?;
        let user_registry = UserRegistry::load_or_deploy_with_cfg(
            env,
            None,
            UserRegistryInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<UserRegistry>(),
            container,
            310_000_000_000,
        )?;
        let mut treasury = Treasury::load_or_deploy_with_cfg(
            env,
            None,
            TreasuryInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Treasury>(),
            container,
            400_000_000_000,
        )?;
        let mut escrow = Escrow::load_or_deploy_with_cfg(
            env,
            None,
            EscrowInitArgs {
                owner: env.caller(),
                min_deadline: 5 * 60,
                user_registry: user_registry.address(),
            },
            InstallConfig::upgradable::<Escrow>(),
            container,
            400_000_000_000,
        )?;
        let mut property_registry = PropertyRegistry::load_or_deploy_with_cfg(
            env,
            None,
            PropertyRegistryInitArgs {
                owner: env.caller(),
                user_registry: user_registry.address(),
            },
            InstallConfig::upgradable::<PropertyRegistry>(),
            container,
            400_000_000_000,
        )?;
        let mut lease = Lease::load_or_deploy_with_cfg(
            env,
            None,
            LeaseInitArgs {
                owner: env.caller(),
                escrow: escrow.address(),
                nft: nft.address(),
                property_registry: property_registry.address(),
                user_registry: user_registry.address(),
            },
            InstallConfig::upgradable::<Lease>(),
            container,
            400_000_000_000,
        )?;
        let mut vesting = Vesting::load_or_deploy_with_cfg(
            env,
            None,
            VestingInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Vesting>(),
            container,
            400_000_000_000,
        )?;
        let mut staking = Staking::load_or_deploy_with_cfg(
            env,
            None,
            StakingInitArgs {
                owner: env.caller(),
            },
            InstallConfig::upgradable::<Staking>(),
            container,
            400_000_000_000,
        )?;
        let mut ico = ICO::load_or_deploy_with_cfg(
            env,
            None,
            ICOInitArgs {
                owner: env.caller(),
                styks_price_feed: Address::new(
                    "hash-2879d6e927289197aab0101cc033f532fe22e4ab4686e44b5743cb1333031acc", // testnet, 814fedbd4ae53b82ab19b1ff6698ce412445c3266271fcb639986d37dc0ae121 - mainnet
                )
                .unwrap(),
            },
            InstallConfig::upgradable::<ICO>(),
            container,
            400_000_000_000,
        )?;

        // Setup Treasury
        treasury.set_big_coin(big_coin.address());
        treasury.set_staking(staking.address());

        // Setup Staking
        staking.set_big_coin(big_coin.address());
        staking.set_vesting(vesting.address());

        // Setup Vesting
        vesting.add_whitelisted_creator(ico.address());
        vesting.set_staking(staking.address());

        // Setup Lease
        // Redundant as Lease::init now sets these

        // Setup NFT
        nft.add_minter(&lease.address());
        nft.add_freezer(&lease.address());
        nft.add_whitelist_manager(&lease.address());
        nft.add_force_transferer(&lease.address());

        // Setup Escrow
        escrow.set_lease(lease.address());
        escrow.set_treasury(treasury.address());

        // Setup ICO
        let creation_params = LeasefiDeployScript::get_ico_schedule_creation_params(env);

        ico.set_big_coin(big_coin.address());
        ico.set_treasury(treasury.address());
        ico.set_vesting(vesting.address());
        ico.set_staking(staking.address());
        ico.add_currency(Currency::CSPR, None);
        env.set_gas(15_000_000_000);
        ico.add_currency(
            Currency::USDC,
            Some(
                Address::new(
                    "hash-7f06f66426f18ca8d3b8df69f977a54554d39fda43ebe942fd22ece0d20235bd", // testnet, 48bd364532febf044cca8d2d716336b93d27458ce0aa48ad292ca28304fa8649 - mainnet
                )
                .unwrap(),
            ),
        );
        ico.add_currency(
            Currency::USDT,
            Some(
                Address::new(
                    "hash-7c902e8a111b3116e00c7507138b92b83f96b29be98aa95247928583720e297a", // testnet, b53fa728c7074c84f35407f4d0989eb4133d391402b7ce13b7feeb01479a4f01 - mainnet
                )
                .unwrap(),
            ),
        );
        env.set_gas(20_000_000_000);
        big_coin.approve(&ico.address(), &(creation_params.sale_amount));
        ico.add_ico_schedule(creation_params);

        // Transfer ownership
        nft.grant_role(&DEFAULT_ADMIN_ROLE, &new_owner);
        nft.revoke_role(&DEFAULT_ADMIN_ROLE, &env.caller());
        treasury.transfer_ownership(&new_owner);
        escrow.transfer_ownership(&new_owner);
        lease.transfer_ownership(&new_owner);
        vesting.transfer_ownership(&new_owner);
        staking.transfer_ownership(&new_owner);
        ico.transfer_ownership(&new_owner);
        property_registry.grant_role(&DEFAULT_ADMIN_ROLE, &new_owner);
        property_registry.revoke_role(&DEFAULT_ADMIN_ROLE, &env.caller());

        Ok(())
    }
}

pub fn main() {
    OdraCli::new()
        .about("CLI tool for deploying of leasefi smart contracts")
        .deploy(LeasefiDeployScript)
        .contract::<BigCoin>()
        .contract::<NFT>()
        .contract::<Roles>()
        .contract::<UserRegistry>()
        .contract::<Treasury>()
        .contract::<Escrow>()
        .contract::<Lease>()
        .contract::<Staking>()
        .contract::<Vesting>()
        .contract::<ICO>()
        .contract::<PropertyRegistry>()
        .build()
        .run();
}
