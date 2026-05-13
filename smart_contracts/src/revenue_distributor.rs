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
        pub investory_registry: Address,
        /// Revenue payout currency
        /// @dev `None` means native CSPR. `Some(address)` means CEP-18 token such as BIG.
        pub payout_currency: Option<Address>,
    }

    #[odra::odra_type]
    pub struct HolderRevenueState {
        /// Revenue accrued but not yet claimed
        pub pending_revenue: U256,
        /// Holder snapshot of the global revenue-per-token accumulator.
        pub revenue_per_token: U256,
    }
}

// =============================================================================
// Events
// =============================================================================

// =============================================================================
// Errors
// =============================================================================

// =============================================================================
// Contract
// =============================================================================
