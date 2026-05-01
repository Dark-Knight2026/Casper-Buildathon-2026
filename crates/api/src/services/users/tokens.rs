//! Email-change opaque-token generation and verification.
//!
//! Both [`super::handlers::request_email_change`] and
//! [`super::handlers::confirm_email_change`] route through this module
//! so the hash algorithm and plaintext encoding live in exactly one
//! place. The contract is symmetric: the same byte sequence (the
//! base64url-no-pad plaintext) is hashed on generation and on
//! verification - if those choices ever diverge between caller and
//! callee, every confirmation silently 401s. Centralizing them removes
//! that risk.
//!
//! ## Relationship to [`crate::services::auth::refresh`]
//!
//! `auth::refresh` solves the same generation+hash problem for the
//! refresh-cookie flow: 32 random bytes, base64url-no-pad encoding,
//! SHA-256 hashed for storage. Its `generate_refresh_token` is
//! file-local and the verification side inlines
//! `Sha256::digest(cookie.value().as_bytes())`. The two modules
//! deliberately stay separate today because they differ in:
//!
//! - **Storage**: refresh hashes land in Postgres
//!   (`refresh_tokens.token_hash`); email-change hashes land in Redis
//!   under `email_change:{user_id}` with a 24h TTL.
//! - **Lifetime / rotation**: refresh tokens rotate on every use and
//!   carry a `family_id` for reuse-detection; email-change tokens are
//!   strictly one-shot, with `GETDEL` taking the slot atomically.
//! - **Carrier**: refresh travels in `Set-Cookie`; email-change
//!   travels in an email body.
//!
//! When a third opaque-token use case appears (e.g. password reset,
//! magic-link login), both this module and `auth::refresh` should fold
//! into a shared `common::tokens` helper rather than acquire a third
//! near-duplicate. Until then, the duplication is intentional:
//! premature unification would force a single struct/API onto three
//! flows whose actual semantics still differ.

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use rand::Rng;
use sha2::{Digest, Sha256};

/// Length in bytes of the random material backing the token.
///
/// 32 bytes (256 bits) yields a base64url-no-pad encoding of exactly
/// 43 chars; kept matched against `EMAIL_CHANGE_TOKEN_LEN` in
/// [`super::models`] so the request-layer length check rejects
/// truncated tokens before they reach Redis.
const TOKEN_BYTES: usize = 32;

/// Freshly-generated token together with its persisted hash.
///
/// `plaintext` travels to the user via the email link; `hash` lands in
/// Redis. The struct enforces that callers always have both: no path
/// can persist a token without also being able to hand its plaintext
/// to the email layer.
#[derive(Debug)]
pub struct EmailChangeToken {
    /// Opaque token sent inside the email body (43 base64url-no-pad
    /// chars).
    pub plaintext: String,
    /// SHA-256 of `plaintext.as_bytes()`, suitable for Redis
    /// persistence.
    pub hash: [u8; 32],
}

/// Generates a fresh token and its hash in one step.
#[inline]
#[must_use]
pub fn generate() -> EmailChangeToken {
    let mut bytes = [0u8; TOKEN_BYTES];
    rand::rng().fill_bytes(&mut bytes);
    let plaintext = URL_SAFE_NO_PAD.encode(bytes);
    let hash: [u8; 32] = Sha256::digest(plaintext.as_bytes()).into();
    EmailChangeToken { plaintext, hash }
}

/// Hashes a presented token for lookup against the persisted Redis
/// value.
///
/// Must use the same algorithm and the same byte representation
/// (`presented.as_bytes()`) as [`generate`] - any divergence silently
/// turns valid confirmations into 401s. Both call sites live in
/// [`super::handlers`], so the contract is locally checkable.
#[inline]
#[must_use]
pub fn hash_presented(presented: &str) -> [u8; 32] {
    Sha256::digest(presented.as_bytes()).into()
}
