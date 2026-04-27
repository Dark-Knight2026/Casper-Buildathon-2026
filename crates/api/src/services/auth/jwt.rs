//! JWT encoding/decoding for authentication.
//!
//! All token-issuance logic lives here so handlers do not have to reach for
//! `jsonwebtoken` directly. Extractors and middleware call [`decode_token`]
//! to validate incoming tokens.

use chrono::{Duration, Utc};
use jsonwebtoken::{self, Algorithm, DecodingKey, EncodingKey, Header, Validation, errors::Error};
use secrecy::{ExposeSecret, SecretString};
use uuid::Uuid;

use crate::common::{
    ApiError, Claims, JWT_AUDIENCE, JWT_ISSUER, TokenType, UserId, UserRole, VerificationLevel,
};

/// Access-token TTL.
///
/// Kept at 24h while refresh-token rotation does not yet exist;
/// shortens this to 15 minutes once `/auth/refresh` is in place.
pub const ACCESS_TOKEN_TTL: Duration = Duration::hours(24);

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

/// Encodes a signed access token for the given user.
///
/// Populates every optional claim (`token_type`, `verification_level`, `jti`)
/// explicitly so newly issued tokens carry the full schema; the `Option`
/// wrappers on `Claims` only serve the legacy-decode path.
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
) -> Result<EncodedAccessToken, ApiError> {
    let exp_at = Utc::now()
        .checked_add_signed(ACCESS_TOKEN_TTL)
        .ok_or_else(|| {
            ApiError::Internal("Timestamp overflow calculating JWT expiration".to_owned())
        })?;
    let exp = usize::try_from(exp_at.timestamp().max(0))
        .map_err(|_| ApiError::Internal("JWT expiration timestamp overflow".to_owned()))?;
    let jti = Uuid::new_v4();
    let claims = Claims {
        sub: user_id,
        role,
        exp,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: Some(TokenType::Access),
        verification_level: Some(verification_level),
        jti: Some(jti),
    };
    let token = jsonwebtoken::encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.expose_secret().as_bytes()),
    )
    .map_err(|e| ApiError::Internal(format!("Token encoding error: {e}")))?;
    Ok(EncodedAccessToken { token, jti })
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
