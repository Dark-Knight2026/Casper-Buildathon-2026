#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;
extern crate self as leasefi_contracts;

pub mod common;
pub mod constants;
pub mod escrow;
pub mod ico;
pub mod interfaces;
pub mod lease;
pub mod nft;
pub mod roles;
pub mod staking;
pub mod tailor_coin;
pub mod treasury;
pub mod vesting;

#[cfg(test)]
pub(crate) mod mocks;

#[cfg(test)]
mod tests;
