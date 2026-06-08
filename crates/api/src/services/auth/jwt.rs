//! JWT encoding/decoding for authentication.
//!
//! All token-issuance logic lives here so handlers do not have to reach for
//! `jsonwebtoken` directly. Extractors and middleware call [`decode_token`]
//! to validate incoming tokens.

use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{self, Algorithm, DecodingKey, EncodingKey, Header, Validation, errors::Error};
use secrecy::{ExposeSecret, SecretString};
use uuid::Uuid;

use crate::common::{
    ApiError, ApiResult, Claims, JWT_AUDIENCE, JWT_ISSUER, TokenType, UserId, UserRole,
    VerificationLevel,
};

/// Access-token TTL.
///
/// Short window (15 minutes) is paired with a 14-day rotating refresh-token
/// (see [`super::refresh`]). Keeping the access token cheap-to-replay-but-
/// expires-fast caps the blast radius of a stolen token: even without the
/// logout blocklist, an attacker has at most 15 minutes before the access
/// cookie is rejected and the refresh cookie is required to mint a new one -
/// which the legitimate user's browser revoked on next login.
pub const ACCESS_TOKEN_TTL: Duration = Duration::minutes(15);

/// Result of encoding an access token: the signed JWT and its `jti` claim.
///
/// The `jti` is returned alongside the token because the logout blocklist
/// needs to look it up directly without re-decoding the JWT.
#[derive(Debug)]
pub struct EncodedAccessToken {
    /// Signed access-token string.
    pub token: String,
    /// Unique JWT ID embedded in the token's `jti` claim.
    pub jti: Uuid,
}

/// Encodes a signed access token whose `iat` is the caller-supplied
/// `issued_at` (and `exp = issued_at + ACCESS_TOKEN_TTL`).
///
/// Exists for the one flow that must control `iat` precisely: re-issuing the
/// caller's session right after stamping `users.jwt_invalidate_before`
/// (password change). The middleware rejects a token when `iat <= cutoff` at
/// second granularity, so a token minted in the same wall-clock second as the
/// cutoff would be dead on arrival. The password-change handler passes
/// `issued_at = cutoff + 1s` so the fresh token provably clears the very
/// cutoff that kills every other session. Every other caller wants
/// "now" and should use [`encode_access_token`].
///
/// Populates every optional claim (`token_type`, `verification_level`)
/// explicitly so newly issued tokens carry the full schema; the `Option`
/// wrappers on `Claims` only serve the legacy-decode path. `jti` is required
/// because every access token issued under the current rollout must be
/// blocklist-addressable.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] if the expiration timestamp overflows
/// `usize` or if `jsonwebtoken` fails to encode the token.
#[inline]
pub fn encode_access_token_at(
    user_id: UserId,
    role: UserRole,
    verification_level: VerificationLevel,
    secret: &SecretString,
    issued_at: DateTime<Utc>,
) -> ApiResult<EncodedAccessToken> {
    let exp_at = issued_at
        .checked_add_signed(ACCESS_TOKEN_TTL)
        .ok_or_else(|| {
            ApiError::Internal("Timestamp overflow calculating JWT expiration".to_owned())
        })?;
    let exp = usize::try_from(exp_at.timestamp().max(0))
        .map_err(|_| ApiError::Internal("JWT expiration timestamp overflow".to_owned()))?;
    let iat = usize::try_from(issued_at.timestamp().max(0))
        .map_err(|_| ApiError::Internal("JWT issued-at timestamp overflow".to_owned()))?;
    let jti = Uuid::new_v4();
    let claims = Claims {
        sub: user_id,
        role,
        exp,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: Some(TokenType::Access),
        verification_level: Some(verification_level),
        jti,
        iat,
    };
    let token = jsonwebtoken::encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.expose_secret().as_bytes()),
    )
    .map_err(|e| ApiError::Internal(format!("Token encoding error: {e}")))?;
    Ok(EncodedAccessToken { token, jti })
}

/// Encodes a signed access token issued as of now.
///
/// Thin wrapper over [`encode_access_token_at`] with `issued_at = Utc::now()`,
/// which is what login, registration, wallet auth, and refresh rotation all
/// want. Only the password-change re-issue path needs the explicit-`iat`
/// variant.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] if the expiration timestamp overflows
/// `usize` or if `jsonwebtoken` fails to encode the token.
#[inline]
pub fn encode_access_token(
    user_id: UserId,
    role: UserRole,
    verification_level: VerificationLevel,
    secret: &SecretString,
) -> ApiResult<EncodedAccessToken> {
    encode_access_token_at(user_id, role, verification_level, secret, Utc::now())
}

/// Decodes and validates a JWT (signature, issuer, audience, expiration).
///
/// # Errors
///
/// Returns the underlying [`Error`] when validation
/// fails for any reason (bad signature, expired, wrong issuer/audience,
/// malformed payload).
#[inline]
pub fn decode_token(token: &str, secret: &SecretString) -> Result<Claims, Error> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[JWT_ISSUER]);
    validation.set_audience(&[JWT_AUDIENCE]);
    let data = jsonwebtoken::decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.expose_secret().as_bytes()),
        &validation,
    )?;
    Ok(data.claims)
}
