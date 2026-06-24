//! Unit tests for password hashing (`api::common::password`).
//!
//! Pure CPU - no database or Redis - so these run in the default test profile
//! without the `integration` feature.

use api::common::password;

/// Newly produced hashes must meet the OWASP Argon2id cost floor (64 MiB, 2
/// iterations, 1 lane). The PHC string carries the params verbatim, so a
/// regression to the crate default (`m=19456`) would show right in the hash.
#[test]
fn hash_password_uses_owasp_argon2_cost() {
    let hash = password::hash_password("Sufficient1Pass").expect("hashing a valid password");
    assert!(
        hash.contains("$argon2id$") && hash.contains("m=65536,t=2,p=1"),
        "Argon2id must meet the OWASP minimum cost; got: {hash}",
    );
}

/// A hash verifies against its own plaintext and rejects a wrong one.
#[test]
fn verify_password_round_trips() {
    let hash = password::hash_password("Sufficient1Pass").expect("hashing a valid password");
    assert!(password::verify_password("Sufficient1Pass", &hash));
    assert!(!password::verify_password("WrongPassword9", &hash));
}
