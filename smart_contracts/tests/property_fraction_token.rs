use leasefi_contracts::{
    compliance_policy::{
        errors::Error as ComplianceError, types::ComplianceConfig, CompliancePolicy,
        CompliancePolicyHostRef, CompliancePolicyInitArgs,
    },
    constants::COMPLIANCE_POLICY_UPDATE_TIMELOCK,
    escrow::{Escrow, EscrowInitArgs},
    investor_registry::{
        types::InvestorRecord, InvestorRegistry, InvestorRegistryHostRef, InvestorRegistryInitArgs,
    },
    lease::{Lease, LeaseInitArgs},
    nft::{types::NFTInitParams, NFT},
    property_fraction_token::{
        errors::Error as TokenError,
        events::{CompliancePolicySet, PropertyFractionTokenInitialized},
        types::PropertyFractionTokenInitParams,
        PropertyFractionToken, PropertyFractionTokenHostRef, PropertyFractionTokenInitArgs,
    },
    property_registry::{
        types::{CreatePropertyParams, PropertyStatus},
        PropertyRegistry, PropertyRegistryInitArgs,
    },
    roles::{Roles, RolesInitArgs},
};
use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};
use odra_modules::access::DEFAULT_ADMIN_ROLE;

use crate::nft::NFTInitArgs;

// =============================================================================
// Test Context
// =============================================================================

struct Context {
    env: HostEnv,
    token: PropertyFractionTokenHostRef,
    compliance: CompliancePolicyHostRef,
    investor_registry: InvestorRegistryHostRef,
    owner: Address,
    token_manager: Address,
    compliance_manager: Address,
    verification_manager: Address,
    initial_holder: Address,
    recipient: Address,
    spender: Address,
    property_id: U256,
    initial_supply: U256,
}

fn setup(env: HostEnv) -> Context {
    let owner = env.get_account(0);
    let token_manager = env.get_account(1);
    let compliance_manager = env.get_account(2);
    let verification_manager = env.get_account(3);
    let property_manager = env.get_account(4);
    let initial_holder = env.get_account(5);
    let recipient = env.get_account(6);
    let spender = env.get_account(7);
    let revenue_distributor = env.get_account(8);
    let issuer = env.get_account(9);
    let initial_supply = U256::from(1_000_000);

    let roles = Roles::deploy(&env, RolesInitArgs { admin: owner });

    let mut investor_registry = InvestorRegistry::deploy(&env, InvestorRegistryInitArgs { owner });
    let mut property_registry = PropertyRegistry::deploy(&env, PropertyRegistryInitArgs { owner });
    let mut escrow = Escrow::deploy(
        &env,
        EscrowInitArgs {
            owner,
            min_deadline: 5 * 60,
        },
    );

    let mut nft = NFT::deploy(
        &env,
        NFTInitArgs {
            params: NFTInitParams {
                owner,
                symbol: String::from("LEASE"),
                name: String::from("LEASE"),
                minters: vec![],
                burners: vec![],
                whitelist_managers: vec![owner],
                freezers: vec![],
                force_transferers: vec![],
            },
        },
    );

    let lease = Lease::deploy(
        &env,
        LeaseInitArgs {
            owner,
            roles: roles.address(),
            escrow: escrow.address(),
            nft: nft.address(),
            property_registry: property_registry.address(),
        },
    );

    escrow.set_lease(lease.address());
    escrow.set_treasury(env.get_account(19));
    env.advance_block_time(COMPLIANCE_POLICY_UPDATE_TIMELOCK + 1);
    escrow.apply_pending_lease();
    escrow.apply_pending_treasury();

    nft.add_minter(&lease.address());
    nft.add_freezer(&lease.address());

    nft.add_to_whitelist(&owner);

    let mut compliance = CompliancePolicy::deploy(
        &env,
        CompliancePolicyInitArgs {
            owner,
            investor_registry: investor_registry.address(),
            property_registry: property_registry.address(),
            lease: lease.address(),
        },
    );

    investor_registry.grant_role(
        &investor_registry.verification_manager_role(),
        &verification_manager,
    );

    property_registry.grant_role(
        &property_registry.property_manager_role(),
        &property_manager,
    );

    compliance.grant_role(&compliance.compliance_manager_role(), &compliance_manager);

    env.set_caller(property_manager);
    let property_id = property_registry.create_property(CreatePropertyParams {
        issuer,
        total_supply: initial_supply,
        metadata_uri: String::from("ipfs://property-1"),
    });

    let mut token = PropertyFractionToken::deploy(
        &env,
        PropertyFractionTokenInitArgs {
            params: PropertyFractionTokenInitParams {
                owner,
                property_id,
                compliance_policy: compliance.address(),
                symbol: String::from("LFPROP"),
                name: String::from("LeaseFi Property Fraction"),
                decimals: 18,
                initial_supply,
                initial_holder,
            },
        },
    );

    env.set_caller(owner);
    token.grant_role(&token.token_manager_role(), &token_manager);

    env.set_caller(property_manager);
    property_registry.set_property_token(property_id, token.address());
    property_registry.set_revenue_distributor(property_id, revenue_distributor);
    property_registry.set_property_status(property_id, PropertyStatus::Active);

    Context {
        env,
        token,
        compliance,
        investor_registry,
        owner,
        token_manager,
        compliance_manager,
        verification_manager,
        initial_holder,
        recipient,
        spender,
        property_id,
        initial_supply,
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn active_investor_record(env: &HostEnv) -> InvestorRecord {
    InvestorRecord {
        verified: true,
        frozen: false,
        verified_until: env.block_time() + 1_000,
        jurisdiction: 840,
        identity_hash: [1u8; 32],
    }
}

fn verify_investor(ctx: &mut Context, account: Address) {
    ctx.env.set_caller(ctx.verification_manager);
    ctx.investor_registry
        .set_investor_record(account, active_investor_record(&ctx.env));
}

fn enable_transfers(ctx: &mut Context) {
    ctx.env.set_caller(ctx.compliance_manager);

    ctx.compliance.set_compliance_config(
        ctx.property_id,
        ComplianceConfig {
            transfers_enabled: true,
            equity_distribution_requires_lease_option: false,
        },
    );
}

fn set_transfer_exempt(ctx: &mut Context, account: Address, exempt: bool) {
    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_transfer_exempt(account, exempt);
}

fn enable_primary_distribution(ctx: &mut Context) {
    let initial_holder = ctx.initial_holder;

    enable_transfers(ctx);
    set_transfer_exempt(ctx, initial_holder, true);
}

// =============================================================================
// init()
// =============================================================================

#[test]
fn test_init_should_initialize_fixed_supply_property_token() {
    let ctx = setup(odra_test::env());

    assert!(
        ctx.token.has_role(&DEFAULT_ADMIN_ROLE, &ctx.owner),
        "Owner should have DEFAULT_ADMIN_ROLE",
    );

    assert!(
        ctx.token
            .has_role(&ctx.token.token_manager_role(), &ctx.token_manager),
        "Token manager should have TOKEN_MANAGER role",
    );

    assert_eq!(
        ctx.token.get_property_id(),
        ctx.property_id,
        "Invalid property ID",
    );

    assert_eq!(
        ctx.token.get_compliance_policy_contract(),
        ctx.compliance.address(),
        "Invalid compliance policy address",
    );

    assert_eq!(
        ctx.token.name(),
        String::from("LeaseFi Property Fraction"),
        "Invalid token name",
    );

    assert_eq!(
        ctx.token.symbol(),
        String::from("LFPROP"),
        "Invalid token symbol",
    );
    assert_eq!(ctx.token.decimals(), 18, "Invalid decimals");

    assert_eq!(
        ctx.token.total_supply(),
        ctx.initial_supply,
        "Invalid total supply",
    );

    assert_eq!(
        ctx.token.balance_of(&ctx.initial_holder),
        ctx.initial_supply,
        "Initial holder should receive the full supply",
    );

    assert!(ctx.env.emitted_event(
        &ctx.token,
        CompliancePolicySet {
            compliance_policy: ctx.compliance.address(),
        }
    ));

    assert!(ctx.env.emitted_event(
        &ctx.token,
        PropertyFractionTokenInitialized {
            property_id: ctx.property_id,
            initial_holder: ctx.initial_holder,
            initial_supply: ctx.initial_supply,
            compliance_policy: ctx.compliance.address(),
        }
    ));
}

// =============================================================================
// Admin Configuration
// =============================================================================

#[test]
fn test_set_compliance_policy_should_update_policy_for_token_manager() {
    let mut ctx = setup(odra_test::env());
    let new_policy = ctx.env.get_account(10);

    ctx.env.set_caller(ctx.token_manager);
    ctx.token.set_compliance_policy(new_policy);

    // Change is pending due to timelock; current policy is unchanged
    assert_eq!(
        ctx.token.get_compliance_policy_contract(),
        ctx.compliance.address(),
        "Compliance policy should not change until timelock elapses",
    );
    assert_eq!(
        ctx.token.get_pending_compliance_policy(),
        Some(new_policy),
        "New policy should be pending",
    );

    // Advance past timelock and apply
    ctx.env
        .advance_block_time(COMPLIANCE_POLICY_UPDATE_TIMELOCK + 1);
    ctx.token.apply_compliance_policy();

    assert_eq!(
        ctx.token.get_compliance_policy_contract(),
        new_policy,
        "Invalid updated compliance policy address",
    );

    assert!(ctx.env.emitted_event(
        &ctx.token,
        CompliancePolicySet {
            compliance_policy: new_policy
        }
    ),);
}

#[test]
fn test_set_compliance_policy_should_revert_if_caller_is_not_token_manager() {
    let mut ctx = setup(odra_test::env());
    let new_policy = ctx.env.get_account(10);

    ctx.env.set_caller(ctx.recipient);

    assert_eq!(
        ctx.token.try_set_compliance_policy(new_policy).unwrap_err(),
        TokenError::NotAuthorized.into(),
        "Should revert if caller lacks TOKEN_MANAGER role",
    )
}

// =============================================================================
// transfer()
// =============================================================================

#[test]
fn test_transfer_should_move_tokens_when_compliance_passes() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let amount = U256::from(250);

    enable_primary_distribution(&mut ctx);
    verify_investor(&mut ctx, recipient);

    ctx.env.set_caller(initial_holder);
    ctx.token.transfer(&recipient, &amount);

    assert_eq!(
        ctx.token.balance_of(&initial_holder),
        ctx.initial_supply - amount,
        "Invalid sender balance",
    );

    assert_eq!(
        ctx.token.balance_of(&recipient),
        amount,
        "Invalid recipient balance",
    );
}

#[test]
fn test_transfer_should_revert_if_transfers_are_disabled() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let amount = U256::from(100);

    set_transfer_exempt(&mut ctx, initial_holder, true);
    verify_investor(&mut ctx, recipient);

    ctx.env.set_caller(initial_holder);

    assert_eq!(
        ctx.token.try_transfer(&recipient, &amount).unwrap_err(),
        ComplianceError::TransfersDisabled.into(),
        "Should revert when property transfers are disabled",
    );
}

#[test]
fn test_transfer_should_revert_if_sender_is_not_verified_or_exempt() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let amount = U256::from(100);

    enable_transfers(&mut ctx);
    verify_investor(&mut ctx, recipient);

    ctx.env.set_caller(initial_holder);

    assert_eq!(
        ctx.token.try_transfer(&recipient, &amount).unwrap_err(),
        ComplianceError::SenderNotVerified.into(),
        "Should revert when sender is not verified or exempt",
    );
}

#[test]
fn test_transfer_should_revert_if_recipient_is_not_verified_or_exempt() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let amount = U256::from(100);

    enable_primary_distribution(&mut ctx);

    ctx.env.set_caller(initial_holder);

    assert_eq!(
        ctx.token.try_transfer(&recipient, &amount).unwrap_err(),
        ComplianceError::RecipientNotVerified.into(),
        "Should revert when recipient is not verified or exempt",
    );
}

#[test]
fn test_transfer_should_revert_if_amount_is_zero() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let amount = U256::zero();

    ctx.env.set_caller(initial_holder);

    assert_eq!(
        ctx.token.try_transfer(&recipient, &amount).unwrap_err(),
        ComplianceError::ZeroAmount.into(),
        "Should revert before CEP-18 zero-transfer behaviour can bypass compliance",
    );
}

// =============================================================================
// transfer_from()
// =============================================================================

#[test]
fn test_transfer_from_should_move_tokens_when_allowance_and_compliance_pass() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let spender = ctx.spender;
    let amount = U256::from(400);

    enable_primary_distribution(&mut ctx);
    verify_investor(&mut ctx, recipient);

    ctx.env.set_caller(initial_holder);
    ctx.token.approve(&spender, &amount);

    ctx.env.set_caller(spender);
    ctx.token
        .transfer_from(&initial_holder, &recipient, &amount);

    assert_eq!(
        ctx.token.balance_of(&initial_holder),
        ctx.initial_supply - amount,
        "Invalid owner balance",
    );

    assert_eq!(
        ctx.token.balance_of(&recipient),
        amount,
        "Invalid recipient balance",
    );
}

#[test]
fn test_transfer_from_should_revert_before_allowance_check_if_compliance_fails() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let spender = ctx.spender;
    let amount = U256::from(400);

    ctx.env.set_caller(initial_holder);
    ctx.token.approve(&spender, &amount);

    assert_eq!(
        ctx.token
            .try_transfer_from(&initial_holder, &recipient, &amount)
            .unwrap_err(),
        ComplianceError::TransfersDisabled.into(),
        "Should run compliance before CEP-18 allowance transfer"
    )
}

// =============================================================================
// can_transfer()
// =============================================================================

#[test]
fn test_can_transfer_should_return_true_when_policy_allows_transfer() {
    let mut ctx = setup(odra_test::env());
    let initial_holder = ctx.initial_holder;
    let recipient = ctx.recipient;
    let amount = U256::from(100);

    enable_primary_distribution(&mut ctx);
    verify_investor(&mut ctx, recipient);

    assert!(
        ctx.token.can_transfer(initial_holder, recipient, amount),
        "Transfer should be allowed",
    );
}

#[test]
fn test_can_transfer_should_return_false_when_policy_blocks_transfer() {
    let ctx = setup(odra_test::env());
    let amount = U256::from(100);

    assert!(
        !ctx.token
            .can_transfer(ctx.initial_holder, ctx.recipient, amount),
        "Transfer should be blocked before compliance is configured",
    )
}
