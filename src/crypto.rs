use casper_types::{AsymmetricType, PublicKey, Signature, crypto};
use thiserror::Error;

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
/// This function takes a public key, a signature, and a message, all in their string representation
/// (hex for key and signature), and verifies if the signature corresponds to the message signed
/// by the private key associated with the provided public key.
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
pub fn verify_casper_signature(
    public_key_hex: &str,
    signature_hex: &str,
    message: &str,
) -> Result<bool, CryptoError> {
    let public_key = PublicKey::from_hex(public_key_hex)
        .map_err(|e| CryptoError::CasperError(format!("Invalid public key: {:?}", e)))?;

    let signature = Signature::from_hex(signature_hex)
        .map_err(|e| CryptoError::CasperError(format!("Invalid signature: {:?}", e)))?;

    let message_bytes = message.as_bytes();

    match crypto::verify(message_bytes, &signature, &public_key) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use casper_types::{AsymmetricType, SecretKey};
    use rand::RngCore;

    fn generate_random_ed25519() -> (SecretKey, PublicKey) {
        let mut rng = rand::rng();
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);

        let secret_key = SecretKey::ed25519_from_bytes(bytes).unwrap();
        let public_key = PublicKey::from(&secret_key);
        (secret_key, public_key)
    }

    #[test]
    fn test_verify_valid_signature() {
        let (secret_key, public_key) = generate_random_ed25519();

        let message = "Login to LeaseFi";
        let message_bytes = message.as_bytes();

        let signature = crypto::sign(message_bytes, &secret_key, &public_key);

        let pk_hex = public_key.to_hex();
        let sig_hex = signature.to_hex();

        let result = verify_casper_signature(&pk_hex, &sig_hex, message);

        assert!(
            result.is_ok(),
            "Function returned error: {:?}",
            result.err()
        );
        assert!(result.unwrap(), "Signature should be valid");
    }

    #[test]
    fn test_verify_invalid_message() {
        let (secret_key, public_key) = generate_random_ed25519();

        let message = "Original Message";

        let signature = crypto::sign(message.as_bytes(), &secret_key, &public_key);

        let pk_hex = public_key.to_hex();
        let sig_hex = signature.to_hex();

        let result = verify_casper_signature(&pk_hex, &sig_hex, "Fake Message");

        assert!(result.is_ok());
        assert!(
            !result.unwrap(),
            "Signature should be invalid for different message"
        );
    }

    #[test]
    fn generate_data_for_local_tests() {
        let fixed_bytes = [1u8; 32];
        let secret_key = SecretKey::ed25519_from_bytes(fixed_bytes).unwrap();
        let public_key = PublicKey::from(&secret_key);

        let wallet_address = public_key.to_hex();

        let message_from_server = "Sign this message to login to LeaseFi. Nonce: XJyoR9G2a4HQfjdx";

        let message_bytes = message_from_server.as_bytes();

        let signature = crypto::sign(message_bytes, &secret_key, &public_key);
        let signature_hex = signature.to_hex();

        println!("\n============================================");
        println!("1. Wallet Address:");
        println!("{}", wallet_address);
        println!("--------------------------------------------");
        println!("2. Signature:");
        println!("{}", signature_hex);
        println!("============================================\n");
    }
}
