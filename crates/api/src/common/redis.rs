//! Redis client wrapper with typed operations.

use redis::{AsyncCommands, Client, RedisError, aio::ConnectionManager};
use uuid::Uuid;

/// Time-to-live for login nonce in Redis (5 minutes).
const LOGIN_NONCE_TTL: u64 = 300;

/// Maximum failed login attempts per wallet address before rate limiting.
const LOGIN_FAIL_MAX_ATTEMPTS: u64 = 5;

/// Time window for failed login rate limiting (60 seconds).
const LOGIN_FAIL_WINDOW_SECS: u64 = 60;

/// Time-to-live for a pending email-change token (24 hours).
///
/// Generous on purpose: the link is delivered by email and may sit in a
/// promotions folder or queued mailbox for several hours before the user
/// even opens it. A shorter window would silently 401 confirmations from
/// users who acted in good faith but only checked their mail the next
/// morning.
const EMAIL_CHANGE_TTL: u64 = 24 * 60 * 60;

/// Rolling window for the email-change rate limit (24 hours).
///
/// Matches `EMAIL_CHANGE_TTL` so the user cannot churn the
/// `email_change:{user_id}` slot to silently invalidate previous links and
/// flood the new mailbox with confirmation emails.
const EMAIL_CHANGE_RATE_WINDOW_SECS: u64 = 24 * 60 * 60;

/// Time-to-live for a pending email-verification token (24 hours).
///
/// Mirrors [`EMAIL_CHANGE_TTL`] for the same reason: the link arrives by
/// email and may sit unread for hours before the user clicks it. A shorter
/// window would 404 good-faith confirmations.
const VERIFY_EMAIL_TTL: u64 = 24 * 60 * 60;

/// Maximum verify-email send requests per user within
/// [`VERIFY_EMAIL_SEND_PER_MINUTE_WINDOW_SECS`].
///
/// Tight burst guard: one send per minute stops a user (or a stolen cookie)
/// from hammering the resend button and flooding the mailbox.
const VERIFY_EMAIL_SEND_PER_MINUTE_MAX: u64 = 1;

/// Short rolling window for the verify-email send rate limit (60 seconds).
const VERIFY_EMAIL_SEND_PER_MINUTE_WINDOW_SECS: u64 = 60;

/// Maximum verify-email send requests per user within
/// [`VERIFY_EMAIL_SEND_PER_HOUR_WINDOW_SECS`].
///
/// Hourly cap layered over the per-minute guard: absorbs a handful of
/// legitimate retries (typo'd address, lost mail) while still bounding the
/// total volume one account can trigger in an hour.
const VERIFY_EMAIL_SEND_PER_HOUR_MAX: u64 = 5;

/// Long rolling window for the verify-email send rate limit (1 hour).
const VERIFY_EMAIL_SEND_PER_HOUR_WINDOW_SECS: u64 = 60 * 60;

/// Maximum avatar uploads per user within
/// [`AVATAR_UPLOAD_RATE_WINDOW_SECS`].
///
/// Sized to absorb a power-user iterating through several crops/variants
/// (avatars get re-uploaded surprisingly often during onboarding) while
/// still capping the bandwidth a single account can burn through the
/// stub-or-S3 backend. The 10/h threshold also blocks a stolen-cookie
/// attacker from using the endpoint as a write-amplification primitive
/// against the storage backend.
const AVATAR_UPLOAD_MAX_ATTEMPTS: u64 = 10;

/// Rolling window for the avatar-upload rate limit (1 hour).
const AVATAR_UPLOAD_RATE_WINDOW_SECS: u64 = 60 * 60;

/// Rolling window for the role-change rate limit (24 hours).
///
/// Role changes are rare, auditable events - most users never trigger one,
/// and the few who do should not be churning between roles. Capping at
/// "one successful change per day" matches the audit/security expectation
/// without locking a user out of recovery: a 24h wait is acceptable
/// friction for a security-sensitive operation that also clears refresh
/// tokens and forces a re-login.
const ROLE_CHANGE_RATE_WINDOW_SECS: u64 = 24 * 60 * 60;

/// Maximum role-change requests per user within
/// [`ROLE_CHANGE_RATE_WINDOW_SECS`].
///
/// Threshold of 1 means: any prior successful change in the rolling 24h
/// window blocks the next attempt. Two-way changes
/// (tenant -> landlord -> tenant) require waiting out the window or an
/// operator clearing the slot manually; the test surface uses
/// [`RedisStore::role_change_attempts_key`] to reset between assertions.
const ROLE_CHANGE_MAX_ATTEMPTS: u64 = 1;

/// A convenience type alias for `Result` returned from Redis client.
pub type RedisResult<T> = Result<T, RedisError>;

/// Wrapper around a shared Redis connection for nonce operations.
#[derive(Debug, Clone)]
pub struct RedisStore {
    conn: ConnectionManager,
    /// Per-user cap on email-change requests within the 24h rolling window.
    ///
    /// Sourced from `ServerConfig::email_change_max_attempts` so staging or
    /// integration runs can raise it without recompiling. Default 3.
    email_change_max_attempts: u64,
}

impl RedisStore {
    /// Creates a new `RedisStore` with a shared, auto-reconnecting connection.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the initial connection fails.
    #[inline]
    pub async fn new(client: Client, email_change_max_attempts: u64) -> RedisResult<Self> {
        let conn = client.get_connection_manager().await?;
        Ok(Self {
            conn,
            email_change_max_attempts,
        })
    }

    /// Saves a nonce message for the given wallet address.
    ///
    /// # Arguments
    ///
    /// * `wallet_address` - The wallet address to associate with the nonce
    /// * `message` - The full message to be signed
    /// * `ttl_seconds` - Time-to-live in seconds
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails or the operation fails.
    #[inline]
    pub async fn save_nonce(&self, wallet_address: &str, message: &str) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::nonce_key(wallet_address);
        conn.set_ex(&key, message, LOGIN_NONCE_TTL).await
    }

    /// Atomically retrieves and deletes the nonce for the given wallet address.
    ///
    /// Uses Redis `GETDEL` (6.2+) to eliminate the TOCTOU race window that
    /// exists with separate GET + DEL commands.
    ///
    /// Returns `None` if the nonce doesn't exist or has expired.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn take_nonce(&self, wallet_address: &str) -> RedisResult<Option<String>> {
        let mut conn = self.conn.clone();
        let key = Self::nonce_key(wallet_address);
        redis::cmd("GETDEL").arg(&key).query_async(&mut conn).await
    }

    /// Checks if Redis is reachable.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection or ping fails.
    #[inline]
    pub async fn ping(&self) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        redis::cmd("PING").query_async::<()>(&mut conn).await
    }

    /// Returns `true` if the wallet has exceeded the failed login attempt limit.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_login_rate_limited(&self, wallet_address: &str) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::login_fail_key(wallet_address);
        let count = conn.get::<_, Option<u64>>(&key).await?;
        Ok(count.is_some_and(|c| c >= LOGIN_FAIL_MAX_ATTEMPTS))
    }

    /// Records a failed login attempt for the given wallet address.
    ///
    /// Uses `INCR` + conditional `EXPIRE` so the counter resets after the
    /// rate-limit window elapses.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_login_failure(&self, wallet_address: &str) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::login_fail_key(wallet_address);
        let count = conn.incr::<_, _, u64>(&key, 1u64).await?;
        // Set TTL only on the first failure to start the window.
        if count == 1 {
            conn.expire::<_, ()>(&key, LOGIN_FAIL_WINDOW_SECS.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Adds a JWT `jti` to the access-token blocklist for `ttl_seconds`.
    ///
    /// `ttl_seconds` MUST be derived from the JWT's `exp - now` clamp at
    /// the call site so the key naturally evicts the moment the token
    /// would have expired anyway. Calls with `ttl_seconds == 0` are a
    /// no-op: the JWT clock has already invalidated the token and a
    /// zero-TTL `SET EX` is a Redis error.
    ///
    /// Stored value is a single byte; only key existence matters.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn blocklist_jwt(&self, jti: Uuid, ttl_seconds: u64) -> RedisResult<()> {
        if ttl_seconds == 0 {
            return Ok(());
        }
        let mut conn = self.conn.clone();
        let key = Self::jwt_blocklist_key(jti);
        conn.set_ex(&key, 1u8, ttl_seconds).await
    }

    /// Returns `true` if the given `jti` is currently on the blocklist.
    ///
    /// Called from `require_auth` on every protected request - kept to a
    /// single `EXISTS` so the per-request cost stays in low-millisecond
    /// territory even under load.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails. Callers in the auth
    /// path are expected to fail-open (log + skip) so a Redis outage does
    /// not take down the entire authenticated surface.
    #[inline]
    pub async fn is_jwt_blocklisted(&self, jti: Uuid) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::jwt_blocklist_key(jti);
        let exists = conn.exists::<_, i32>(&key).await?;
        Ok(exists != 0)
    }

    /// Persists a pending email-change request keyed by `user_id`.
    ///
    /// The stored value is `{hex_hash}:{new_email}`. Hashing means a Redis
    /// dump never exposes a usable confirmation token; storing the new
    /// email alongside the hash means the apply step does not need a
    /// second round-trip back to the request handler.
    ///
    /// Keying on `user_id` (rather than the token hash) is deliberate: a
    /// fresh request from the same user atomically overwrites the
    /// previous slot, instantly invalidating the old link. The trade-off
    /// is documented at the request handler.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn save_email_change_token(
        &self,
        user_id: Uuid,
        token_hash: &[u8; 32],
        new_email: &str,
    ) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::email_change_key(user_id);
        let value = format!("{}:{new_email}", hex::encode(token_hash));
        conn.set_ex(&key, value, EMAIL_CHANGE_TTL).await
    }

    /// Atomically retrieves and deletes the pending email-change for
    /// `user_id`, returning the `(token_hash, new_email)` pair.
    ///
    /// Uses `GETDEL` to eliminate the TOCTOU window between confirmation
    /// and apply: a malformed retry cannot exhaust the slot twice.
    ///
    /// Returns `Ok(None)` when the slot is empty (no pending request, or
    /// already consumed) or when the stored payload fails to parse - the
    /// latter is treated as "no usable token" and surfaced as 401 by the
    /// handler so a corrupt payload behaves identically to a missing one.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn take_email_change_token(
        &self,
        user_id: Uuid,
    ) -> RedisResult<Option<([u8; 32], String)>> {
        let mut conn = self.conn.clone();
        let key = Self::email_change_key(user_id);
        let raw = redis::cmd("GETDEL")
            .arg(&key)
            .query_async::<Option<String>>(&mut conn)
            .await?;
        Ok(raw.and_then(|payload| {
            let (hex_hash, new_email) = payload.split_once(':')?;
            let mut hash = [0u8; 32];
            hex::decode_to_slice(hex_hash, &mut hash).ok()?;
            Some((hash, new_email.to_owned()))
        }))
    }

    /// Drops a pending email-change request without consuming it through
    /// the apply path.
    ///
    /// Used by `request_email_change` to roll the slot back when the
    /// follow-up `mailer.send` fails: the user never received the link,
    /// so leaving the token live for 24 hours just keeps the slot
    /// hostage and the next legitimate attempt would overwrite it
    /// silently anyway.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails. Callers treat this
    /// as best-effort and log-warn rather than masking the upstream
    /// failure that triggered the rollback.
    #[inline]
    pub async fn clear_email_change_token(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::email_change_key(user_id);
        conn.del::<_, ()>(&key).await
    }

    /// Reverses a previous `record_email_change_attempt` after the
    /// downstream send fails.
    ///
    /// Uses `DECR`; when the resulting count drops to zero (or below,
    /// defensively) the key is deleted entirely so the next legitimate
    /// attempt starts a fresh `EMAIL_CHANGE_RATE_WINDOW_SECS` window.
    /// Leaving a `0`-valued key with the original TTL would silently
    /// shrink the rolling window for the next request - the user would
    /// keep losing time off their 24h cap on every transient failure.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails. Callers treat this
    /// as best-effort: the rate-limit overcounting it cleans up is a
    /// UX issue, not a security one.
    #[inline]
    pub async fn decrement_email_change_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::email_change_attempts_key(user_id);
        let count = conn.decr::<_, _, i64>(&key, 1i64).await?;
        if count <= 0 {
            conn.del::<_, ()>(&key).await?;
        }
        Ok(())
    }

    /// Returns `true` when the user has already exceeded the configured
    /// email-change attempt cap within the rolling window.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_email_change_rate_limited(&self, user_id: Uuid) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::email_change_attempts_key(user_id);
        let count = conn.get::<_, Option<u64>>(&key).await?;
        Ok(count.is_some_and(|c| c >= self.email_change_max_attempts))
    }

    /// Records one email-change attempt against the rolling window.
    ///
    /// `INCR` + conditional `EXPIRE` mirrors `record_login_failure`: the
    /// TTL is set only on the first attempt so the window starts when the
    /// user begins, not on every retry.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_email_change_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::email_change_attempts_key(user_id);
        let count = conn.incr::<_, _, u64>(&key, 1u64).await?;
        if count == 1 {
            conn.expire::<_, ()>(&key, EMAIL_CHANGE_RATE_WINDOW_SECS.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Persists a pending email-verification token keyed by `user_id`.
    ///
    /// Mirrors [`save_email_change_token`] but stores only `hex(token_hash)`
    /// with no trailing payload: verification does not carry a new email,
    /// it just flips `email_verified`. Hashing means a Redis dump never
    /// exposes a usable confirmation token.
    ///
    /// Keying on `user_id` (not the hash) means a fresh send atomically
    /// overwrites the previous slot, instantly invalidating the old link -
    /// consistent with email-change.
    ///
    /// [`save_email_change_token`]: Self::save_email_change_token
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn save_verify_email_token(
        &self,
        user_id: Uuid,
        token_hash: &[u8; 32],
    ) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::verify_email_key(user_id);
        conn.set_ex(&key, hex::encode(token_hash), VERIFY_EMAIL_TTL)
            .await
    }

    /// Atomically retrieves and deletes the pending verification token for
    /// `user_id`, returning the stored 32-byte hash.
    ///
    /// Uses `GETDEL` to close the TOCTOU window: a malformed retry cannot
    /// consume the slot twice. Returns `Ok(None)` when the slot is empty
    /// (no pending request, already consumed, or expired) or when the
    /// stored value fails to decode - the handler treats a corrupt payload
    /// identically to a missing one (404).
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn take_verify_email_token(&self, user_id: Uuid) -> RedisResult<Option<[u8; 32]>> {
        let mut conn = self.conn.clone();
        let key = Self::verify_email_key(user_id);
        let raw = redis::cmd("GETDEL")
            .arg(&key)
            .query_async::<Option<String>>(&mut conn)
            .await?;
        Ok(raw.and_then(|hex_hash| {
            let mut hash = [0u8; 32];
            hex::decode_to_slice(&hex_hash, &mut hash).ok()?;
            Some(hash)
        }))
    }

    /// Drops a pending verification token without consuming it through the
    /// confirm path.
    ///
    /// Used by the send handler to roll the slot back when `mailer.send`
    /// fails permanently: the user never received the link, so leaving the
    /// token live for 24 hours just keeps the slot hostage.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails. Callers treat this as
    /// best-effort and log-warn rather than masking the upstream failure.
    #[inline]
    pub async fn clear_verify_email_token(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::verify_email_key(user_id);
        conn.del::<_, ()>(&key).await
    }

    /// Returns `true` when the user has exceeded *either* the per-minute or
    /// the per-hour verify-email send limit.
    ///
    /// Read-only (no `INCR`): the send handler calls this as a pre-flight
    /// check before the `email IS NULL` guard, so a wallet-only user who
    /// taps the button never burns a counter slot. The `OR` across
    /// both windows is the point - the per-minute guard catches bursts the
    /// hourly cap alone would let through.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_verify_email_send_rate_limited(&self, user_id: Uuid) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let minute_key = Self::verify_email_send_minute_key(user_id);
        let hour_key = Self::verify_email_send_hour_key(user_id);
        let minute_count = conn.get::<_, Option<u64>>(&minute_key).await?;
        let hour_count = conn.get::<_, Option<u64>>(&hour_key).await?;
        Ok(
            minute_count.is_some_and(|c| c >= VERIFY_EMAIL_SEND_PER_MINUTE_MAX)
                || hour_count.is_some_and(|c| c >= VERIFY_EMAIL_SEND_PER_HOUR_MAX),
        )
    }

    /// Records one verify-email send attempt against *both* rolling windows.
    ///
    /// `INCR` + conditional `EXPIRE` per key mirrors
    /// [`record_email_change_attempt`], applied to the minute and hour
    /// counters in turn: the TTL is set only on the first increment so each
    /// window starts when the user begins, not on every retry.
    ///
    /// [`record_email_change_attempt`]: Self::record_email_change_attempt
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_verify_email_send_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let minute_key = Self::verify_email_send_minute_key(user_id);
        let hour_key = Self::verify_email_send_hour_key(user_id);
        let minute_count = conn.incr::<_, _, u64>(&minute_key, 1u64).await?;
        if minute_count == 1 {
            conn.expire::<_, ()>(
                &minute_key,
                VERIFY_EMAIL_SEND_PER_MINUTE_WINDOW_SECS.cast_signed(),
            )
            .await?;
        }
        let hour_count = conn.incr::<_, _, u64>(&hour_key, 1u64).await?;
        if hour_count == 1 {
            conn.expire::<_, ()>(
                &hour_key,
                VERIFY_EMAIL_SEND_PER_HOUR_WINDOW_SECS.cast_signed(),
            )
            .await?;
        }
        Ok(())
    }

    /// Reverses a previous `record_verify_email_send_attempt` after the
    /// downstream send fails permanently.
    ///
    /// `DECR` on both counters; a counter that drops to zero (or below,
    /// defensively) is deleted so the next attempt starts a fresh window
    /// rather than inheriting a shrunken TTL - mirrors
    /// [`decrement_email_change_attempt`]. Only called on
    /// [`EmailError::Permanent`](crate::providers::EmailError::Permanent):
    /// a transient failure keeps the counters bumped because the queued
    /// retry will still deliver the mail.
    ///
    /// [`decrement_email_change_attempt`]: Self::decrement_email_change_attempt
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails. Callers treat this as
    /// best-effort: the overcounting it cleans up is a UX issue, not a
    /// security one.
    #[inline]
    pub async fn decrement_verify_email_send_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let minute_key = Self::verify_email_send_minute_key(user_id);
        let hour_key = Self::verify_email_send_hour_key(user_id);
        let minute_count = conn.decr::<_, _, i64>(&minute_key, 1i64).await?;
        if minute_count <= 0 {
            conn.del::<_, ()>(&minute_key).await?;
        }
        let hour_count = conn.decr::<_, _, i64>(&hour_key, 1i64).await?;
        if hour_count <= 0 {
            conn.del::<_, ()>(&hour_key).await?;
        }
        Ok(())
    }

    /// Returns `true` when the user has already exceeded
    /// [`AVATAR_UPLOAD_MAX_ATTEMPTS`] within the rolling window.
    ///
    /// Mirrors the email-change rate-limit pattern: handlers `?`-propagate
    /// the Redis error so a transport outage surfaces as 500 rather than
    /// silently bypassing the limit.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_avatar_upload_rate_limited(&self, user_id: Uuid) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::avatar_upload_attempts_key(user_id);
        let count = conn.get::<_, Option<u64>>(&key).await?;
        Ok(count.is_some_and(|c| c >= AVATAR_UPLOAD_MAX_ATTEMPTS))
    }

    /// Records one avatar-upload attempt against the rolling window.
    ///
    /// `INCR` + conditional `EXPIRE` mirrors `record_login_failure` and
    /// `record_email_change_attempt`: the TTL is set only on the first
    /// attempt so the window starts when the user begins, not on every
    /// retry. No decrement counterpart is needed because the avatar
    /// handler has no rollback path - either the upload completes (counter
    /// stays bumped) or it fails before this is called.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_avatar_upload_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::avatar_upload_attempts_key(user_id);
        let count = conn.incr::<_, _, u64>(&key, 1u64).await?;
        if count == 1 {
            conn.expire::<_, ()>(&key, AVATAR_UPLOAD_RATE_WINDOW_SECS.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Generates the Redis key for a wallet address nonce.
    ///
    /// Exposed `pub` (rather than `pub(crate)`) so integration tests can
    /// reach the canonical key format without literalizing
    /// `"nonce:{wallet}"` themselves - any future change to the format
    /// then breaks the tests at compile-time, instead of silently making
    /// them read a non-existent key and assert on `TTL = -2`.
    #[inline]
    #[must_use]
    pub fn nonce_key(wallet_address: &str) -> String {
        format!("nonce:{wallet_address}")
    }

    /// Generates the Redis key for failed login tracking.
    #[inline]
    fn login_fail_key(wallet_address: &str) -> String {
        format!("login_fail:{wallet_address}")
    }

    /// Generates the Redis key for a blocklisted access-token `jti`.
    #[inline]
    fn jwt_blocklist_key(jti: Uuid) -> String {
        format!("jwt_blocklist:{jti}")
    }

    /// Generates the Redis key for a pending email-change token.
    #[inline]
    fn email_change_key(user_id: Uuid) -> String {
        format!("email_change:{user_id}")
    }

    /// Generates the Redis key for the email-change rate-limit counter.
    #[inline]
    fn email_change_attempts_key(user_id: Uuid) -> String {
        format!("email_change_attempts:{user_id}")
    }

    /// Generates the Redis key for a pending email-verification token.
    ///
    /// Exposed `pub` (rather than module-private) so integration tests can
    /// reach the canonical key format - the verify-flow tests assert TTL
    /// and overwrite behaviour directly. Any future rename then breaks
    /// tests at compile-time, not silently at runtime.
    #[inline]
    #[must_use]
    pub fn verify_email_key(user_id: Uuid) -> String {
        format!("verify:email:{user_id}")
    }

    /// Generates the Redis key for the per-minute verify-email send counter.
    ///
    /// Exposed `pub` so the rate-limit tests can delete it to simulate the
    /// 60-second window having elapsed without sleeping in the test.
    #[inline]
    #[must_use]
    pub fn verify_email_send_minute_key(user_id: Uuid) -> String {
        format!("verify:email:send:1m:{user_id}")
    }

    /// Generates the Redis key for the per-hour verify-email send counter.
    ///
    /// Exposed `pub` so the rate-limit tests can delete it to simulate the
    /// 1-hour window having elapsed without sleeping in the test.
    #[inline]
    #[must_use]
    pub fn verify_email_send_hour_key(user_id: Uuid) -> String {
        format!("verify:email:send:1h:{user_id}")
    }

    /// Generates the Redis key for the avatar-upload rate-limit counter.
    ///
    /// Exposed `pub` (rather than module-private) so integration tests
    /// can reach the canonical key format - matches the
    /// [`role_change_attempts_key`] pattern. Any future rename of the
    /// key format then breaks tests at compile-time, not silently at
    /// runtime against a stale hardcoded string.
    ///
    /// [`role_change_attempts_key`]: Self::role_change_attempts_key
    #[inline]
    #[must_use]
    pub fn avatar_upload_attempts_key(user_id: Uuid) -> String {
        format!("avatar_upload_attempts:{user_id}")
    }

    /// Returns `true` when the user has already exceeded
    /// [`ROLE_CHANGE_MAX_ATTEMPTS`] within the rolling window.
    ///
    /// Mirrors the email-change and avatar-upload rate-limit pattern -
    /// handlers `?`-propagate the Redis error so a transport outage
    /// surfaces as 500 rather than silently bypassing the limit.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_role_change_rate_limited(&self, user_id: Uuid) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::role_change_attempts_key(user_id);
        let count = conn.get::<_, Option<u64>>(&key).await?;
        Ok(count.is_some_and(|c| c >= ROLE_CHANGE_MAX_ATTEMPTS))
    }

    /// Records one successful role change against the rolling window.
    ///
    /// `INCR` + conditional `EXPIRE` mirrors the other rate-limit
    /// counters (login, email-change, avatar). No decrement counterpart
    /// is provided because the role-change flow has no rollback path:
    /// the counter only bumps after `tx.commit()` succeeds, so a
    /// recorded attempt is by definition tied to a committed change.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_role_change_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::role_change_attempts_key(user_id);
        let count = conn.incr::<_, _, u64>(&key, 1u64).await?;
        if count == 1 {
            conn.expire::<_, ()>(&key, ROLE_CHANGE_RATE_WINDOW_SECS.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Generates the Redis key for the role-change rate-limit counter.
    ///
    /// Exposed `pub` (rather than module-private) so integration tests
    /// can reach the canonical key format - the `users_role.rs`
    /// bidirectional test deletes this key between iterations to
    /// simulate the 24h window having elapsed. Any future rename of
    /// the key format then breaks tests at compile-time, not silently
    /// at runtime.
    #[inline]
    #[must_use]
    pub fn role_change_attempts_key(user_id: Uuid) -> String {
        format!("role_change:{user_id}")
    }
}
