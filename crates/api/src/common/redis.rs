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

/// Maximum email-change requests per user within
/// [`EMAIL_CHANGE_RATE_WINDOW_SECS`].
const EMAIL_CHANGE_MAX_ATTEMPTS: u64 = 3;

/// Rolling window for the email-change rate limit (24 hours).
///
/// Matches `EMAIL_CHANGE_TTL` so the user cannot churn the
/// `email_change:{user_id}` slot to silently invalidate previous links and
/// flood the new mailbox with confirmation emails.
const EMAIL_CHANGE_RATE_WINDOW_SECS: u64 = 24 * 60 * 60;

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
}

impl RedisStore {
    /// Creates a new `RedisStore` with a shared, auto-reconnecting connection.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the initial connection fails.
    #[inline]
    pub async fn new(client: Client) -> RedisResult<Self> {
        let conn = client.get_connection_manager().await?;
        Ok(Self { conn })
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

    /// Returns `true` when the user has already exceeded
    /// [`EMAIL_CHANGE_MAX_ATTEMPTS`] within the rolling window.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_email_change_rate_limited(&self, user_id: Uuid) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::email_change_attempts_key(user_id);
        let count = conn.get::<_, Option<u64>>(&key).await?;
        Ok(count.is_some_and(|c| c >= EMAIL_CHANGE_MAX_ATTEMPTS))
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

    /// Generates the Redis key for the avatar-upload rate-limit counter.
    #[inline]
    fn avatar_upload_attempts_key(user_id: Uuid) -> String {
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
