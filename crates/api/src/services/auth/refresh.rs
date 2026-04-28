//! Refresh-token issuance.
//!
//! The refresh token is an opaque 32-byte secret returned to the client only
//! via `Set-Cookie` and persisted only as a SHA-256 hash. SHA-256 (no salt)
//! is appropriate here because the input is high-entropy (32 random bytes,
//! 256 bits) - rainbow tables are not a threat at that entropy level. This is
//! distinct from password storage, which must use a slow KDF like argon2.

use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{Duration, Utc};
use rand::Rng;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    common::{ApiError, UserId},
    services::auth::db,
};

/// Refresh-token TTL (sliding window).
///
/// 14 days matches industry-standard "active session" expectations: the
/// browser will re-authenticate via the refresh cookie up to 14 days after
/// the last successful refresh. A user logged out for more than 14 days
/// goes through full wallet re-signing.
pub const REFRESH_TOKEN_TTL: Duration = Duration::days(14);

/// Length in bytes of the random material backing a refresh token.
///
/// 32 bytes (256 bits) makes brute-forcing the token-hash space infeasible
/// even against an offline attacker who has stolen the DB but not the
/// plaintext.
const REFRESH_TOKEN_BYTES: usize = 32;

/// Output of [`issue_login_refresh_token`].
///
/// The caller wires `plaintext` into the `Set-Cookie` header and discards
/// the in-memory copy after the response is built; the DB row holds only
/// the hash, so the plaintext must travel to the client in this struct or
/// not at all.
#[derive(Debug)]
pub struct IssuedRefreshToken {
    /// Opaque token returned to the client (base64url-no-pad encoded).
    pub plaintext: String,
    /// Family identifier, shared by all future rotations of this login.
    pub family_id: Uuid,
}

/// Issues a brand-new refresh token tied to a fresh family.
///
/// Used on login (this phase). Refresh-rotation (Phase 4.2) will introduce
/// a sibling helper that takes an existing `family_id` and links the new
/// row to its predecessor via `replaced_by`.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] if the underlying DB insert fails or the
/// expiration timestamp arithmetic overflows.
#[inline]
pub async fn issue_login_refresh_token(
    pool: &PgPool,
    user_id: UserId,
) -> Result<IssuedRefreshToken, ApiError> {
    let mut bytes = [0u8; REFRESH_TOKEN_BYTES];
    rand::rng().fill_bytes(&mut bytes);

    let plaintext = URL_SAFE_NO_PAD.encode(bytes);
    let token_hash = Sha256::digest(bytes);

    let expires_at = Utc::now()
        .checked_add_signed(REFRESH_TOKEN_TTL)
        .ok_or_else(|| {
            ApiError::Internal("Timestamp overflow calculating refresh-token expiry".to_owned())
        })?;

    let family_id = Uuid::new_v4();

    // `?` -> `From<sqlx::Error> for ApiError`: row-not-found becomes 404,
    // unique-violation (vanishingly unlikely SHA-256 collision on the active
    // index) becomes 409, every other DB failure becomes 500. Keeping the
    // mapping uniform across the codebase avoids drift between handlers.
    db::insert_refresh_token(pool, user_id, family_id, token_hash.as_slice(), expires_at).await?;

    Ok(IssuedRefreshToken {
        plaintext,
        family_id,
    })
}
