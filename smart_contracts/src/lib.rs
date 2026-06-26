#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;
extern crate self as leasefi_contracts;

pub mod big_coin;
pub mod common;
pub mod constants;
pub mod escrow;
pub mod lease;
pub mod nft;
pub mod property_registry;
pub mod roles;
pub mod treasury;
pub mod user_registry;

#[cfg(test)]
mod tests;
