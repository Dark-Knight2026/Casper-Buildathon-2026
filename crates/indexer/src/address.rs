//! Address normalization utilities for the Casper Network indexer.
//!
//! Converts all address formats to a canonical 64-character lowercase hex
//! account hash, matching the format returned by cspr.cloud.

use casper_types::{AsymmetricType, PublicKey};

use crate::error::{IndexerError, IndexerResult};

/// Normalize a Casper address to a 64-character lowercase hex account hash.
///
/// Handles the following input formats:
/// - Empty string -> returned as-is (streaming caller placeholder)
/// - `account-hash-XXXX` -> strip prefix, lowercase
/// - `hash-XXXX` -> strip prefix, lowercase
/// - 64 hex chars -> lowercase (already an account hash)
/// - 66/68 hex chars -> public key -> blake2b -> account hash
///
/// # Errors
///
/// Returns [`IndexerError::Parse`] if the input does not match any known format.
#[inline]
pub fn normalize_to_account_hash(raw: &str) -> IndexerResult<String> {
    // Empty string: streaming caller placeholder, pass through.
    if raw.is_empty() {
        return Ok(String::new());
    }

    // "account-hash-XXXX" prefix from CES Key::to_formatted_string()
    if let Some(hex) = raw.strip_prefix("account-hash-") {
        return validate_hex64(hex, raw);
    }

    // "hash-XXXX" prefix (some CES contexts)
    if let Some(hex) = raw.strip_prefix("hash-") {
        return validate_hex64(hex, raw);
    }

    let len = raw.len();

    // 64 hex chars: already a normalized account hash
    if len == 64 && raw.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Ok(raw.to_lowercase());
    }

    // 66 or 68 hex chars: ed25519 (01 + 64) or secp256k1 (02 + 66) public key
    if (len == 66 || len == 68) && raw.bytes().all(|b| b.is_ascii_hexdigit()) {
        let pk = PublicKey::from_hex(raw)
            .map_err(|e| IndexerError::Parse(format!("invalid public key '{raw}': {e}")))?;
        let account_hash = pk.to_account_hash();
        // AccountHash::to_formatted_string() returns "account-hash-XXXX"
        let formatted = account_hash.to_formatted_string();
        let hex = formatted
            .strip_prefix("account-hash-")
            .unwrap_or(&formatted);
        return Ok(hex.to_lowercase());
    }

    Err(IndexerError::Parse(format!(
        "unrecognized address format (len={len}): '{raw}'"
    )))
}

/// Validate that `hex` is exactly 64 lowercase hex characters.
/// Returns the lowercased hex on success, or a parse error referencing `raw_input`.
#[inline]
fn validate_hex64(hex: &str, raw_input: &str) -> IndexerResult<String> {
    if hex.len() == 64 && hex.bytes().all(|b| b.is_ascii_hexdigit()) {
        Ok(hex.to_lowercase())
    } else {
        Err(IndexerError::Parse(format!(
            "invalid account hash after prefix strip (len={}, expected 64 hex): '{raw_input}'",
            hex.len(),
        )))
    }
}
