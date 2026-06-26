//! Shared input-validation helpers for Casper addresses.
//!
//! Both functions run at the HTTP boundary, before any Redis or DB I/O, so
//! malformed input fails with a 400 without consuming nonces or rate-limit
//! slots. They live here (not in a handler) because more than one feature
//! module validates the same address shapes.

use crate::common::{
    ApiError, ApiResult, CASPER_ED25519_PUBKEY_HEX_LEN, CASPER_SECP256K1_PUBKEY_HEX_LEN,
};

/// Validates and normalizes a Casper account hash (64 hex characters, no prefix).
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the address is not exactly 64 hex characters.
#[inline]
pub fn validate_account(account: &str) -> ApiResult<String> {
    let account = account.to_ascii_lowercase();
    if account.len() != 64 || !account.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApiError::BadRequest(
            "Address must be 64 hex characters (account hash without prefix)".to_owned(),
        ));
    }
    Ok(account)
}

/// Validates the shape of a Casper wallet address (public key).
///
/// Accepts Ed25519 (66 hex) or Secp256k1 (68 hex) lengths, entirely
/// hexadecimal. Shared by the wallet-login and wallet-link paths so both
/// reject malformed input identically before any Redis or DB I/O - a 400
/// here never consumes a nonce or a rate-limit slot. The caller lowercases
/// the address first (Redis keys are case-sensitive).
///
/// # Errors
///
/// Returns `ApiError::BadRequest` if the length is neither
/// [`CASPER_ED25519_PUBKEY_HEX_LEN`] nor [`CASPER_SECP256K1_PUBKEY_HEX_LEN`],
/// or if any character is not a hex digit.
#[inline]
pub fn validate_wallet_address(wallet: &str) -> ApiResult<()> {
    let len = wallet.len();
    if (len != CASPER_ED25519_PUBKEY_HEX_LEN && len != CASPER_SECP256K1_PUBKEY_HEX_LEN)
        || !wallet.chars().all(|c| c.is_ascii_hexdigit())
    {
        return Err(ApiError::BadRequest("Invalid wallet address".to_owned()));
    }
    Ok(())
}
