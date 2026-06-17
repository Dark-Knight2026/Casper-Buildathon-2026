use odra::prelude::*;

/// External interface to an already-deployed Styks oracle contract.
/// This crate does not implement or deploy that oracle in production.
///
/// `get_twap_price` returns the CSPR/USD TWAP as a fixed-point `u64` with
/// **5 fractional digits** (USD amount × 100_000). For example, $0.004342 is
/// encoded as `434`. This matches the Styks price-feed parser, not the
/// Chainlink 8-decimal convention.
#[odra::external_contract]
pub trait StyksPriceFeedOracle {
    fn get_twap_price(&self, id: &String) -> Option<u64>;
}
