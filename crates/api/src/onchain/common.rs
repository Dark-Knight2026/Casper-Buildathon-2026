//! Shared utilities for on-chain data endpoints.

use rust_decimal::{Decimal, prelude::ToPrimitive};

use crate::common::ApiError;

/// Number of decimal places in the BIG token U256 value.
pub const TOKEN_DECIMALS: u32 = 18;

/// Converts a raw U256 text value (minimal units, decimals=18) to a human-readable f64.
#[inline]
#[must_use]
pub fn to_human_f64(raw: &str) -> f64 {
    let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));
    let dec = raw.parse::<Decimal>().unwrap_or(Decimal::ZERO) / divisor;
    dec.to_f64().unwrap_or(0.0)
}

/// Validates an account hash string (64 hex characters, no prefix).
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the string is not exactly 64 hex characters.
#[inline]
pub fn validate_account(account: &str) -> Result<String, ApiError> {
    let account = account.to_ascii_lowercase();
    if account.len() != 64 || !account.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApiError::BadRequest(
            "Address must be 64 hex characters (account hash without prefix)".to_owned(),
        ));
    }
    Ok(account)
}
