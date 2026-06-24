use odra::{casper_types::U256, prelude::*, ContractRef};
use odra_modules::{
    access::Ownable,
    cep96::{Cep96, Cep96ContractMetadata},
};

use crate::{
    constants::{LEASEFI_TRANSACTION_FEE_BPS, ONE_HUNDRED_PERCENT_BPS, ONE_MONTH_IN_MILLISECONDS},
    escrow::{types::CreateLeaseInvoiceParams, EscrowContractRef},
    lease::{
        errors::Error,
        events::{
            EquityEligibilityGranted, EquityEligibilityRevoked, LeaseAgreementCreated,
            LeaseAgreementFinished, LeaseAgreementProlonged, LeaseNftRecovered,
        },
        types::{CreateLeaseAgreementParams, LeaseAgreement, RentDistributionTerms},
    },
    nft::NFTContractRef,
    property_registry::PropertyRegistryContractRef,
    user_registry::UserRegistryContractRef,
};

// =============================================================================
// Lease Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    use crate::common::CurrencyAmount;

    #[odra::odra_type]
    pub struct LeaseAgreement {
        /// Tenant user ID responsible for paying rent and lease invoices.
        pub tenant: U256,
        /// Landlord user ID that created and owns the lease relationship.
        pub landlord: U256,
        /// Rent split rules used when lease invoice payments are distributed.
        pub rent_distribution_terms: RentDistributionTerms,
        /// Optional lease-to-own terms that make the tenant eligible for property equity.
        pub equity_option: Option<LeaseEquityOption>,
        /// Required monthly base rent.
        pub monthly_rent: CurrencyAmount,
        /// Security deposit held until lease finalization.
        pub security_deposit: CurrencyAmount,
        /// Escrow invoice IDs created for the security deposit and monthly rent payments.
        pub invoices_ids: Vec<U256>,
        /// Lease start timestamp.
        pub start: u64,
        /// Lease end timestamp.
        pub end: u64,
        /// Whether the lease has been finalized.
        pub is_finished: bool,
        /// Frozen lease NFT token ID minted to the tenant.
        pub token_id: U256,
    }

    #[odra::odra_type]
    pub struct CreateLeaseAgreementParams {
        pub tenant: U256,
        pub rent_distribution_terms: RentDistributionTerms,
        pub equity_option: Option<LeaseEquityOption>,
        pub monthly_rent: CurrencyAmount,
        pub security_deposit: CurrencyAmount,
        pub start: u64,
        pub end: u64,
        /// Duration added to the invoice creation time to calculate invoice deadlines.
        pub invoice_validity_duration: u64,
    }

    #[odra::odra_type]
    pub struct RentDistributionTerms {
        /// Optional property manager user ID that receives a percentage of the base rent
        /// @dev This applies to the rent, not security deposits or equity top-ups
        pub property_manager: Option<U256>,
        /// Property manager rent share in basis points
        /// @dev 10_000 = 100%. Must be zero when `property_manager` is `None`.
        pub property_manager_bps: u32,
    }

    #[odra::odra_type]
    pub struct LeaseEquityOption {
        /// Property for which the tenant receives equity eligibility
        /// @dev This only gates future property-token distribution. It does not create an equity payment schedule in phase 1/MVP.
        pub property_id: U256,
    }
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct LeaseAgreementCreated {
        pub lease_agreement_id: U256,
        pub created_at: u64,
    }

    #[odra::event]
    pub struct LeaseAgreementFinished {
        pub lease_agreement_id: U256,
        pub finished_at: u64,
    }

    #[odra::event]
    pub struct LeaseAgreementProlonged {
        pub lease_agreement_id: U256,
        pub prolonged_at: u64,
    }

    #[odra::event]
    pub struct LeaseNftRecovered {
        /// Lease agreement whose NFT was recovered.
        pub lease_agreement_id: U256,
        /// Lease NFT token ID that was transferred.
        pub token_id: U256,
        /// Wallet that owned the lease NFT before recovery.
        pub old_wallet: Address,
        /// Tenant user's active wallet that received the lease NFT.
        pub new_wallet: Address,
    }

    #[odra::event]
    pub struct EquityEligibilityGranted {
        pub property_id: U256,
        pub account: U256,
    }

    #[odra::event]
    pub struct EquityEligibilityRevoked {
        pub property_id: U256,
        pub account: U256,
    }

    #[odra::event]
    pub struct RolesSet {
        pub roles: Address,
    }

    #[odra::event]
    pub struct EscrowSet {
        pub escrow: Address,
    }

    #[odra::event]
    pub struct NftSet {
        pub nft: Address,
    }

    #[odra::event]
    pub struct PropertyRegistrySet {
        pub property_registry: Address,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {
        CallerNotLandlord = 400,
        InvalidLeaseAgreementId = 401,
        EqualTenantAndLandlord = 402,
        InvalidTimeframes = 403,
        ZeroAmount = 404,
        InvalidLandlord = 405,
        LeaseAgreementHasNotFinishedYet = 406,
        NotAllInvoicesArePaid = 407,
        SecurityDepositChargeIsTooHigh = 408,
        InvalidPropertyStatus = 409,
        InvalidPropertyIssuer = 410,
        InvalidPropertyManagerBps = 411,
        InvalidPropertyManager = 412,
        LeaseAlreadyFinalized = 413,
        TenantAlreadyEquityEligible = 414,
        InvalidTenant = 415,
        LeaseNftOwnerNotFound = 416,
        LeaseNftAlreadyOwnedByActiveWallet = 417,
    }
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(errors = Error, events = [
  LeaseAgreementCreated,
  LeaseAgreementFinished,
  LeaseAgreementProlonged,
  LeaseNftRecovered,
  EquityEligibilityGranted,
  EquityEligibilityRevoked,
])]
pub struct Lease {
    /// Ownership control for contract configuration.
    ownable: SubModule<Ownable>,
    /// Escrow contract used to create and inspect lease invoices.
    escrow: External<EscrowContractRef>,
    /// NFT contract used to mint frozen lease NFTs to tenants.
    nft: External<NFTContractRef>,
    /// Property registry used to validate lease equity options.
    property_registry: External<PropertyRegistryContractRef>,
    /// User registry used to authorize user IDs and resolve active wallets.
    user_registry: External<UserRegistryContractRef>,
    /// Lease agreements keyed by lease agreement ID.
    leases: Mapping<U256, LeaseAgreement>,
    /// Equity Eligibility keyed by property ID and tenant user ID.
    equity_eligible: Mapping<(U256, U256), bool>,
    /// Number of lease agreements created.
    leases_count: Var<U256>,
    /// CEP-96 on-chain discoverability metadata. Immutable after deploy.
    metadata: SubModule<Cep96>,
}

#[odra::module]
impl Lease {
    // =========================================================================
    // Initialization
    // =========================================================================

    pub fn init(
        &mut self,
        owner: Address,
        escrow: Address,
        nft: Address,
        property_registry: Address,
        user_registry: Address,
    ) {
        self.ownable.init(owner);
        self.escrow.set(escrow);
        self.nft.set(nft);
        self.property_registry.set(property_registry);
        self.user_registry.set(user_registry);
        self.metadata.init(
            Some("BIG LeaseFi Lease".into()),
            Some("Property lease lifecycle, invoicing, and equity eligibility.".into()),
            None,
            None,
        );
    }

    // =========================================================================
    // Owner-only configuration
    // =========================================================================

    /// Sets the Escrow contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_escrow(&mut self, escrow: Address) {
        self.assert_owner();
        self.escrow.set(escrow);
    }

    /// Sets the NFT contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_nft(&mut self, nft: Address) {
        self.assert_owner();
        self.nft.set(nft);
    }

    /// Sets the PropertyRegistry contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_property_registry(&mut self, property_registry: Address) {
        self.assert_owner();
        self.property_registry.set(property_registry);
    }

    /// Sets the UserRegistry contract address by the owner
    /// @dev No zero-address guard is applied per the project's `odra.rulebook.md`
    ///      (Security: Address Handling), as Odra addresses have no default/zero value.
    pub fn set_user_registry(&mut self, user_registry: Address) {
        self.assert_owner();
        self.user_registry.set(user_registry);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /// Returns the Escrow contract address
    pub fn get_escrow_contract_address(&self) -> Address {
        *self.escrow.address()
    }

    /// Returns the NFT contract address
    pub fn get_nft_contract_address(&self) -> Address {
        *self.nft.address()
    }

    /// Returns the PropertyRegistry contract address
    pub fn get_property_registry_contract_address(&self) -> Address {
        *self.property_registry.address()
    }

    /// Returns the UserRegistry contract address
    pub fn get_user_registry_contract_address(&self) -> Address {
        *self.user_registry.address()
    }

    /// Returns lease agreement by its ID
    pub fn get_lease_agreement_by_id(&self, lease_agreement_id: &U256) -> LeaseAgreement {
        self.leases
            .get(lease_agreement_id)
            .unwrap_or_revert_with(&self.env(), Error::InvalidLeaseAgreementId)
    }

    /// Returns number of lease agreements created through this contract
    pub fn get_lease_agreements_count(&self) -> U256 {
        self.leases_count.get_or_default()
    }

    /// Returns `true` if security deposit is paid for lease agreement, `false` otherwise
    pub fn is_security_deposit_paid(&self, lease_agreement_id: &U256) -> bool {
        let lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);
        let security_deposit_invoice_id = lease_agreement.invoices_ids[0];

        self.escrow
            .get_invoice_by_id(security_deposit_invoice_id)
            .is_paid
    }

    /// Returns `true` if all invoices are paid for lease agreement, `false` if at least one invoice is not paid
    pub fn is_all_invoices_paid(&self, lease_agreement_id: &U256) -> bool {
        let lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

        for invoice_id in &lease_agreement.invoices_ids {
            if !self.escrow.get_invoice_by_id(*invoice_id).is_paid {
                return false;
            }
        }

        true
    }

    /// Returns `true` if `account` is equity-eligible for `property_id`, `false` otherwise.
    /// @dev Eligibility is not automatically time-bounded. It persists until the
    /// landlord calls `finalize_lease_agreement` for the associated lease.
    /// Finalization is a protocol-level obligation after lease expiry.
    pub fn is_equity_eligible(&self, property_id: U256, account: U256) -> bool {
        self.equity_eligible.get_or_default(&(property_id, account))
    }

    // =========================================================================
    // Lease Management
    // =========================================================================

    /// Allows to create a new lease agreement and all invoices for this agreement by a landlord
    #[odra(non_reentrant)]
    pub fn create_lease_agreement(&mut self, params: CreateLeaseAgreementParams) -> U256 {
        let landlord = self.get_caller_landlord();

        if params.tenant == landlord {
            self.env().revert(Error::EqualTenantAndLandlord);
        }

        self.assert_valid_tenant(params.tenant);

        self.validate_rent_distribution_terms(
            &params.rent_distribution_terms,
            params.tenant,
            landlord,
        );

        if params.start >= params.end {
            self.env().revert(Error::InvalidTimeframes);
        }

        let lease_duration = params.end - params.start;

        if lease_duration % ONE_MONTH_IN_MILLISECONDS != 0 {
            self.env().revert(Error::InvalidTimeframes);
        }

        let mut monthly_rent = params.monthly_rent;

        if *monthly_rent.amount() == U256::zero() {
            self.env().revert(Error::ZeroAmount);
        }

        let block_timestamp = self.env().get_block_time();
        let mut invoices_ids = vec![self.escrow.create_security_deposit_invoice(
            params.tenant,
            landlord,
            params.security_deposit,
            block_timestamp + params.invoice_validity_duration,
        )];

        for i in 0..(lease_duration / ONE_MONTH_IN_MILLISECONDS) {
            invoices_ids.push(self.escrow.create_lease_invoice(CreateLeaseInvoiceParams {
                tenant: params.tenant,
                landlord,
                rent: monthly_rent,
                property_manager: params.rent_distribution_terms.property_manager,
                property_manager_bps: params.rent_distribution_terms.property_manager_bps,
                deadline: block_timestamp
                    + (ONE_MONTH_IN_MILLISECONDS * i)
                    + params.invoice_validity_duration,
            }));
        }

        let lease_agreement_id = self.get_lease_agreements_count();

        // Mint a lease NFT to the tenant and freeze it.
        // Invariant: The NFT remains frozen for the entire lease lifecycle to prevent
        // unauthorized transfers. Only administrative actions (disputes/recovery)
        // can move it.
        let metadata = vec![(
            String::from("lease_agreement_id"),
            lease_agreement_id.to_string(),
        )];
        let tenant_wallet = self.user_registry.get_active_wallet(params.tenant);
        let token_id = self.nft.mint(tenant_wallet, metadata);
        self.nft.set_frozen_tokens(&token_id, true);

        // Mark the tenant as eligible for property equity
        if let Some(equity_option) = &params.equity_option {
            let property_id = equity_option.property_id;

            if self
                .equity_eligible
                .get_or_default(&(property_id, params.tenant))
            {
                self.env().revert(Error::TenantAlreadyEquityEligible);
            }

            let property = self.property_registry.get_property(property_id);

            if !matches!(
                property.status,
                crate::property_registry::types::PropertyStatus::Active
            ) {
                self.env().revert(Error::InvalidPropertyStatus);
            }

            if property.issuer != landlord {
                self.env().revert(Error::InvalidPropertyIssuer);
            }

            self.equity_eligible
                .set(&(property_id, params.tenant), true);

            self.env().emit_event(EquityEligibilityGranted {
                property_id,
                account: params.tenant,
            });
        }

        let lease_agreement = LeaseAgreement {
            tenant: params.tenant,
            landlord,
            rent_distribution_terms: params.rent_distribution_terms,
            equity_option: params.equity_option,
            monthly_rent,
            security_deposit: params.security_deposit,
            invoices_ids,
            start: params.start,
            end: params.end,
            is_finished: false,
            token_id,
        };

        self.leases.set(&lease_agreement_id, lease_agreement);
        self.leases_count.set(lease_agreement_id + 1);

        self.env().emit_event(LeaseAgreementCreated {
            lease_agreement_id,
            created_at: block_timestamp,
        });

        lease_agreement_id
    }

    /// Allows to finalize lease agreement between tenant and landlord when agreement has finished and won't be prolonged
    ///
    /// @dev Finalization is a protocol-level obligation after lease expiry. This
    /// is the only mechanism that removes equity eligibility for the tenant.
    /// Until this function is called, the tenant remains eligible regardless of
    /// the lease end time.
    #[odra(non_reentrant)]
    pub fn finalize_lease_agreement(
        &mut self,
        lease_agreement_id: &U256,
        security_deposit_charge: &U256,
    ) {
        let mut lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

        if lease_agreement.is_finished {
            self.env().revert(Error::LeaseAlreadyFinalized);
        }

        self.assert_caller_is_active_user(lease_agreement.landlord, Error::InvalidLandlord);

        if self.env().get_block_time() < lease_agreement.end {
            self.env().revert(Error::LeaseAgreementHasNotFinishedYet);
        }

        self.assert_all_invoices_paid(lease_agreement_id);
        self.escrow.release_security_deposit(
            lease_agreement.invoices_ids[0],
            lease_agreement.landlord,
            *security_deposit_charge,
        );

        // Clear the `equity_eligible` entry that was set at lease creation
        if let Some(ref equity_option) = lease_agreement.equity_option {
            let property_id = equity_option.property_id;
            let tenant = lease_agreement.tenant;
            self.equity_eligible.set(&(property_id, tenant), false);

            self.env().emit_event(EquityEligibilityRevoked {
                property_id,
                account: tenant,
            });
        }

        // The lease NFT remains frozen (set at creation) to prevent unauthorized transfers.
        lease_agreement.is_finished = true;

        self.leases.set(lease_agreement_id, lease_agreement);

        self.env().emit_event(LeaseAgreementFinished {
            lease_agreement_id: *lease_agreement_id,
            finished_at: self.env().get_block_time(),
        });
    }

    /// Allows to prolong lease agreement between tenant and landlord when agreement has finished and both parties decided to prolong it
    /// @dev The lease NFT is not updated during prolongation — the token persists in its current state. Lease terms are authoritative via get_lease_agreement_by_id(); the NFT metadata references the lease ID, not the terms themselves.
    #[odra(non_reentrant)]
    pub fn prolong_lease_agreement(
        &mut self,
        lease_agreement_id: &U256,
        new_end: u64,
        invoice_validity_duration: u64,
    ) {
        let mut lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

        if lease_agreement.is_finished {
            self.env().revert(Error::LeaseAlreadyFinalized);
        }

        self.assert_caller_is_active_user(lease_agreement.landlord, Error::InvalidLandlord);

        if self.env().get_block_time() < lease_agreement.end {
            self.env().revert(Error::LeaseAgreementHasNotFinishedYet);
        }

        self.assert_all_invoices_paid(lease_agreement_id);

        if lease_agreement.end >= new_end {
            self.env().revert(Error::InvalidTimeframes);
        }

        let lease_duration = new_end - lease_agreement.end;

        if lease_duration % ONE_MONTH_IN_MILLISECONDS != 0 {
            self.env().revert(Error::InvalidTimeframes);
        }

        let block_timestamp = self.env().get_block_time();

        for i in 0..(lease_duration / ONE_MONTH_IN_MILLISECONDS) {
            lease_agreement
                .invoices_ids
                .push(self.escrow.create_lease_invoice(CreateLeaseInvoiceParams {
                    tenant: lease_agreement.tenant,
                    landlord: lease_agreement.landlord,
                    rent: lease_agreement.monthly_rent,
                    property_manager: lease_agreement.rent_distribution_terms.property_manager,
                    property_manager_bps:
                        lease_agreement.rent_distribution_terms.property_manager_bps,
                    deadline: block_timestamp
                        + (ONE_MONTH_IN_MILLISECONDS * i)
                        + invoice_validity_duration,
                }));
        }

        lease_agreement.end = new_end;
        self.leases.set(lease_agreement_id, lease_agreement);

        self.env().emit_event(LeaseAgreementProlonged {
            lease_agreement_id: *lease_agreement_id,
            prolonged_at: self.env().get_block_time(),
        });
    }

    /// Moves a lease NFT to the tenant user's current active wallet after wallet recovery.
    ///
    /// @dev The caller must be the tenant user's active wallet. The NFT contract's
    /// forced transfer unfreezes frozen tokens, so this function re-freezes the
    /// lease NFT after the transfer to preserve the lease NFT invariant.
    #[odra(non_reentrant)]
    pub fn recover_lease_nft(&mut self, lease_agreement_id: &U256) {
        let lease_agreement = self.get_lease_agreement_by_id(lease_agreement_id);

        if lease_agreement.is_finished {
            self.env().revert(Error::LeaseAlreadyFinalized);
        }

        self.assert_caller_is_active_user(lease_agreement.tenant, Error::InvalidTenant);

        let new_wallet = self.user_registry.get_active_wallet(lease_agreement.tenant);
        let old_wallet = self
            .nft
            .owner_of(lease_agreement.token_id)
            .unwrap_or_revert_with(&self.env(), Error::LeaseNftOwnerNotFound);

        if old_wallet == new_wallet {
            self.env().revert(Error::LeaseNftAlreadyOwnedByActiveWallet);
        }

        self.nft.add_to_whitelist(&new_wallet);
        self.nft
            .forced_transfer(old_wallet, new_wallet, lease_agreement.token_id);
        self.nft.remove_from_whitelist(&old_wallet);
        self.nft.set_frozen_tokens(&lease_agreement.token_id, true);

        self.env().emit_event(LeaseNftRecovered {
            lease_agreement_id: *lease_agreement_id,
            token_id: lease_agreement.token_id,
            old_wallet,
            new_wallet,
        });
    }

    // =========================================================================
    // Delegation
    // =========================================================================

    delegate! {
        to self.ownable {
            fn transfer_ownership(&mut self, new_owner: &Address);
            fn renounce_ownership(&mut self);
            fn get_owner(&self) -> Address;
        }

        to self.metadata {
            fn contract_name(&self) -> Option<String>;
            fn contract_description(&self) -> Option<String>;
            fn contract_icon_uri(&self) -> Option<String>;
            fn contract_project_uri(&self) -> Option<String>;
        }

    }
}

// =============================================================================
// Internal Helpers
// =============================================================================

impl Lease {
    #[inline]
    fn assert_owner(&self) {
        self.ownable.assert_owner(&self.env().caller());
    }

    #[inline]
    fn get_caller_landlord(&self) -> U256 {
        let caller = self.env().caller();
        let user_id = self
            .user_registry
            .get_user_id_by_wallet(caller)
            .unwrap_or_revert_with(&self.env(), Error::CallerNotLandlord);

        if !self.user_registry.is_active_user(user_id)
            || !self.user_registry.is_active_wallet(user_id, caller)
            || !self.user_registry.has_landlord_role(user_id)
        {
            self.env().revert(Error::CallerNotLandlord);
        }

        user_id
    }

    #[inline]
    fn assert_caller_is_active_user(&self, user_id: U256, error: Error) {
        let caller = self.env().caller();

        if !self.user_registry.is_active_user(user_id)
            || !self.user_registry.is_active_wallet(user_id, caller)
        {
            self.env().revert(error);
        }
    }

    #[inline]
    fn assert_valid_tenant(&self, tenant: U256) {
        if !self.user_registry.is_active_user(tenant) || !self.user_registry.has_tenant_role(tenant)
        {
            self.env().revert(Error::InvalidTenant);
        }
    }

    #[inline]
    fn assert_all_invoices_paid(&self, lease_agreement_id: &U256) {
        if !self.is_all_invoices_paid(lease_agreement_id) {
            self.env().revert(Error::NotAllInvoicesArePaid);
        }
    }

    fn validate_rent_distribution_terms(
        &self,
        terms: &RentDistributionTerms,
        tenant: U256,
        landlord: U256,
    ) {
        // TODO: Can't use u16 for property_maanger_bps. Find out why and determine if we really need to type cast the constant to u32
        if terms.property_manager_bps + LEASEFI_TRANSACTION_FEE_BPS as u32
            > ONE_HUNDRED_PERCENT_BPS as u32
        {
            self.env().revert(Error::InvalidPropertyManagerBps);
        }

        match terms.property_manager {
            Some(property_manager) => {
                if property_manager == tenant
                    || property_manager == landlord
                    || !self.user_registry.is_active_user(property_manager)
                    || !self
                        .user_registry
                        .has_property_manager_role(property_manager)
                {
                    self.env().revert(Error::InvalidPropertyManager)
                }
            }
            None => {
                if terms.property_manager_bps > 0 {
                    self.env().revert(Error::InvalidPropertyManager)
                }
            }
        }
    }
}
