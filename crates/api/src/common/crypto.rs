//! Cryptographic utilities for Casper signature verification.

use casper_types::{AsymmetricType, PublicKey, Signature, crypto};
use thiserror::Error;

/// Length of `Ed25519` public key in hex format (01 prefix + 32 bytes = 66 hex chars).
pub const CASPER_ED25519_PUBKEY_HEX_LEN: usize = 66;

/// Length of `Secp256k1` public key in hex format (02 prefix + 33 bytes = 68 hex chars).
pub const CASPER_SECP256K1_PUBKEY_HEX_LEN: usize = 68;

/// Custom error types for cryptographic operations.
#[derive(Debug, Error)]
pub enum CryptoError {
    /// Error when failing to decode a hexadecimal string.
    #[error("Failed to decode hex: {0}")]
    HexError(#[from] hex::FromHexError),

    /// Error related to Casper-specific type parsing or operations.
    #[error("Failed to parse Casper type: {0}")]
    CasperError(String),

    /// Represents a scenario where the signature itself is malformed or verification cannot proceed.
    #[error("Signature verification failed")]
    InvalidSignature,
}

/// Verifies a Casper-compatible cryptographic signature.
///
/// Takes a public key, signature, and message as hex strings.
/// Verifies if the signature was created by the private key matching the public key.
///
/// # Security
///
/// This function uses constant-time comparison internally through the `ed25519-dalek` crate,
/// which relies on the `subtle` crate for timing-attack resistant operations. This prevents
/// timing side-channel attacks that could leak information about valid signatures.
///
/// # Arguments
///
/// * `public_key_hex` - The hexadecimal string representation of the public key.
/// * `signature_hex` - The hexadecimal string representation of the signature.
/// * `message` - The raw message string that was signed.
///
/// # Returns
///
/// * `Ok(true)` if the signature is valid.
/// * `Ok(false)` if the signature is invalid but the input format was correct.
/// * `Err(CryptoError)` if parsing the keys or signature fails.
///
/// # Errors
///
/// Returns `CryptoError::CasperError` if:
/// - The public key hex string is invalid
/// - The signature hex string is invalid
#[inline]
pub fn verify_casper_signature(
    public_key_hex: &str,
    signature_hex: &str,
    message: &str,
) -> Result<bool, CryptoError> {
    let public_key = PublicKey::from_hex(public_key_hex)
        .map_err(|e| CryptoError::CasperError(format!("Invalid public key: {e:?}")))?;

    let signature = Signature::from_hex(signature_hex)
        .map_err(|e| CryptoError::CasperError(format!("Invalid signature: {e:?}")))?;

    let message_bytes = message.as_bytes();

    match crypto::verify(message_bytes, &signature, &public_key) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}
