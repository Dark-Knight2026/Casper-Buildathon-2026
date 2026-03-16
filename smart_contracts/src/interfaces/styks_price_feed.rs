use odra::prelude::*;

/// External interface to an already-deployed Styks oracle contract.
/// This crate does not implement or deploy that oracle in production.
#[odra::external_contract]
pub trait StyksPriceFeedOracle {
    fn get_twap_price(&self, id: &String) -> Option<u64>;
}
