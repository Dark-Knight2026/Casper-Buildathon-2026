use odra::{
    casper_types::U256,
    host::{HostEnv, InstallConfig},
    prelude::{Address, Addressable},
};
use odra_cli::{deploy::DeployScript, DeployedContractsContainer, DeployerExt, OdraCli};

use odra_modules::access::DEFAULT_ADMIN_ROLE;

use leasefi_contracts::{
    big_coin::{BigCoin, BigCoinInitArgs},
    constants::MIN_DEADLINE_IN_MS,
    escrow::{Escrow, EscrowInitArgs},
    lease::{Lease, LeaseInitArgs},
    nft::{types::NFTInitParams, NFTInitArgs, NFT},
    property_registry::{PropertyRegistry, PropertyRegistryInitArgs},
    roles::{Roles, RolesInitArgs},
    treasury::{Treasury, TreasuryInitArgs},
    user_registry::{UserRegistry, UserRegistryInitArgs},
};

struct LeasefiDeployScript;

impl DeployScript for LeasefiDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        // Use the deployer's key (env.caller()) as the final owner of all contracts.
        // This avoids hardcoding a specific testnet/mainnet key (which would allow
        // protocol control/drain by anyone who obtains its private key).
        // The deploy is always run with ODRA_CASPER_*_SECRET_KEY_PATH, so the
        // operator controls the resulting owner.
        let new_owner = env.caller();
        let big_coin = BigCoin::load_or_deploy_with_cfg(
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
            // Grant FREEZER at init (via the deploy script) so external freeze/unfreeze ops
            // (e.g. set_frozen_tokens) do not permanently revert for the deployer/owner.
            // Lease also receives it via add_freezer later. Addresses M-7.
            freezers: vec![env.caller()],
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
                min_deadline: MIN_DEADLINE_IN_MS,
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
        let lease = Lease::load_or_deploy_with_cfg(
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

        let usdc_address = Address::new(
            "hash-7f06f66426f18ca8d3b8df69f977a54554d39fda43ebe942fd22ece0d20235bd", // testnet, 48bd364532febf044cca8d2d716336b93d27458ce0aa48ad292ca28304fa8649 - mainnet
        )
        .unwrap();

        // Setup Treasury
        treasury.set_big_coin(big_coin.address());

        // Setup Lease
        // Redundant as Lease::init now sets these

        // Setup NFT
        nft.add_minter(&lease.address());
        nft.add_freezer(&lease.address());
        nft.add_whitelist_manager(&lease.address());
        nft.add_force_transferer(&lease.address());

        // Whitelist new_owner on the NFT so that create_lease_agreement (which does nft.mint to tenant)
        // can succeed for the platform admin without CannotTransact. The whitelist is an allowlist
        // (KYC/AML) gate; actual tenant onboarding would use add_to_whitelist via a WHITELIST_MANAGER
        // (Lease was granted the role above; new_owner receives DEFAULT_ADMIN_ROLE and can manage further).
        nft.add_to_whitelist(&new_owner);

        // Setup Escrow
        escrow.set_lease(lease.address());
        escrow.set_treasury(treasury.address());
        escrow.set_security_deposit_token(usdc_address);

        // Ownership handoff for admin roles. Since new_owner is env.caller() (the
        // deploy key), we grant any additional operational roles but do not revoke
        // DEFAULT_ADMIN from the final owner or call transfer_ownership to self
        // (which could leave contracts in a pending state). The contracts were
        // initialized with the deployer as owner.
        nft.grant_role(&DEFAULT_ADMIN_ROLE, &new_owner);
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
        .contract::<PropertyRegistry>()
        .build()
        .run();
}