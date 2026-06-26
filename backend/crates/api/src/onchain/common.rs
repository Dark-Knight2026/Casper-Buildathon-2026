//! Shared utilities for on-chain data endpoints.

use rust_decimal::{Decimal, prelude::ToPrimitive};

use crate::common::{ApiError, ApiResult};

/// Number of decimal places in the BIG token U256 value.
pub const TOKEN_DECIMALS: u32 = 18;

/// Converts a raw U256 text value (minimal units, decimals=18) to a human-readable f64.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] if `raw` is not a valid decimal string.
#[inline]
pub fn to_human_f64(raw: &str) -> ApiResult<f64> {
    let divisor = Decimal::from(10u64.pow(TOKEN_DECIMALS));
    let dec = raw
        .parse::<Decimal>()
        .map_err(|_| ApiError::Internal(format!("invalid token amount: {raw}")))?;
    Ok((dec / divisor).to_f64().unwrap_or(0.0))
}
