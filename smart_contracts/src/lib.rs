#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;
extern crate self as leasefi_contracts;

pub mod big_coin;
pub mod common;
pub mod compliance_policy;
pub mod constants;
pub mod escrow;
pub mod ico;
pub mod interfaces;
pub mod investor_registry;
pub mod lease;
pub mod nft;
pub mod property_registry;
pub mod roles;
pub mod staking;
pub mod treasury;
pub mod vesting;

#[cfg(test)]
pub(crate) mod mocks;

#[cfg(test)]
mod tests;
