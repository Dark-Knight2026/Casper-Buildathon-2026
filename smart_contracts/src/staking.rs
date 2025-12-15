use odra::{casper_types::U256, prelude::*};

use crate::treasury::errors::Error;

#[odra::module(errors = Error)]
pub struct Staking {}

#[odra::module]
impl Staking {
    pub fn deposit_rewards(&mut self, _amount: U256) {}
}

pub mod errors {
    use odra::prelude::*;

    #[odra::odra_error]
    pub enum Error {}
}
