use leasefi_contracts::{
    common::CurrencyAmount,
    compliance_policy::{
        errors::Error as ComplianceError,
        events::{ComplianceConfigSet, LeaseSet, TransferExemptSet},
        types::ComplianceConfig,
        CompliancePolicy, CompliancePolicyHostRef, CompliancePolicyInitArgs,
    },
    constants::ONE_MONTH_IN_SECONDS,
    escrow::{Escrow, EscrowHostRef, EscrowInitArgs},
    investor_registry::{
        types::InvestorRecord, InvestorRegistry, InvestorRegistryHostRef, InvestorRegistryInitArgs,
    },
    lease::{
        types::{CreateLeaseAgreementParams, LeaseEquityOption},
        Lease, LeaseHostRef, LeaseInitArgs,
    },
    nft::{types::NFTInitParams, NFT},
    property_registry::{
        types::{CreatePropertyParams, PropertyStatus},
        PropertyRegistry, PropertyRegistryHostRef, PropertyRegistryInitArgs,
    },
    roles::{Roles, RolesInitArgs},
};
use odra::{
    casper_types::U256,
    host::{Deployer, HostEnv},
    prelude::*,
};

use crate::nft::NFTInitArgs;

// =============================================================================
// Test Context
// =============================================================================

struct Context {
    env: HostEnv,
    compliance: CompliancePolicyHostRef,
    investor_registry: InvestorRegistryHostRef,
    property_registry: PropertyRegistryHostRef,
    lease: LeaseHostRef,
    escrow: EscrowHostRef,
    compliance_manager: Address,
    verification_manager: Address,
    property_manager: Address,
    sender: Address,
    recipient: Address,
    property_token: Address,
    revenue_distributor: Address,
    landlord: Address,
}

fn setup(env: HostEnv) -> Context {
    let compliance_manager = env.get_account(1);
    let verification_manager = env.get_account(2);
    let property_manager = env.get_account(3);
    let sender = env.get_account(4);
    let recipient = env.get_account(5);
    let property_token = env.get_account(6);
    let revenue_distributor = env.get_account(7);
    let landlord = env.get_account(8);

    let mut roles = Roles::deploy(
        &env,
        RolesInitArgs {
            admin: env.get_account(0),
        },
    );

    let mut investor_registry = InvestorRegistry::deploy(
        &env,
        InvestorRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    let mut property_registry = PropertyRegistry::deploy(
        &env,
        PropertyRegistryInitArgs {
            owner: env.get_account(0),
        },
    );

    let mut escrow = Escrow::deploy(
        &env,
        EscrowInitArgs {
            owner: env.get_account(0),
            min_deadline: 5 * 60,
        },
    );

    let mut lease = Lease::deploy(
        &env,
        LeaseInitArgs {
            owner: env.get_account(0),
        },
    );

    let mut nft = NFT::deploy(
        &env,
        NFTInitArgs {
            params: NFTInitParams {
                owner: env.get_account(0),
                symbol: String::from("LEASE"),
                name: String::from("LEASE"),
                minters: vec![lease.address()],
                burners: vec![],
                whitelist_managers: vec![env.get_account(0)],
                freezers: vec![lease.address()],
                force_transferers: vec![],
            },
        },
    );

    let mut compliance = CompliancePolicy::deploy(
        &env,
        CompliancePolicyInitArgs {
            owner: env.get_account(0),
            investor_registry: investor_registry.address(),
            property_registry: property_registry.address(),
            lease: lease.address(),
        },
    );

    lease.set_escrow(escrow.address());
    lease.set_roles(roles.address());
    lease.set_nft(nft.address());

    escrow.set_lease(lease.address());
    escrow.set_treasury(env.get_account(19));

    nft.add_to_whitelist(&env.get_account(0));
    nft.add_to_whitelist(&recipient);

    investor_registry.grant_role(
        &investor_registry.verification_manager_role(),
        &verification_manager,
    );

    property_registry.grant_role(
        &property_registry.property_manager_role(),
        &property_manager,
    );

    roles.grant_role(
        &roles.get_role_admin(&roles.get_landlord_role()),
        &env.get_account(0),
    );
    roles.grant_role(&roles.get_landlord_role(), &landlord);

    compliance.grant_role(&compliance.compliance_manager_role(), &compliance_manager);

    env.set_caller(env.get_account(0)); // Owner
    compliance.set_investor_registry(investor_registry.address());
    compliance.set_property_registry(property_registry.address());
    compliance.set_lease(lease.address());

    Context {
        env,
        compliance,
        investor_registry,
        property_registry,
        lease,
        escrow,
        compliance_manager,
        verification_manager,
        property_manager,
        sender,
        recipient,
        property_token,
        revenue_distributor,
        landlord,
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

fn create_draft_property(ctx: &mut Context) -> U256 {
    ctx.env.set_caller(ctx.property_manager);

    ctx.property_registry.create_property(CreatePropertyParams {
        issuer: ctx.env.get_account(8),
        total_supply: U256::from(1_000_000),
        metadata_uri: String::from("ipfs://property-1"),
    })
}

fn create_active_property(ctx: &mut Context) -> U256 {
    let property_id = create_draft_property(ctx);

    ctx.property_registry
        .set_property_token(property_id, ctx.property_token);

    ctx.property_registry
        .set_revenue_distributor(property_id, ctx.revenue_distributor);

    ctx.property_registry
        .set_property_status(property_id, PropertyStatus::Active);

    property_id
}

fn create_inactive_property_with_token(ctx: &mut Context) -> U256 {
    let property_id = create_draft_property(ctx);

    ctx.property_registry
        .set_property_token(property_id, ctx.property_token);

    ctx.property_registry
        .set_revenue_distributor(property_id, ctx.revenue_distributor);

    property_id
}

fn enable_transfers(ctx: &mut Context, property_id: U256) {
    ctx.env.set_caller(ctx.compliance_manager);

    ctx.compliance.set_compliance_config(
        property_id,
        ComplianceConfig {
            transfers_enabled: true,
            equity_distribution_requires_lease_option: false,
        },
    );

    assert!(ctx.env.emitted_event(
        &ctx.compliance,
        ComplianceConfigSet {
            property_id,
            transfers_enabled: true,
            equity_distribution_requires_lease_option: false,
        }
    ));
}

fn verify_sender_and_recipient(ctx: &mut Context) {
    verify_investor(ctx, ctx.sender);
    verify_investor(ctx, ctx.recipient);
}

fn call_as_property_token(ctx: &mut Context) {
    ctx.env.set_caller(ctx.property_token);
}

// =============================================================================
// Admin Configuration
// =============================================================================

#[test]
fn test_set_compliance_config_should_store_config() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);

    assert!(
        ctx.compliance
            .get_compliance_config(property_id)
            .transfers_enabled,
        "Transfers should be enabled",
    );
}

#[test]
fn test_set_compliance_config_should_revert_if_caller_is_not_manager() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    ctx.env.set_caller(ctx.env.get_account(9));

    assert_eq!(
        ctx.compliance
            .try_set_compliance_config(
                property_id,
                ComplianceConfig {
                    transfers_enabled: true,
                    equity_distribution_requires_lease_option: false,
                }
            )
            .unwrap_err(),
        ComplianceError::NotAuthorized.into(),
        "Should revert if caller is not compliance manager",
    );
}

#[test]
fn test_set_investor_registry_should_revert_if_caller_is_not_admin() {
    let mut ctx = setup(odra_test::env());

    // compliance_manager has ROLE_COMPLIANCE_MANAGER but NOT DEFAULT_ADMIN_ROLE
    ctx.env.set_caller(ctx.compliance_manager);

    assert_eq!(
        ctx.compliance
            .try_set_investor_registry(ctx.env.get_account(10))
            .unwrap_err(),
        ComplianceError::NotAuthorized.into(),
        "Should revert if caller is not admin (even if they are compliance manager)",
    );
}

#[test]
fn test_set_property_registry_should_revert_if_caller_is_not_admin() {
    let mut ctx = setup(odra_test::env());

    // compliance_manager has ROLE_COMPLIANCE_MANAGER but NOT DEFAULT_ADMIN_ROLE
    ctx.env.set_caller(ctx.compliance_manager);

    assert_eq!(
        ctx.compliance
            .try_set_property_registry(ctx.env.get_account(10))
            .unwrap_err(),
        ComplianceError::NotAuthorized.into(),
        "Should revert if caller is not admin (even if they are compliance manager)",
    );
}

#[test]
fn test_set_lease_should_revert_if_caller_is_not_admin() {
    let mut ctx = setup(odra_test::env());

    // compliance_manager has ROLE_COMPLIANCE_MANAGER but not DEFAULT_ADMIN_ROLE
    ctx.env.set_caller(ctx.compliance_manager);

    assert_eq!(
        ctx.compliance
            .try_set_lease(ctx.env.get_account(10))
            .unwrap_err(),
        ComplianceError::NotAuthorized.into(),
        "Should revert if caller is not admin (even if they are compliance manager)",
    );
}

#[test]
fn test_set_lease_should_set_lease_properly() {
    let mut ctx = setup(odra_test::env());
    let lease = ctx.env.get_account(10);

    ctx.env.set_caller(ctx.env.get_account(0));
    ctx.compliance.set_lease(lease);

    assert_eq!(
        ctx.compliance.get_lease_contract(),
        lease,
        "Invalid Lease contract address"
    );

    assert!(ctx.env.emitted_event(&ctx.compliance, LeaseSet { lease }));
}

#[test]
fn test_set_transfer_exempt_should_store_exemption() {
    let mut ctx = setup(odra_test::env());

    ctx.env.set_caller(ctx.compliance_manager);

    ctx.compliance.set_transfer_exempt(ctx.sender, true);

    assert!(ctx.compliance.is_transfer_exempt(ctx.sender));

    assert!(ctx.env.emitted_event(
        &ctx.compliance,
        TransferExemptSet {
            account: ctx.sender,
            exempt: true,
        }
    ))
}

// =============================================================================
// can_transfer()
// =============================================================================

#[test]
fn test_can_transfer_should_return_true_for_verified_transfer_on_active_property() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);
    verify_sender_and_recipient(&mut ctx);

    call_as_property_token(&mut ctx);
    assert!(
        ctx.compliance
            .can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100)),
        "Transfer should be allowed",
    );
}

#[test]
fn test_can_transfer_should_return_false_if_transfers_are_disabled() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    verify_sender_and_recipient(&mut ctx);

    call_as_property_token(&mut ctx);
    assert!(
        !ctx.compliance
            .can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100),),
        "Transfer should be blocked when transfers are disabled",
    );
}

#[test]
fn test_can_transfer_should_allow_verified_exempt_sender() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);
    verify_sender_and_recipient(&mut ctx);

    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_transfer_exempt(ctx.sender, true);

    call_as_property_token(&mut ctx);
    assert!(
        ctx.compliance
            .can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100),),
        "Transfer should be allowed from exempt sender"
    );
}

#[test]
fn test_can_transfer_should_allow_unverified_exempt_sender() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);

    // Verify ONLY the recipient. Sender remains unverified.
    let recipient = ctx.recipient;
    verify_investor(&mut ctx, recipient);

    // Set sender as exempt
    ctx.env.set_caller(ctx.compliance_manager);
    let sender = ctx.sender;
    ctx.compliance.set_transfer_exempt(sender, true);

    call_as_property_token(&mut ctx);
    assert!(
        ctx.compliance
            .can_transfer(property_id, sender, recipient, U256::from(100),),
        "Transfer should be allowed from unverified but exempt sender"
    );
}

#[test]
fn test_can_transfer_should_allow_unverified_exempt_recipient() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);

    // Verify only the sender. Recipient remains unverified.
    let sender = ctx.sender;
    verify_investor(&mut ctx, sender);

    // Set recipient as exempt
    ctx.env.set_caller(ctx.compliance_manager);
    let recipient = ctx.recipient;
    ctx.compliance.set_transfer_exempt(recipient, true);

    call_as_property_token(&mut ctx);
    assert!(
        ctx.compliance
            .can_transfer(property_id, sender, recipient, U256::from(100),),
        "Transfer should be allowed to unverified but exempt recipient"
    );
}

#[test]
fn test_can_transfer_with_nonexistent_property_id_should_return_false() {
    let mut ctx = setup(odra_test::env());
    let property_id = U256::from(9999);

    call_as_property_token(&mut ctx);
    assert!(
        !ctx.compliance
            .can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100)),
        "Transfer should be blocked for nonexistent property ID"
    );
}

// =============================================================================
// assert_can_transfer()
// =============================================================================

#[test]
fn test_assert_can_transfer_should_succeed_for_valid_transfer() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);
    verify_sender_and_recipient(&mut ctx);

    call_as_property_token(&mut ctx);
    assert!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .is_ok(),
        "Valid transfer should not revert",
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_amount_is_zero() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);
    verify_sender_and_recipient(&mut ctx);

    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::zero(),)
            .unwrap_err(),
        ComplianceError::ZeroAmount.into(),
        "Should revert when amount is zero",
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_property_is_not_active() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_inactive_property_with_token(&mut ctx);

    enable_transfers(&mut ctx, property_id);
    verify_sender_and_recipient(&mut ctx);

    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100),)
            .unwrap_err(),
        ComplianceError::PropertyNotActive.into(),
        "Should revert when property is not active",
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_transfers_are_disabled() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    verify_sender_and_recipient(&mut ctx);

    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .unwrap_err(),
        ComplianceError::TransfersDisabled.into(),
        "Should revert when transfers are disabled"
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_sender_is_not_verified() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);

    ctx.env.set_caller(ctx.verification_manager);
    ctx.investor_registry
        .set_investor_record(ctx.recipient, active_investor_record(&ctx.env));

    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .unwrap_err(),
        ComplianceError::SenderNotVerified.into(),
        "Should revert when sender is not verified",
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_recipient_is_not_verified() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);

    ctx.env.set_caller(ctx.verification_manager);
    ctx.investor_registry
        .set_investor_record(ctx.sender, active_investor_record(&ctx.env));

    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .unwrap_err(),
        ComplianceError::RecipientNotVerified.into(),
        "Should revert when recipient is not verified",
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_recipient_is_not_verified_with_exempt_sender() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);

    // Set sender as exempt (unverified)
    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_transfer_exempt(ctx.sender, true);

    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .unwrap_err(),
        ComplianceError::RecipientNotVerified.into(),
        "Should revert when recipient is not verified even with exempt sender",
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_caller_is_not_registered_property_token() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    enable_transfers(&mut ctx, property_id);
    verify_sender_and_recipient(&mut ctx);

    ctx.env.set_caller(ctx.env.get_account(9));

    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .unwrap_err(),
        ComplianceError::InvalidPropertyToken.into(),
        "Only the registered property token should receive transfer approval",
    );
}

#[test]
fn test_assert_can_transfer_should_revert_if_equity_distribution_requires_lease_and_recipient_not_eligible(
) {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    // Set config to require lease option
    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_compliance_config(
        property_id,
        ComplianceConfig {
            transfers_enabled: true,
            equity_distribution_requires_lease_option: true,
        },
    );

    // Set sender as exempt (equity distributor)
    ctx.compliance.set_transfer_exempt(ctx.sender, true);

    // Verify recipient
    let recipient = ctx.recipient;
    verify_investor(&mut ctx, recipient);

    // Recipient is NOT equity eligible for this property
    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .unwrap_err(),
        ComplianceError::RecipientNotEquityEligible.into(),
        "Should revert if equity distribution requires lease option and recipient is not eligible",
    );
}

#[test]
fn test_assert_can_transfer_should_succeed_if_equity_distribution_requires_lease_and_recipient_is_eligible(
) {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    // Set config to require lease option
    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_compliance_config(
        property_id,
        ComplianceConfig {
            transfers_enabled: true,
            equity_distribution_requires_lease_option: true,
        },
    );

    // Set sender as exempt (equity distributor)
    ctx.compliance.set_transfer_exempt(ctx.sender, true);

    // Verify recipient
    let recipient = ctx.recipient;
    verify_investor(&mut ctx, recipient);

    // Mark recipient as equity eligible in Lease contract
    ctx.env.set_caller(ctx.landlord);
    ctx.lease
        .create_lease_agreement(CreateLeaseAgreementParams {
            tenant: ctx.recipient,
            equity_option: Some(LeaseEquityOption { property_id }),
            monthly_rent: CurrencyAmount::new(None, U256::from(100)),
            security_deposit: CurrencyAmount::new(None, U256::from(500)),
            start: ctx.env.block_time(),
            end: ctx.env.block_time() + ONE_MONTH_IN_SECONDS,
            invoice_validity_duration: ctx.escrow.get_min_deadline(),
        });

    call_as_property_token(&mut ctx);
    assert!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .is_ok(),
        "Equity distribution should succeed if recipient is eligible",
    );
}

#[test]
fn test_assert_can_transfer_should_succeed_for_secondary_transfer_even_if_equity_rule_is_active() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    // Set config to require lease option (only for equity distributions)
    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_compliance_config(
        property_id,
        ComplianceConfig {
            transfers_enabled: true,
            equity_distribution_requires_lease_option: true,
        },
    );

    // Normal verified sender (NOT exempt)
    let sender = ctx.sender;
    let recipient = ctx.recipient;
    verify_investor(&mut ctx, sender);
    verify_investor(&mut ctx, recipient);

    // Recipient is NOT equity eligible, but it shouldn't matter for secondary transfers
    call_as_property_token(&mut ctx);
    assert!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .is_ok(),
        "Secondary transfer should succeed regardless of equity eligibility rule",
    );
}

#[test]
fn test_assert_can_transfer_kyc_check_takes_precedence_over_equity_eligibility() {
    let mut ctx = setup(odra_test::env());
    let property_id = create_active_property(&mut ctx);

    // Set config to require lease option
    ctx.env.set_caller(ctx.compliance_manager);
    ctx.compliance.set_compliance_config(
        property_id,
        ComplianceConfig {
            transfers_enabled: true,
            equity_distribution_requires_lease_option: true,
        },
    );

    // Set sender as exempt (equity distributor)
    ctx.compliance.set_transfer_exempt(ctx.sender, true);

    // Recipient is UNVERIFIED
    // Recipient is also NOT equity eligible

    call_as_property_token(&mut ctx);
    assert_eq!(
        ctx.compliance
            .try_assert_can_transfer(property_id, ctx.sender, ctx.recipient, U256::from(100))
            .unwrap_err(),
        ComplianceError::RecipientNotVerified.into(),
        "RecipientNotVerified should take precedence over RecipientNotEquityEligible",
    );
}
