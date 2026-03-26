//! Shared utilities for on-chain data endpoints.

use rust_decimal::{Decimal, prelude::ToPrimitive};

/// Number of decimal places in the BIG token U256 value.
pub const TOKEN_DECIMALS: u32 = 18;

// Re-export from crate::common to avoid duplicate definitions.
pub use crate::common::validate_account;

/// Converts a raw U256 text value (minimal units, decimals=18) to a human-readable f64.
#[inline]
#[must_use]
pub fn to_human_f64(raw: &str) -> f64 {
    let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));
    let dec = raw.parse::<Decimal>().unwrap_or(Decimal::ZERO) / divisor;
    dec.to_f64().unwrap_or(0.0)
}
