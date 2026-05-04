//! Wallet-based authentication: nonce generation and signature login.

use core::str::FromStr;
use std::sync::Arc;

use axum::{
    Json,
    extract::{Query, State},
};
use axum_extra::extract::CookieJar;
use rand::{RngExt, distr::Alphanumeric};
use secrecy::ExposeSecret;
use sha2::{Digest, Sha256};
use time::Duration as CookieDuration;

use crate::{
    common::{
        self, ApiError, ApiResult, AppState, CASPER_ED25519_PUBKEY_HEX_LEN,
        CASPER_SECP256K1_PUBKEY_HEX_LEN, UserInfo, UserRole,
    },
    services::{
        auth::{
            self, cookies, jwt,
            models::{LoginRequest, LoginResponse, NonceRequest, NonceResponse},
            refresh,
        },
        users,
    },
};

// `GET /api/v1/auth/nonce`
//
/// Generates a cryptographic nonce for login challenge-response.
///
/// The nonce is securely stored in Redis with a short expiration time (5 minutes).
/// The user must sign the generated message using their wallet's private key to authenticate.
///
/// # Arguments
///
/// * `state` - The application state containing the Redis connection.
/// * `payload` - Query parameters containing the user's wallet address.
///
/// # Returns
///
/// * `Ok(Json<NonceResponse>)` - JSON containing the nonce and the message to sign.
///
/// # Errors
///
/// Returns `ApiError::Internal` if Redis operations fail.
#[utoipa::path(
  get,
  path = "/nonce",
  tag = "Auth",
  params(
        ("wallet_address" = String, Query, description = "The wallet address (public key)")),
  responses(
        (status = 200, description = "Nonce generated successfully", body = NonceResponse),
        (status = 400, description = "Invalid wallet address length"),
        (status = 500, description = "Internal server error")
    )
)]
#[inline]
pub async fn get_nonce(
    State(state): State<Arc<AppState>>,
    Query(payload): Query<NonceRequest>,
) -> ApiResult<Json<NonceResponse>> {
    // Validate wallet address length and hex content before touching Redis.
    let wallet = payload.wallet_address.to_ascii_lowercase();
    let len = wallet.len();
    if (len != CASPER_ED25519_PUBKEY_HEX_LEN && len != CASPER_SECP256K1_PUBKEY_HEX_LEN)
        || !wallet.chars().all(|c| c.is_ascii_hexdigit())
    {
        return Err(ApiError::BadRequest("Invalid wallet address".to_owned()));
    }

    // Generate a random string (16 characters)
    let random_string: String = rand::rng()
        .sample_iter(&Alphanumeric)
        .take(16)
        .map(char::from)
        .collect();

    // Create a message that the user will sign
    let message = format!("Sign this message to login to LeaseFi. Nonce: {random_string}");

    // Store nonce in Redis (key uses lowercase address for case-insensitive lookup)
    state
        .redis
        .save_nonce(&wallet, &message)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to save nonce");
            ApiError::Internal(format!("Failed to save nonce: {e}"))
        })?;

    tracing::info!(
        event = "nonce_generated",
        wallet_address = %wallet,
        "Login nonce generated"
    );

    Ok(Json(NonceResponse {
        nonce: random_string,
        message,
    }))
}

// `POST /api/v1/auth/login`
//
/// Authenticates a user by verifying their signature against a stored nonce.
///
/// 1. Retrieves the previously generated nonce from Redis using the wallet address.
/// 2. Verifies the provided signature against the stored message and public key.
/// 3. If valid, creates or updates the user record in the database.
/// 4. Mints a short-lived access JWT and an opaque refresh token.
/// 5. Returns both via `Set-Cookie` (HttpOnly+SameSite=Strict), and a
///    body containing only the user profile.
///
/// # Arguments
///
/// * `state` - The application state.
/// * `payload` - JSON payload containing the wallet address and signature.
///
/// # Returns
///
/// `(CookieJar, Json<LoginResponse>)` - jar carries `access_token`
/// (Path=/, Max-Age=15m) and `refresh_token` (Path=/api/v1/auth,
/// Max-Age=14d) cookies; body has user info only.
///
/// # Errors
///
/// Returns:
/// - `ApiError::BadRequest` if wallet address length is invalid or signature format is wrong
/// - `ApiError::Unauthorized` if signature or nonce is invalid
/// - `ApiError::Internal` for DB/Redis failures or timestamp overflow
#[utoipa::path(
    post,
    path = "/login",
    tag = "Auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = LoginResponse),
        (status = 400, description = "Invalid wallet address or signature format"),
        (status = 401, description = "Invalid signature or expired nonce"),
        (status = 500, description = "Internal server error")
    )
)]
#[inline]
#[allow(clippy::too_many_lines)]
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> ApiResult<(CookieJar, Json<LoginResponse>)> {
    // Normalize to lowercase for consistent Redis key lookup.
    let wallet_address = payload.wallet_address.to_ascii_lowercase();

    // Validation: Check wallet address length (Ed25519 or Secp256k1) and hex content.
    let len = wallet_address.len();
    if (len != CASPER_ED25519_PUBKEY_HEX_LEN && len != CASPER_SECP256K1_PUBKEY_HEX_LEN)
        || !wallet_address.chars().all(|c| c.is_ascii_hexdigit())
    {
        tracing::warn!(
            length = len,
            expected_ed25519 = CASPER_ED25519_PUBKEY_HEX_LEN,
            expected_secp256k1 = CASPER_SECP256K1_PUBKEY_HEX_LEN,
            "Invalid wallet address"
        );
        return Err(ApiError::BadRequest("Invalid wallet address".to_owned()));
    }

    // Per-wallet rate limit: reject early if this wallet has too many recent
    // failed login attempts, preventing nonce-DoS attacks.
    if state
        .redis
        .is_login_rate_limited(&wallet_address)
        .await
        .unwrap_or(false)
    {
        tracing::warn!(
            event = "login_rate_limited",
            wallet_address = %wallet_address,
            "Too many failed login attempts"
        );
        return Err(ApiError::TooManyRequests(
            "Too many failed login attempts, try again later".to_owned(),
        ));
    }

    // Atomically consume nonce from Redis (one-time use via GETDEL).
    // This prevents replay attacks and eliminates the TOCTOU race window
    // that existed with separate GET + DEL commands.
    //
    // Threat-model tradeoff: consuming the nonce before signature verification
    // means an attacker who knows a wallet address can call `/auth/login` with
    // a garbage signature to invalidate the legitimate user's nonce. The user
    // must then request a new nonce and retry. This is an accepted trade-off:
    // TOCTOU elimination is more critical than the nonce-invalidation vector,
    // because TOCTOU allows actual replay attacks while nonce-DoS only causes
    // a retry. Mitigation: per-wallet rate limiting on failed logins (above).
    let Some(stored_nonce) = state.redis.take_nonce(&wallet_address).await.map_err(|e| {
        tracing::error!(error = %e, "Failed to get nonce");
        ApiError::Internal(format!("Failed to get nonce: {e}"))
    })?
    else {
        // Count nonce-miss as a login failure so an attacker who knows
        // a wallet address can't probe `/auth/login` indefinitely without
        // ever paying for a `/auth/nonce` round-trip. Without this, the
        // per-wallet rate-limit gate on the next request is never
        // reached. Best-effort: a Redis hiccup at this point should not
        // mask the upstream nonce-miss with a 500.
        let _ = state.redis.record_login_failure(&wallet_address).await;
        tracing::warn!(
            event = "login_failed",
            reason = "nonce_expired",
            wallet_address = %wallet_address,
            "Nonce not found or expired"
        );
        return Err(ApiError::Unauthorized(
            "Nonce not found or expired".to_owned(),
        ));
    };

    // Security: Verify Signature and RETURN ERROR if invalid
    let is_valid = common::verify_casper_signature(
        &wallet_address,
        payload.signature.expose_secret(),
        &stored_nonce,
    )
    .map_err(|e| {
        tracing::warn!(
            event = "login_failed",
            reason = "invalid_signature_format",
            wallet_address = %wallet_address,
            error = ?e,
            "Signature verification error"
        );
        ApiError::BadRequest("Invalid signature format".to_owned())
    })?;

    if !is_valid {
        // Record failure for per-wallet rate limiting (best-effort).
        let _ = state.redis.record_login_failure(&wallet_address).await;
        tracing::warn!(
            event = "login_failed",
            reason = "signature_mismatch",
            wallet_address = %wallet_address,
            "Signature verification failed"
        );
        return Err(ApiError::Unauthorized("Invalid signature".to_owned()));
    }

    // Validate the optional `role` against the self-register whitelist before
    // touching the DB. Default to `tenant` when the client did not supply one.
    // `role` is honored only on first insert; on repeat logins the DB ignores
    // it (ON CONFLICT ... DO UPDATE SET last_login_at = NOW()). We still
    // validate on every request so a bogus role fails fast with 400 rather
    // than being silently dropped.
    let requested_role = payload.role.clone().unwrap_or(UserRole::Tenant);
    if !requested_role.is_self_registerable() {
        tracing::warn!(
            event = "login_failed",
            reason = "invalid_role",
            wallet_address = %wallet_address,
            role = %requested_role,
            "Role not allowed for self-registration"
        );
        return Err(ApiError::BadRequest(
            "Role not allowed for self-registration".to_owned(),
        ));
    }

    // Since the users table requires an email address, we generate a unique one using a hash.
    // Using `SHA-256` hash prevents collisions that could occur with simple address truncation.
    let hash = Sha256::digest(wallet_address.as_bytes());
    let placeholder_email = format!("wallet_{}@leasefi.local", hex::encode(&hash[..20]));

    // If a user with this wallet_address already exists, return it. If not, create a new one.
    let user_record = auth::upsert_user_by_wallet(
        &state.db,
        &placeholder_email,
        &wallet_address,
        requested_role,
    )
    .await?;
    let user_role = UserRole::from_str(&user_record.role).unwrap_or(UserRole::Unknown);

    let encoded = jwt::encode_access_token(
        user_record.id,
        user_role.clone(),
        user_record.verification_level,
        &state.config.jwt_secret,
    )?;

    // Issue a brand-new refresh token + family for this login session. The
    // plaintext is returned to the client only via the `refresh_token` cookie
    // below; the DB row keeps just the SHA-256 hash. Failures (DB outage,
    // unique-violation on the astronomically-unlikely hash collision) abort
    // the login because without a refresh token the user could not survive
    // past the 15-minute access window.
    let issued_refresh = refresh::issue_login_refresh_token(&state.db, user_record.id).await?;

    // Fetch the full profile for the response. `upsert_user_by_wallet` returns
    // only the minimal fields needed to mint a JWT (id, role, verification);
    // the public response body needs joined data (active_leases_count) and the
    // wallet_address cache, both of which live on `users` after the
    // upsert/trigger has run.
    let profile = users::fetch_user_profile(&state.db, user_record.id).await?;

    // Build the cookies. `cookie_secure` from config decides whether the
    // browser refuses to send the cookies over plain HTTP - false in dev so
    // the login works on http://localhost, true in any HTTPS deployment.
    let access_cookie = cookies::build_access_cookie(
        encoded.token,
        CookieDuration::seconds(jwt::ACCESS_TOKEN_TTL.num_seconds()),
        state.config.cookie_secure,
    );
    let refresh_cookie = cookies::build_refresh_cookie(
        issued_refresh.plaintext,
        CookieDuration::seconds(refresh::REFRESH_TOKEN_TTL.num_seconds()),
        state.config.cookie_secure,
    );
    let jar = CookieJar::new().add(access_cookie).add(refresh_cookie);

    tracing::info!(
        event = "user_login",
        user_id = %user_record.id,
        wallet_address = %wallet_address,
        refresh_family = %issued_refresh.family_id,
        "User logged in successfully"
    );

    Ok((
        jar,
        Json(LoginResponse {
            user: UserInfo {
                id: profile.id,
                role: user_role,
                wallet_address: profile.wallet_address,
                status: profile.status,
                email: profile.email,
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone: profile.phone,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                is_profile_complete: profile.is_profile_complete,
                active_leases_count: profile.active_leases_count,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
            },
        }),
    ))
}
