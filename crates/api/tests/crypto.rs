//! Tests for cryptographic signature verification.

use api::common::verify_casper_signature;
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
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
    println!("{wallet_address}");
    println!("--------------------------------------------");
    println!("2. Signature:");
    println!("{signature_hex}");
    println!("============================================\n");
}
