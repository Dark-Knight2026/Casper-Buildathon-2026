//! Password hashing primitives (Argon2id) and the account-password policy.
//!
//! Lives in `common` rather than a feature module because both the auth
//! endpoints (register / login / forgot-reset) and the user endpoints
//! (change / first-time set) hash and verify passwords, and the Argon2 logic
//! must exist in exactly one place - duplicating it risks the two paths
//! drifting onto different parameters, which silently breaks verification of
//! hashes produced by the other path.
//!
//! Storage format is the PHC string (`$argon2id$v=19$m=...,t=...,p=...$salt$hash`)
//! written verbatim into `users.password_hash`. The salt and all tuning
//! parameters travel inside that string, so [`verify_password`] needs only the
//! stored value and the presented plaintext - no out-of-band parameter book-keeping.

use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};

use super::errors::{ApiError, ApiResult};

/// Minimum accepted password length, in characters.
///
/// Length is the dominant strength factor, so we require 8 as the floor; the
/// policy also enforces a basic character-class mix (see
/// [`validate_password_policy`]). A strength estimator (e.g. zxcvbn) that
/// rejects weak-but-long passwords - and would let us drop the rigid
/// class rules - is a planned follow-up.
pub const MIN_PASSWORD_LEN: usize = 8;

/// Maximum accepted password length, in characters.
///
/// Not a strength rule - a sanity cap so a pathologically long input cannot be
/// fed straight into Argon2. The HTTP body limit already bounds request size;
/// this bounds the hashed value independently of that.
pub const MAX_PASSWORD_LEN: usize = 128;

/// Hashes a plaintext password into a storable PHC string.
///
/// Uses [`Argon2::default`] - Argon2id, version 0x13, with the crate's default
/// parameters (the agreed starting point). The salt is freshly generated from
/// the OS CSPRNG ([`OsRng`]) per call, so identical passwords never produce
/// identical hashes. The returned string is the only thing that needs to be
/// persisted.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] if Argon2 hashing fails. This is an internal
/// fault (e.g. parameter/memory issue), never a property of the user's input,
/// so it must not surface as a client validation error.
#[inline]
pub fn hash_password(plaintext: &str) -> ApiResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(plaintext.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|err| ApiError::Internal(format!("password hashing failed: {err}")))
}

/// Verifies a presented plaintext against a stored PHC hash in constant time.
///
/// The comparison is timing-attack resistant: Argon2's `verify_password` uses a
/// constant-time equality check internally, so a caller cannot learn how close
/// a guess was from how long the call took. Returns `false` for both a wrong
/// password and an unparseable stored hash - callers in the login path collapse
/// every failure into one generic response, so the two cases are intentionally
/// indistinguishable here.
#[inline]
#[must_use]
pub fn verify_password(plaintext: &str, stored_hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(stored_hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(plaintext.as_bytes(), &parsed)
        .is_ok()
}

/// Validates a candidate password against the account-password policy.
///
/// Enforced at registration, password change/set, and reset so a weak password
/// cannot enter through any path. The rules are:
///
/// - length between [`MIN_PASSWORD_LEN`] and [`MAX_PASSWORD_LEN`], measured in
///   characters (not bytes) so multi-byte input is judged the way a user counts it;
/// - at least one digit;
/// - at least one uppercase and one lowercase letter (Unicode-aware, so a
///   non-ASCII alphabet counts too).
///
/// # Errors
///
/// Returns [`ApiError::BadRequest`] if any rule is unmet.
#[inline]
pub fn validate_password_policy(password: &str) -> ApiResult<()> {
    let mut len = 0usize;
    let mut has_digit = false;
    let mut has_uppercase = false;
    let mut has_lowercase = false;
    for character in password.chars() {
        len += 1;
        has_digit |= character.is_ascii_digit();
        has_uppercase |= character.is_uppercase();
        has_lowercase |= character.is_lowercase();
    }

    if len < MIN_PASSWORD_LEN {
        return Err(ApiError::BadRequest(format!(
            "Password must be at least {MIN_PASSWORD_LEN} characters long"
        )));
    }
    if len > MAX_PASSWORD_LEN {
        return Err(ApiError::BadRequest(format!(
            "Password must be at most {MAX_PASSWORD_LEN} characters long"
        )));
    }
    if !has_digit {
        return Err(ApiError::BadRequest(
            "Password must contain at least one digit".to_owned(),
        ));
    }
    if !has_uppercase || !has_lowercase {
        return Err(ApiError::BadRequest(
            "Password must contain both uppercase and lowercase letters".to_owned(),
        ));
    }
    Ok(())
}
