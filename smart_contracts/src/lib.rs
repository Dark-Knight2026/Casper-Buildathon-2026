#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;

pub mod common;
pub mod constants;
pub mod escrow;
pub mod lease;
pub mod nft;
pub mod roles;
pub mod staking;
pub mod tailor_coin;
pub mod treasury;
