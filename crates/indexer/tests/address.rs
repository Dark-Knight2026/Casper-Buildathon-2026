//! Tests for `normalize_to_account_hash` — all address format branches.

use indexer::address::normalize_casper_address;

#[test]
fn empty_string_passes_through() {
    assert_eq!(normalize_casper_address("").unwrap(), "");
}

#[test]
fn strips_account_hash_prefix() {
    // 64 hex chars after prefix
    let input = "account-hash-aAbBcCdDeEfF00112233445566778899aAbBcCdDeEfF00112233445566778899";
    let expected = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
    assert_eq!(normalize_casper_address(input).unwrap(), expected);
}

#[test]
fn strips_hash_prefix() {
    // 64 hex chars after prefix
    let input = "hash-aAbBcCdDeEfF00112233445566778899aAbBcCdDeEfF00112233445566778899";
    let expected = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
    assert_eq!(normalize_casper_address(input).unwrap(), expected);
}

#[test]
fn rejects_short_hex_after_account_hash_prefix() {
    // 58 chars after prefix - not 64
    assert!(
        normalize_casper_address(
            "account-hash-aabbccddeeff00112233445566778899aabbccddeeff00112233445566"
        )
        .is_err()
    );
}

#[test]
fn rejects_non_hex_after_hash_prefix() {
    // 64 chars but not valid hex
    assert!(
        normalize_casper_address(
            "hash-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
        )
        .is_err()
    );
}

#[test]
fn already_normalized_64_hex() {
    let input = "aAbBcCdDeEfF00112233445566778899aAbBcCdDeEfF00112233445566778899";
    let expected = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
    assert_eq!(normalize_casper_address(input).unwrap(), expected);
}

#[test]
fn ed25519_public_key_66_hex() {
    // ed25519 key: 01 prefix + 32 bytes (64 hex)
    let pk_hex = "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca";
    let result = normalize_casper_address(pk_hex).unwrap();
    assert_eq!(result.len(), 64, "account hash must be 64 hex chars");
    assert!(
        result.bytes().all(|b| b.is_ascii_hexdigit()),
        "must be valid hex"
    );
    assert_eq!(result, result.to_lowercase());
}

#[test]
fn secp256k1_public_key_68_hex() {
    // Casper secp256k1 key: 02 (algo tag) + 33-byte compressed point (66 hex) = 68
    // Using the secp256k1 generator point G (always a valid curve point).
    let pk_hex = "020279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
    assert_eq!(pk_hex.len(), 68);
    let result = normalize_casper_address(pk_hex).unwrap();
    assert_eq!(result.len(), 64, "account hash must be 64 hex chars");
    assert!(
        result.bytes().all(|b| b.is_ascii_hexdigit()),
        "must be valid hex"
    );
}

#[test]
fn idempotent_for_64_hex() {
    let input = "f41cc7556db59b20d42dbb0d186f481b83d4e3e033ca7758adfe43e4e02901ea";
    let first = normalize_casper_address(input).unwrap();
    let second = normalize_casper_address(&first).unwrap();
    assert_eq!(first, second, "normalization must be idempotent");
}

#[test]
fn rejects_garbage_input() {
    assert!(normalize_casper_address("not-a-valid-address").is_err());
}

#[test]
fn rejects_wrong_length_hex() {
    // 60 hex chars - too short, not 64/66/68
    assert!(
        normalize_casper_address("aabbccddeeff00112233445566778899aabbccddeeff001122334455")
            .is_err()
    );
}
