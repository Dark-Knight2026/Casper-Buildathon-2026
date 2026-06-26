//! Opaque single-use token generation shared across flows.
//!
//! Hosts the canonical "32 random bytes -> base64url-no-pad ->
//! SHA-256 hash" recipe used wherever the system needs an unguessable
//! token that travels through one channel (email body, signed URL,
//! response payload) and is later redeemed against a stored hash.
//! Current callers are the email-change flow ([`super::super::services::users::handlers`])
//! and the email-verification flow under `services/auth`. New use
//! cases (password reset, magic-link login) should reuse [`generate`]
//! and [`hash_presented`] verbatim rather than reintroduce a
//! near-duplicate module.
//!
//! ## Relationship to [`crate::services::auth::refresh`]
//!
//! `auth::refresh` solves the same generation+hash problem for the
//! refresh-cookie flow with a file-local helper. It deliberately
//! stays separate today because refresh tokens differ in storage
//! (Postgres `refresh_tokens.token_hash` versus Redis with a TTL),
//! lifetime (rotation + `family_id` reuse-detection versus strict
//! one-shot `GETDEL`), and carrier (`Set-Cookie` versus email body).
//! Once those flows converge, `auth::refresh::generate_refresh_token`
//! folds into this module too.

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use rand::Rng;
use sha2::{Digest, Sha256};

/// Length in bytes of the random material backing the token.
///
/// 32 bytes (256 bits) yields a base64url-no-pad encoding of exactly
/// 43 chars. Call sites that validate token length on the request
/// boundary should match this constant so truncated tokens are
/// rejected before they reach the hash compare.
pub const TOKEN_BYTES: usize = 32;

/// Length in chars of a `URL_SAFE_NO_PAD` encoding of [`TOKEN_BYTES`]
/// random bytes.
///
/// Exposed so request-layer validation can reject malformed tokens
/// (wrong length) cheaply, before any constant-time compare runs.
pub const TOKEN_STR_LEN: usize = 43;

/// Freshly-generated token together with its persisted hash.
///
/// `plaintext` travels to the user via whichever side channel the
/// caller controls (email body, response payload, signed URL);
/// `hash` lands in storage. The struct ties them together so no path
/// can persist a token without also having its plaintext - that would
/// silently turn every redemption into a 401.
#[derive(Debug)]
pub struct OpaqueToken {
    /// Opaque token string sent to the user (43 base64url-no-pad
    /// chars).
    pub plaintext: String,
    /// SHA-256 of `plaintext.as_bytes()`, suitable for storage in
    /// Redis or Postgres.
    pub hash: [u8; 32],
}

/// Generates a fresh token and its hash in one step.
#[inline]
#[must_use]
pub fn generate() -> OpaqueToken {
    let mut bytes = [0u8; TOKEN_BYTES];
    rand::rng().fill_bytes(&mut bytes);
    let plaintext = URL_SAFE_NO_PAD.encode(bytes);
    let hash: [u8; 32] = Sha256::digest(plaintext.as_bytes()).into();
    OpaqueToken { plaintext, hash }
}

/// Hashes a presented token for lookup against the persisted value.
///
/// Must use the same algorithm and the same byte representation
/// (`presented.as_bytes()`) as [`generate`] - any divergence silently
/// turns valid confirmations into 401s.
#[inline]
#[must_use]
pub fn hash_presented(presented: &str) -> [u8; 32] {
    Sha256::digest(presented.as_bytes()).into()
}
