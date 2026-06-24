use leasefi_contracts::{
    big_coin::{BigCoin, BigCoinInitArgs},
    compliance_policy::{CompliancePolicy, CompliancePolicyInitArgs},
    escrow::{Escrow, EscrowInitArgs},
    ico::{ICOInitArgs, ICO},
    investor_registry::{InvestorRegistry, InvestorRegistryInitArgs},
    lease::{Lease, LeaseInitArgs},
    mocks::styks_price_feed::StyksPriceFeed,
    nft::{types::NFTInitParams, NFT},
    property_fraction_token::{
        types::PropertyFractionTokenInitParams, PropertyFractionToken,
        PropertyFractionTokenInitArgs,
    },
    property_registry::{PropertyRegistry, PropertyRegistryInitArgs},
    roles::{Roles, RolesInitArgs},
    staking::{Staking, StakingInitArgs},
    treasury::{Treasury, TreasuryInitArgs},
    user_registry::{UserRegistry, UserRegistryInitArgs},
    vesting::{Vesting, VestingInitArgs},
};
use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv, NoArgs},
    prelude::*,
};

// =============================================================================
// Helpers
// =============================================================================

macro_rules! assert_cep96_metadata {
    ($contract:expr, $name:expr, $description:expr) => {
        assert_eq!(
            $contract.contract_name(),
            Some($name.to_string()),
            "Invalid CEP-96 contract_name"
        );
        assert_eq!(
            $contract.contract_description(),
            Some($description.to_string()),
            "Invalid CEP-96 contract_description"
        );
        assert_eq!(
            $contract.contract_icon_uri(),
            None,
            "CEP-96 contract_icon_uri should be unset"
        );
        assert_eq!(
            $contract.contract_project_uri(),
            None,
            "CEP-96 contract_project_uri should be unset"
        );
    };
}

fn deploy_nft(env: &HostEnv) -> crate::nft::NFTHostRef {
    NFT::deploy(
        env,
        crate::nft::NFTInitArgs {
            params: NFTInitParams {
                owner: env.get_account(0),
                symbol: String::from("LEASE"),
                name: String::from("LEASE"),
                minters: vec![],
                burners: vec![],
                whitelist_managers: vec![env.get_account(0)],
                freezers: vec![],
                force_transferers: vec![],
            },
        },
    )
}

// =============================================================================
// CEP-96 metadata smoke tests
// =============================================================================

#[test]
fn test_big_coin_metadata() {
    let env = odra_test::env();
    let big_coin = BigCoin::deploy(
        &env,
        BigCoinInitArgs {
            symbol: String::from("BIG"),
            name: String::from("BIG"),
            decimals: 18,
            initial_supply: U256::from(1_000),
        },
    );

    assert_cep96_metadata!(
        big_coin,
        "BIG LeaseFi Token",
        "CEP-18 protocol token for LeaseFi payments, staking, and treasury operations."
    );
}

#[test]
fn test_nft_metadata() {
    let env = odra_test::env();
    let nft = deploy_nft(&env);

    assert_cep96_metadata!(
        nft,
        "BIG LeaseFi NFT",
        "CEP-95 token for lease certificates and on-chain assets."
    );
}

#[test]
fn test_roles_metadata() {
    let env = odra_test::env();
    let roles = Roles::deploy(
        &env,
        RolesInitArgs {
            admin: env.get_account(0),
        },
    );

    assert_cep96_metadata!(
        roles,
        "BIG LeaseFi Roles",
        "Legacy wallet-level role management for the LeaseFi protocol."
    );
}

#[test]
fn test_user_registry_metadata() {
    let env = odra_test::env();
    let user_registry = UserRegistry::deploy(
        &env,
        UserRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    assert_cep96_metadata!(
        user_registry,
        "BIG LeaseFi User Registry",
        "On-chain user identity, wallets, and capability flags for LeaseFi participants."
    );
}

#[test]
fn test_treasury_metadata() {
    let env = odra_test::env();
    let treasury = Treasury::deploy(
        &env,
        TreasuryInitArgs {
            owner: env.get_account(0),
        },
    );

    assert_cep96_metadata!(
        treasury,
        "BIG LeaseFi Treasury",
        "Protocol treasury for BIG token reserves and reward distribution."
    );
}

#[test]
fn test_escrow_metadata() {
    let env = odra_test::env();
    let user_registry = UserRegistry::deploy(
        &env,
        UserRegistryInitArgs {
            owner: env.get_account(0),
        },
    );
    let escrow = Escrow::deploy(
        &env,
        EscrowInitArgs {
            owner: env.get_account(0),
            min_deadline: 5 * 60,
            user_registry: user_registry.address(),
        },
    );

    assert_cep96_metadata!(
        escrow,
        "BIG LeaseFi Escrow",
        "Conditional fund locking for rent, invoices, and security deposits."
    );
}

#[test]
fn test_lease_metadata() {
    let env = odra_test::env();
    let owner = env.get_account(0);

    let user_registry = UserRegistry::deploy(&env, UserRegistryInitArgs { owner });
    let escrow = Escrow::deploy(
        &env,
        EscrowInitArgs {
            owner,
            min_deadline: 5 * 60,
            user_registry: user_registry.address(),
        },
    );
    let property_registry = PropertyRegistry::deploy(
        &env,
        PropertyRegistryInitArgs {
            owner,
            user_registry: user_registry.address(),
        },
    );
    let nft = deploy_nft(&env);
    let lease = Lease::deploy(
        &env,
        LeaseInitArgs {
            owner,
            escrow: escrow.address(),
            nft: nft.address(),
            property_registry: property_registry.address(),
            user_registry: user_registry.address(),
        },
    );

    assert_cep96_metadata!(
        lease,
        "BIG LeaseFi Lease",
        "Property lease lifecycle, invoicing, and equity eligibility."
    );
}

#[test]
fn test_staking_metadata() {
    let env = odra_test::env();
    let staking = Staking::deploy(
        &env,
        StakingInitArgs {
            owner: env.get_account(0),
        },
    );

    assert_cep96_metadata!(
        staking,
        "BIG LeaseFi Staking",
        "BIG token staking and reward claims."
    );
}

#[test]
fn test_ico_metadata() {
    let env = odra_test::env();
    let styks_price_feed = StyksPriceFeed::deploy(&env, NoArgs);
    let ico = ICO::deploy(
        &env,
        ICOInitArgs {
            owner: env.get_account(0),
            styks_price_feed: styks_price_feed.address(),
        },
    );

    assert_cep96_metadata!(
        ico,
        "BIG LeaseFi ICO",
        "BIG token sale schedules and multi-currency purchases."
    );
}

#[test]
fn test_vesting_metadata() {
    let env = odra_test::env();
    let vesting = Vesting::deploy(
        &env,
        VestingInitArgs {
            owner: env.get_account(0),
        },
    );

    assert_cep96_metadata!(
        vesting,
        "BIG LeaseFi Vesting",
        "Time-based BIG token vesting schedules."
    );
}

#[test]
fn test_investor_registry_metadata() {
    let env = odra_test::env();
    let investor_registry = InvestorRegistry::deploy(
        &env,
        InvestorRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    assert_cep96_metadata!(
        investor_registry,
        "BIG LeaseFi Investor Registry",
        "On-chain investor verification and freeze state for tokenized property flows."
    );
}

#[test]
fn test_property_registry_metadata() {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let user_registry = UserRegistry::deploy(&env, UserRegistryInitArgs { owner });
    let property_registry = PropertyRegistry::deploy(
        &env,
        PropertyRegistryInitArgs {
            owner,
            user_registry: user_registry.address(),
        },
    );

    assert_cep96_metadata!(
        property_registry,
        "BIG LeaseFi Property Registry",
        "Tokenized property records and lifecycle management."
    );
}

#[test]
fn test_compliance_policy_metadata() {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let compliance = CompliancePolicy::deploy(
        &env,
        CompliancePolicyInitArgs {
            owner,
            investor_registry: env.get_account(1),
            property_registry: env.get_account(2),
            lease: env.get_account(3),
            user_registry: env.get_account(4),
        },
    );

    assert_cep96_metadata!(
        compliance,
        "BIG LeaseFi Compliance Policy",
        "Transfer compliance gate for property ownership tokens."
    );
}

#[test]
fn test_property_fraction_token_metadata() {
    let env = odra_test::env();
    let owner = env.get_account(0);
    let token = PropertyFractionToken::deploy(
        &env,
        PropertyFractionTokenInitArgs {
            params: PropertyFractionTokenInitParams {
                owner,
                property_id: U256::zero(),
                compliance_policy: env.get_account(1),
                symbol: String::from("LFPROP"),
                name: String::from("LeaseFi Property Fraction"),
                decimals: 18,
                initial_supply: U256::from(1_000_000),
                initial_holder: env.get_account(2),
            },
        },
    );

    assert_cep96_metadata!(
        token,
        "BIG LeaseFi Property Fraction Token",
        "Reference property ownership fraction token with compliance checks."
    );
}
