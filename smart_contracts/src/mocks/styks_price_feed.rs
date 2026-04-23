#![allow(dead_code)]

use odra::prelude::*;

/// Test-only mock used by ICO tests to simulate the external Styks oracle.
/// This module is gated behind `#[cfg(test)]` in `src/lib.rs` and is not deployable in production.
#[odra::module]
pub struct StyksPriceFeed {
    twap_price: Var<u64>,
}

#[odra::module]
impl StyksPriceFeed {
    pub fn set_twap_price(&mut self, twap_price: u64) {
        self.twap_price.set(twap_price);
    }

    // Signature should be exact like this to mimic Styks Oracle Price Feed contract's behavior
    #[allow(unused_variables)]
    pub fn get_twap_price(&self, id: String) -> Option<u64> {
        self.twap_price.get()
    }
}
