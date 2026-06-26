use odra::{
    casper_types::U256,
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
    property_fraction_token::{
        types::PropertyFractionTokenInitParams, PropertyFractionToken,
        PropertyFractionTokenInitArgs,
    },
    property_registry::{
        types::{CreatePropertyParams, PropertyStatus},
        PropertyRegistry, PropertyRegistryInitArgs,
    },
    roles::{Roles, RolesInitArgs},
    staking::{Staking, StakingInitArgs},
    treasury::{Treasury, TreasuryInitArgs},
    user_registry::{
        UserRegistry, UserRegistryInitArgs, ROLE_FLAG_LANDLORD, ROLE_FLAG_PROPERTY_MANAGER,
    },
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
        // Use the deployer's key (env.caller()) as the final owner of all contracts.
        // This avoids hardcoding a specific testnet/mainnet key (which would allow
        // protocol control/drain by anyone who obtains its private key).
        // The deploy is always run with ODRA_CASPER_*_SECRET_KEY_PATH, so the
        // operator controls the resulting owner.
        let new_owner = env.caller();
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
        let mut user_registry = UserRegistry::load_or_deploy_with_cfg(
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

        let usdc_address = Address::new(
            "hash-7f06f66426f18ca8d3b8df69f977a54554d39fda43ebe942fd22ece0d20235bd", // testnet, 48bd364532febf044cca8d2d716336b93d27458ce0aa48ad292ca28304fa8649 - mainnet
        )
        .unwrap();

        let bootstrap_user_id = user_registry.create_user(
            [1u8; 32],
            new_owner,
            ROLE_FLAG_LANDLORD | ROLE_FLAG_PROPERTY_MANAGER,
        );
        let sample_property_id = property_registry.create_property(CreatePropertyParams {
            issuer: bootstrap_user_id,
            total_supply: U256::from(1_000_000u64) * U256::from(10).pow(U256::from(18)),
            metadata_uri: String::from("ipfs://leasefi-bootstrap-property"),
        });
        let mut property_fraction_token = PropertyFractionToken::load_or_deploy_with_cfg(
            env,
            None,
            PropertyFractionTokenInitArgs {
                params: PropertyFractionTokenInitParams {
                    owner: env.caller(),
                    property_id: sample_property_id,
                    compliance_policy: compliance.address(),
                    symbol: String::from("LFPROP"),
                    name: String::from("LeaseFi Property Fraction"),
                    decimals: 18,
                    initial_supply: U256::from(1_000_000u64) * U256::from(10).pow(U256::from(18)),
                    initial_holder: new_owner,
                },
            },
            InstallConfig::upgradable::<PropertyFractionToken>(),
            container,
            400_000_000_000,
        )?;

        // Grant TOKEN_MANAGER to new_owner so PFT management (set_compliance_policy) works
        // after handoff. The PFT owner (deployer) performs the grant.
        property_fraction_token
            .grant_role(&property_fraction_token.token_manager_role(), &new_owner);
        // Link the token to the registry property (deployer currently holds PROPERTY_MANAGER).
        property_registry.set_property_token(sample_property_id, property_fraction_token.address());

        // Bootstrap primary-distribution compliance for the initial holder (issuer/platform
        // admin). Without transfer-exempt status, every PFT transfer reverts with
        // SenderNotVerified because the holder is not in InvestorRegistry.
        compliance.grant_role(&compliance.compliance_manager_role(), &env.caller());
        compliance.set_transfer_exempt(new_owner, true);
        compliance.set_compliance_config(
            sample_property_id,
            ComplianceConfig {
                transfers_enabled: true,
                equity_distribution_requires_lease_option: false,
            },
        );
        compliance.revoke_role(&compliance.compliance_manager_role(), &env.caller());
        property_registry.set_property_status(sample_property_id, PropertyStatus::Active);

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

        // Whitelist new_owner on the NFT so that create_lease_agreement (which does nft.mint to tenant)
        // can succeed for the platform admin without CannotTransact. The whitelist is an allowlist
        // (KYC/AML) gate; actual tenant onboarding would use add_to_whitelist via a WHITELIST_MANAGER
        // (Lease was granted the role above; new_owner receives DEFAULT_ADMIN_ROLE and can manage further).
        nft.add_to_whitelist(&new_owner);

        // Setup Escrow
        escrow.set_lease(lease.address());
        escrow.set_treasury(treasury.address());
        escrow.set_security_deposit_token(usdc_address);

        // Setup ICO
        let creation_params = LeasefiDeployScript::get_ico_schedule_creation_params(env);

        ico.set_big_coin(big_coin.address());
        ico.set_treasury(treasury.address());
        ico.set_vesting(vesting.address());
        ico.set_staking(staking.address());
        ico.add_currency(Currency::CSPR, None);
        env.set_gas(15_000_000_000);
        ico.add_currency(Currency::USDC, Some(usdc_address));
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
        // The deployer (== ICO owner, since ICOInitArgs uses owner: env.caller() and new_owner
        // remains the deploy key with no transfer_ownership for ICO) must hold BIG and approve
        // before add_ico_schedule. This implements the "pull from caller()" fix for H-8 (avoids
        // relying on a stale get_owner() address + orphaned approvals after any ownership change).
        big_coin.approve(&ico.address(), &(creation_params.sale_amount));
        ico.add_ico_schedule(creation_params);

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
        .contract::<Staking>()
        .contract::<Vesting>()
        .contract::<ICO>()
        .contract::<PropertyRegistry>()
        .build()
        .run();
}
