//! Unit tests for `common::crypto::derive_account_hash`.
//!
//! The derived hash must stay byte-identical to the indexer's
//! `normalize_casper_address` (66/68-hex branch); these pin the shape and
//! invariants that matching across the two crates depends on.

use api::common::crypto;

/// ed25519 public key (66 hex), reused from the indexer address tests.
const ED25519_PUBKEY: &str = "0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca";

/// secp256k1 public key (68 hex) - the curve generator point G.
const SECP256K1_PUBKEY: &str =
    "020279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";

#[test]
fn derives_bare_64_hex_lowercase_account_hash() {
    let hash = crypto::derive_account_hash(ED25519_PUBKEY).expect("valid ed25519 key");

    assert_eq!(hash.len(), 64, "account hash must be 64 hex chars");
    assert!(
        hash.bytes().all(|b| b.is_ascii_hexdigit()),
        "must be valid hex"
    );
    assert_eq!(hash, hash.to_lowercase(), "must be lowercase");
    assert!(
        !hash.starts_with("account-hash-"),
        "the formatting tag must be stripped"
    );
}

#[test]
fn derivation_is_deterministic() {
    let first = crypto::derive_account_hash(ED25519_PUBKEY).unwrap();
    let second = crypto::derive_account_hash(ED25519_PUBKEY).unwrap();
    assert_eq!(first, second, "same key must always derive the same hash");
}

#[test]
fn derives_for_secp256k1_key() {
    let hash = crypto::derive_account_hash(SECP256K1_PUBKEY).expect("valid secp256k1 key");
    assert_eq!(hash.len(), 64);
}

#[test]
fn rejects_invalid_public_key() {
    assert!(crypto::derive_account_hash("not-a-key").is_err());
    assert!(crypto::derive_account_hash("").is_err());
}
