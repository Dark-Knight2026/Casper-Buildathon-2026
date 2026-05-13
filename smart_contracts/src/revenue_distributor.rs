use odra::{
    casper_types::{U256, U512},
    prelude::*,
    uints::ToU512,
    ContractRef,
};
use odra_modules::cep18_token::Cep18ContractRef;

use crate::{
    investor_registry::InvestorRegistryContractRef,
    property_fraction_token::PropertyFractionTokenContractRef,
    property_registry::PropertyRegistryContractRef,
    revenue_distributor::{
        errors::Error,
        events::RevenueDistributorInitialized,
        types::{HolderRevenueState, RevenueDistributorInitParams},
    },
};

// =============================================================================
// Types
// =============================================================================

pub mod types {
    use odra::{casper_types::U256, prelude::*};

    #[odra::odra_type]
    pub struct RevenueDistributorInitParams {
        /// Property represented by the connected `PropertyFractionToken`.
        pub property_id: U256,
        /// Property ownership token used to calculate holder revenue shares.
        pub property_token: Address,
        /// Registry used to confirm property lifecycle and distributor assignment.
        pub property_registry: Address,
        /// Registry used to verify whether a holder may claim revenue.
        pub investor_registry: Address,
        /// Revenue payout currency
        /// @dev `None` means native CSPR. `Some(address)` means CEP-18 token such as BIG.
        pub payout_currency: Option<Address>,
    }

    #[derive(Default)]
    #[odra::odra_type]
    pub struct HolderRevenueState {
        /// Revenue accrued but not yet claimed
        pub pending_revenue: U256,
        /// Holder snapshot of the global revenue-per-token accumulator.
        pub revenue_per_token_paid: U256,
    }
}

// =============================================================================
// Events
// =============================================================================

pub mod events {
    use odra::{casper_types::U256, prelude::*};

    #[odra::event]
    pub struct RevenueDistributorInitialized {
        pub property_id: U256,
        pub property_token: Address,
        pub property_registry: Address,
        pub investor_registry: Address,
        pub payout_currency: Option<Address>,
    }
}

// =============================================================================
// Errors
// =============================================================================

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {}
}

// =============================================================================
// Contract
// =============================================================================

#[odra::module(
  errors = Error,
  events = []
)]
pub struct RevenueDistributor {
    property_id: Var<U256>,
    payout_currency: Var<Option<Address>>,
    property_token: External<PropertyFractionTokenContractRef>,
    property_registry: External<PropertyRegistryContractRef>,
    investor_registry: External<InvestorRegistryContractRef>,
    holder_revenue: Mapping<Address, HolderRevenueState>,
    revenue_per_token_stored: Var<U256>,
    // TODO: Should we be adding the BIG token contract ref here?
}

#[odra::module]
impl RevenueDistributor {
    // =============================================================================
    // Initialization
    // =============================================================================

    pub fn init(&mut self, params: RevenueDistributorInitParams) {
        self.property_id.set(params.property_id);
        self.payout_currency.set(params.payout_currency);
        self.property_token.set(params.property_token);
        self.property_registry.set(params.property_registry);
        self.investor_registry.set(params.investor_registry);

        self.env().emit_event(RevenueDistributorInitialized {
            property_id: params.property_id,
            property_token: params.property_token,
            property_registry: params.property_registry,
            investor_registry: params.investor_registry,
            payout_currency: params.payout_currency,
        });
    }

    // =============================================================================
    // View Functions
    // =============================================================================

    /// Returns the property ID this distributor serves.
    pub fn get_property_id(&self) -> U256 {
        self.property_id.get_or_default()
    }

    /// Returns the property token contract address.
    pub fn get_property_token_contract(&self) -> Address {
        *self.property_token.address()
    }

    /// Returns the property registry contract address.
    pub fn get_property_registry_contract(&self) -> Address {
        *self.property_registry.address()
    }

    /// Returns the investor registry contract address.
    pub fn get_investor_registry_contract(&self) -> Address {
        *self.investor_registry.address()
    }

    /// Returns the payout currency.
    /// @dev `None` means native CSPR. `Some(address) means CEP-18 token.
    pub fn get_payout_currency(&self) -> Option<Address> {
        self.payout_currency.get_or_default()
    }

    /// Returns the global revenue-per-token accumulator.
    pub fn get_revenue_per_token_stored(&self) -> U256 {
        self.revenue_per_token_stored.get_or_default()
    }

    /// Returns stored revenue state for `account`.
    pub fn get_holder_revenue(&self, account: Address) -> HolderRevenueState {
        self.holder_revenue.get_or_default(&account)
    }

}
