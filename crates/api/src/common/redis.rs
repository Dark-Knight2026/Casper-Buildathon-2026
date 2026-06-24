//! Redis client wrapper with typed operations.

use redis::{AsyncCommands, Client, RedisError, Script, aio::ConnectionManager};
use uuid::Uuid;

/// Outcome of an atomic "reserve a token-bearing send under a rate limit" step.
///
/// Shared by [`reserve_verify_email_send`] and [`reserve_password_reset_send`]:
/// both run the same Lua script that either stores the token slot and bumps the
/// per-user counters in one indivisible step, or - if a rolling window is
/// already at its cap - writes nothing. The two flows differ only in which keys
/// the slot and counters use, not in the shape of the result, so they share
/// this type.
///
/// [`reserve_verify_email_send`]: RedisStore::reserve_verify_email_send
/// [`reserve_password_reset_send`]: RedisStore::reserve_password_reset_send
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SendReservation {
    /// Both windows were under their caps: the token slot was stored and both
    /// counters incremented in the same atomic step.
    Reserved,
    /// The per-minute or per-hour cap was already reached; no Redis state
    /// changed, so any previously stored token is left intact.
    RateLimited,
}

/// Two-tier (per-minute + per-hour) rate limit for a token-bearing email send.
///
/// The verify-email and password-reset send flows share this shape: a tight
/// per-minute burst guard layered with a looser per-hour cap, with the four
/// values fed straight into the `reserve_*_send` Lua script. Kept as a struct
/// with one const instance per flow (rather than one shared const) so the two
/// policies can be tuned independently later without disturbing the other.
struct SendRateLimitPer {
    /// Max sends allowed within `per_minute_window_secs`.
    minute_max: u64,
    /// Short rolling window, in seconds.
    minute_window_secs: u64,
    /// Max sends allowed within `per_hour_window_secs`.
    hour_max: u64,
    /// Long rolling window, in seconds.
    hour_window_secs: u64,
}

/// Single-window rate limit: at most `max_attempts` within `window_secs`.
///
/// Backs the counter-based guards (`INCR` + conditional `EXPIRE`) for login
/// failures, avatar uploads, and role changes. The email-change guard does NOT
/// use this, because its cap is per-deploy configurable
/// (`ServerConfig::email_change_max_attempts`) rather than a compile-time
/// constant, so only its window lives as a bare const below.
struct RateLimit {
    /// Attempts allowed before the guard trips.
    max_attempts: u64,
    /// Rolling window, in seconds, the count is measured over.
    window_secs: u64,
}

/// Time-to-live for login nonce in Redis (5 minutes).
const LOGIN_NONCE_TTL: u64 = 300;

/// Failed-login rate limit per wallet address: 5 attempts per 60 seconds.
const LOGIN_FAIL: RateLimit = RateLimit {
    max_attempts: 5,
    window_secs: 60,
};

/// Failed password-login rate limit per email: 5 attempts per 60 seconds.
///
/// Mirrors [`LOGIN_FAIL`] - the wallet-login analog - in shape and threshold,
/// but lives as a separate const keyed on the normalized email so password and
/// wallet brute-force are bounded independently. Keying on email (not IP)
/// targets credential-stuffing against one known account; the accepted
/// trade-off is the same as the wallet path - an attacker who knows a victim's
/// email can lock them out for the rolling window by burning failures.
const PASSWORD_LOGIN_FAIL: RateLimit = RateLimit {
    max_attempts: 5,
    window_secs: 60,
};

/// Registration rate limit per client IP: 5 attempts per 60 seconds.
///
/// Keyed on the peer IP, not the email: the abuse vector for registration is
/// one source minting many accounts under many different emails, which a
/// per-email counter (forever stuck at 1) would never catch. A per-minute burst
/// guard of 5 sits well above any human signup cadence - even a shared NAT
/// egress rarely registers five accounts in a minute - while capping automated
/// account creation. It layers on top of the global per-IP `GovernorLayer` as a
/// registration-specific tightening.
const REGISTER_PER_IP: RateLimit = RateLimit {
    max_attempts: 5,
    window_secs: 60,
};

/// Failed change-password rate limit per user: 5 attempts per 60 seconds.
///
/// The change path verifies `current_password`; without a counter a stolen but
/// still-valid access cookie could brute-force it. Mirrors [`PASSWORD_LOGIN_FAIL`]
/// in shape and threshold but keys on `user_id`, since the caller is already
/// authenticated and the target is one known account.
const CHANGE_PASSWORD_FAIL: RateLimit = RateLimit {
    max_attempts: 5,
    window_secs: 60,
};

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
/// A bare window rather than a [`RateLimit`] because the cap is per-deploy
/// configurable (`ServerConfig::email_change_max_attempts`), not constant.
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

/// Verify-email send rate limit: one per minute, five per hour.
///
/// The per-minute tier is a tight burst guard - one send per minute stops a
/// user (or a stolen cookie) from hammering the resend button and flooding the
/// mailbox. The per-hour tier absorbs a handful of legitimate retries (typo'd
/// address, lost mail) while still bounding the total volume one account can
/// trigger in an hour.
const VERIFY_EMAIL_SEND_LIMIT: SendRateLimitPer = SendRateLimitPer {
    minute_max: 1,
    minute_window_secs: 60,
    hour_max: 5,
    hour_window_secs: 60 * 60,
};

/// Time-to-live for a pending password-reset token (30 minutes).
///
/// Deliberately far shorter than [`VERIFY_EMAIL_TTL`] (24h): a reset link is a
/// full account-takeover capability, so the window an intercepted link stays
/// live is kept tight. 30 minutes still covers a user who opens the mail,
/// gets distracted, and comes back - the common good-faith case - without
/// leaving a stolen link redeemable for a day.
const PASSWORD_RESET_TTL: u64 = 30 * 60;

/// Password-reset send rate limit: identical shape to
/// [`VERIFY_EMAIL_SEND_LIMIT`] - one per minute, five per hour - kept as a
/// separate instance so the reset policy can be tightened independently of
/// verify-email. The per-minute tier blocks an attacker (or a button-masher)
/// from flooding a victim's mailbox with reset links.
const PASSWORD_RESET_SEND_LIMIT: SendRateLimitPer = SendRateLimitPer {
    minute_max: 1,
    minute_window_secs: 60,
    hour_max: 5,
    hour_window_secs: 60 * 60,
};

/// Avatar-upload rate limit: 10 uploads per rolling hour.
///
/// Sized to absorb a power-user iterating through several crops/variants
/// (avatars get re-uploaded surprisingly often during onboarding) while
/// still capping the bandwidth a single account can burn through the
/// stub-or-S3 backend. The 10/h threshold also blocks a stolen-cookie
/// attacker from using the endpoint as a write-amplification primitive
/// against the storage backend.
const AVATAR_UPLOAD: RateLimit = RateLimit {
    max_attempts: 10,
    window_secs: 60 * 60,
};

/// Role-change rate limit: one successful change per rolling 24 hours.
///
/// Role changes are rare, auditable events - most users never trigger one,
/// and the few who do should not be churning between roles. Capping at
/// "one successful change per day" matches the audit/security expectation
/// without locking a user out of recovery: a 24h wait is acceptable
/// friction for a security-sensitive operation that also clears refresh
/// tokens and forces a re-login. The threshold of 1 means any prior committed
/// change in the rolling window blocks the next; two-way changes
/// (tenant -> landlord -> tenant) require waiting out the window or an operator
/// clearing the slot manually (the test surface uses
/// [`RedisStore::role_change_attempts_key`] to reset between assertions).
const ROLE_CHANGE: RateLimit = RateLimit {
    max_attempts: 1,
    window_secs: 24 * 60 * 60,
};

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
        Ok(count.is_some_and(|c| c >= LOGIN_FAIL.max_attempts))
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
            conn.expire::<_, ()>(&key, LOGIN_FAIL.window_secs.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Returns `true` if the email has exceeded the failed password-login limit.
    ///
    /// The password analog of [`is_login_rate_limited`]; the handler reads this
    /// before doing any work and fails open on a Redis error (the global
    /// `GovernorLayer` still applies) so an outage cannot take login down.
    ///
    /// [`is_login_rate_limited`]: Self::is_login_rate_limited
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_password_login_rate_limited(&self, email: &str) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::password_login_fail_key(email);
        let count = conn.get::<_, Option<u64>>(&key).await?;
        Ok(count.is_some_and(|c| c >= PASSWORD_LOGIN_FAIL.max_attempts))
    }

    /// Records one failed password-login attempt for the email.
    ///
    /// `INCR` + conditional `EXPIRE` mirrors [`record_login_failure`]: the TTL
    /// is set only on the first failure so the rolling window starts when the
    /// run of failures begins, not on every retry.
    ///
    /// [`record_login_failure`]: Self::record_login_failure
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_password_login_failure(&self, email: &str) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::password_login_fail_key(email);
        let count = conn.incr::<_, _, u64>(&key, 1u64).await?;
        if count == 1 {
            conn.expire::<_, ()>(&key, PASSWORD_LOGIN_FAIL.window_secs.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Returns `true` if the user has exceeded the failed change-password limit.
    ///
    /// The authenticated analog of [`is_password_login_rate_limited`]; the
    /// change-password handler reads this before verifying `current_password`
    /// and fails open on a Redis error so an outage cannot block a legitimate
    /// password change.
    ///
    /// [`is_password_login_rate_limited`]: Self::is_password_login_rate_limited
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn is_change_password_rate_limited(&self, user_id: Uuid) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::change_password_fail_key(user_id);
        let count = conn.get::<_, Option<u64>>(&key).await?;
        Ok(count.is_some_and(|c| c >= CHANGE_PASSWORD_FAIL.max_attempts))
    }

    /// Records one failed `current_password` verification for the user.
    ///
    /// `INCR` + conditional `EXPIRE` mirrors [`record_password_login_failure`]:
    /// the TTL is set only on the first failure so the rolling window starts
    /// when the run of failures begins, not on every retry.
    ///
    /// [`record_password_login_failure`]: Self::record_password_login_failure
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_change_password_failure(&self, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::change_password_fail_key(user_id);
        let count = conn.incr::<_, _, u64>(&key, 1u64).await?;
        if count == 1 {
            conn.expire::<_, ()>(&key, CHANGE_PASSWORD_FAIL.window_secs.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Records one registration attempt for the client IP and returns `true` if
    /// the IP has now exceeded the limit.
    ///
    /// `INCR` first, then compare the returned count, so two concurrent
    /// registrations cannot both observe a sub-limit count before either
    /// increments - the check-then-act window a separate `GET` + `INCR` would
    /// open. The TTL is set only when the counter transitions from 0 to 1, so
    /// the window starts on the first attempt and a flood of later
    /// (already-rejected) attempts cannot extend it. Counts every attempt that
    /// reaches the gate; validation runs first, so malformed bodies never get
    /// here.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn record_and_check_register_rate_limit(&self, ip: &str) -> RedisResult<bool> {
        let mut conn = self.conn.clone();
        let key = Self::register_attempts_key(ip);
        let count = conn.incr::<_, _, u64>(&key, 1u64).await?;
        // Set TTL only on the first attempt to start the window.
        if count == 1 {
            conn.expire::<_, ()>(&key, REGISTER_PER_IP.window_secs.cast_signed())
                .await?;
        }
        Ok(count > REGISTER_PER_IP.max_attempts)
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

    /// Atomically reserves one verify-email send: stores the token hash (24h
    /// TTL) and bumps both rolling-window counters, but only when the user is
    /// under *both* the per-minute and per-hour caps.
    ///
    /// A single Lua script fuses the rate-limit check, the token write, and the
    /// two `INCR`s into one indivisible step - that is what makes the limit
    /// race-free. With a separate read-only check followed by a later `INCR`,
    /// two concurrent sends could both read a count of zero, both pass, and
    /// both increment past the per-minute cap; the script runs to completion
    /// for one caller before the other starts, so only one can reserve. Fusing
    /// the token write in as well removes the old save-then-increment ordering
    /// window: the slot and the counters now move together or not at all, so
    /// there is never a spent slot with no redeemable token (which would strand
    /// the user behind the limiter) nor a stored token whose send went
    /// un-counted.
    ///
    /// On [`SendReservation::RateLimited`] the script writes nothing, so
    /// a throttled retry leaves any previously stored token intact rather than
    /// clobbering a link the user may still be about to click. The `email IS
    /// NULL` guard therefore still runs first in the handler: a wallet-only
    /// user is rejected before this method is ever called, so they never
    /// reserve a slot.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn reserve_verify_email_send(
        &self,
        user_id: Uuid,
        token_hash: &[u8; 32],
    ) -> RedisResult<SendReservation> {
        // KEYS: token slot, minute counter, hour counter.
        // ARGV: token hash, token TTL, minute cap, minute window, hour cap,
        //       hour window.
        let script = Script::new(
            r"
                local minute = tonumber(redis.call('GET', KEYS[2]) or '0')
                local hour = tonumber(redis.call('GET', KEYS[3]) or '0')
                if minute >= tonumber(ARGV[3]) or hour >= tonumber(ARGV[5]) then
                    return 0
                end
                redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
                if redis.call('INCR', KEYS[2]) == 1 then
                    redis.call('EXPIRE', KEYS[2], ARGV[4])
                end
                if redis.call('INCR', KEYS[3]) == 1 then
                    redis.call('EXPIRE', KEYS[3], ARGV[6])
                end
                return 1
            ",
        );
        let mut conn = self.conn.clone();
        let reserved = script
            .key(Self::verify_email_key(user_id))
            .key(Self::verify_email_send_minute_key(user_id))
            .key(Self::verify_email_send_hour_key(user_id))
            .arg(hex::encode(token_hash))
            .arg(VERIFY_EMAIL_TTL)
            .arg(VERIFY_EMAIL_SEND_LIMIT.minute_max)
            .arg(VERIFY_EMAIL_SEND_LIMIT.minute_window_secs)
            .arg(VERIFY_EMAIL_SEND_LIMIT.hour_max)
            .arg(VERIFY_EMAIL_SEND_LIMIT.hour_window_secs)
            .invoke_async::<i64>(&mut conn)
            .await?;
        Ok(if reserved == 1 {
            SendReservation::Reserved
        } else {
            SendReservation::RateLimited
        })
    }

    /// Reverses the counter increments of a previous
    /// [`reserve_verify_email_send`] after the downstream send fails
    /// permanently.
    ///
    /// [`reserve_verify_email_send`]: Self::reserve_verify_email_send
    ///
    /// Both counters are decremented atomically via [`decrement_send_counters`];
    /// a counter that drops to zero (or below, defensively) is deleted so the
    /// next attempt starts a fresh window rather than inheriting a shrunken TTL -
    /// mirrors [`decrement_email_change_attempt`]. Only called on
    /// [`EmailError::Permanent`](crate::providers::EmailError::Permanent):
    /// a transient failure keeps the counters bumped because the queued
    /// retry will still deliver the mail.
    ///
    /// [`decrement_email_change_attempt`]: Self::decrement_email_change_attempt
    /// [`decrement_send_counters`]: Self::decrement_send_counters
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails. Callers treat this as
    /// best-effort: the overcounting it cleans up is a UX issue, not a
    /// security one.
    #[inline]
    pub async fn decrement_verify_email_send_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        self.decrement_send_counters(
            &Self::verify_email_send_minute_key(user_id),
            &Self::verify_email_send_hour_key(user_id),
        )
        .await
    }

    /// Atomically decrements the minute and hour send counters, deleting either
    /// once it reaches zero so the next window starts fresh.
    ///
    /// A single Lua script fuses both `DECR`s and their conditional `DEL`s, so a
    /// concurrent reserve cannot interleave between the two and leave the
    /// minute and hour counters disagreeing - the divergence the previous
    /// two-command form allowed. Shared by the verify-email and password-reset
    /// rollback paths, mirroring how [`reserve_verify_email_send`] and
    /// [`reserve_password_reset_send`] share their reserve script.
    ///
    /// [`reserve_verify_email_send`]: Self::reserve_verify_email_send
    /// [`reserve_password_reset_send`]: Self::reserve_password_reset_send
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    async fn decrement_send_counters(&self, minute_key: &str, hour_key: &str) -> RedisResult<()> {
        // KEYS: minute counter, hour counter. Each DECR that drops to zero (or
        // below, defensively) deletes its key so a fresh window starts next time.
        let script = Script::new(
            r"
                if redis.call('DECR', KEYS[1]) <= 0 then
                    redis.call('DEL', KEYS[1])
                end
                if redis.call('DECR', KEYS[2]) <= 0 then
                    redis.call('DEL', KEYS[2])
                end
                return 1
            ",
        );
        let mut conn = self.conn.clone();
        script
            .key(minute_key)
            .key(hour_key)
            .invoke_async::<i64>(&mut conn)
            .await?;
        Ok(())
    }

    /// Atomically reserves one password-reset send: stores the
    /// `{token_hash -> user_id}` slot (30m TTL) and bumps both rolling-window
    /// counters, but only when the user is under *both* the per-minute and
    /// per-hour caps.
    ///
    /// Same single-Lua-script race-freedom argument as
    /// [`reserve_verify_email_send`]: fusing the check, the slot write, and the
    /// two `INCR`s means two concurrent forgot requests cannot both clear the
    /// per-minute cap, and there is never a spent counter without a redeemable
    /// slot.
    ///
    /// The slot is keyed by the token hash (not the user id): a reset arrives
    /// unauthenticated carrying only the token, so the token hash is the only
    /// thing the redeem path can look the user up by. The stored *value* is the
    /// `user_id`, which [`take_password_reset_token`] returns. The rate-limit
    /// counters stay keyed by `user_id` because the forgot path resolves the
    /// email to a user before calling this.
    ///
    /// [`reserve_verify_email_send`]: Self::reserve_verify_email_send
    /// [`take_password_reset_token`]: Self::take_password_reset_token
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn reserve_password_reset_send(
        &self,
        user_id: Uuid,
        token_hash: &[u8; 32],
    ) -> RedisResult<SendReservation> {
        // KEYS: token slot (keyed by hash), minute counter, hour counter.
        // ARGV: user id (the slot value), token TTL, minute cap, minute window,
        //       hour cap, hour window.
        let script = Script::new(
            r"
                local minute = tonumber(redis.call('GET', KEYS[2]) or '0')
                local hour = tonumber(redis.call('GET', KEYS[3]) or '0')
                if minute >= tonumber(ARGV[3]) or hour >= tonumber(ARGV[5]) then
                    return 0
                end
                redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
                if redis.call('INCR', KEYS[2]) == 1 then
                    redis.call('EXPIRE', KEYS[2], ARGV[4])
                end
                if redis.call('INCR', KEYS[3]) == 1 then
                    redis.call('EXPIRE', KEYS[3], ARGV[6])
                end
                return 1
            ",
        );
        let mut conn = self.conn.clone();
        let reserved = script
            .key(Self::password_reset_key(token_hash))
            .key(Self::password_reset_send_minute_key(user_id))
            .key(Self::password_reset_send_hour_key(user_id))
            .arg(user_id.to_string())
            .arg(PASSWORD_RESET_TTL)
            .arg(PASSWORD_RESET_SEND_LIMIT.minute_max)
            .arg(PASSWORD_RESET_SEND_LIMIT.minute_window_secs)
            .arg(PASSWORD_RESET_SEND_LIMIT.hour_max)
            .arg(PASSWORD_RESET_SEND_LIMIT.hour_window_secs)
            .invoke_async::<i64>(&mut conn)
            .await?;
        Ok(if reserved == 1 {
            SendReservation::Reserved
        } else {
            SendReservation::RateLimited
        })
    }

    /// Atomically retrieves and deletes the pending password-reset slot for the
    /// presented token hash, returning the `user_id` it pointed at.
    ///
    /// Uses `GETDEL` to close the TOCTOU window: the slot is consumed even if
    /// the subsequent password update fails, so a reset link is strictly
    /// single-use - a replay finds nothing. Returns `Ok(None)` when the slot is
    /// empty (never issued, already consumed, or expired) or when the stored
    /// value fails to parse as a `Uuid`, which the handler treats identically
    /// to a missing slot (generic invalid-token error).
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn take_password_reset_token(
        &self,
        token_hash: &[u8; 32],
    ) -> RedisResult<Option<Uuid>> {
        let mut conn = self.conn.clone();
        let key = Self::password_reset_key(token_hash);
        let raw = redis::cmd("GETDEL")
            .arg(&key)
            .query_async::<Option<String>>(&mut conn)
            .await?;
        Ok(raw.and_then(|value| Uuid::parse_str(&value).ok()))
    }

    /// Drops a pending password-reset slot without consuming it through the
    /// redeem path.
    ///
    /// Used by the forgot handler to roll the slot back when `mailer.send`
    /// fails permanently: the user never received the link, so leaving it live
    /// for 30 minutes just keeps a useless capability redeemable. Best-effort -
    /// callers log-warn rather than mask the upstream failure.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn clear_password_reset_token(&self, token_hash: &[u8; 32]) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::password_reset_key(token_hash);
        conn.del::<_, ()>(&key).await
    }

    /// Reverses the counter increments of a previous
    /// [`reserve_password_reset_send`] after the downstream send fails
    /// permanently.
    ///
    /// [`reserve_password_reset_send`]: Self::reserve_password_reset_send
    ///
    /// Both counters are decremented atomically via [`decrement_send_counters`],
    /// deleting a counter that drops to zero so the next attempt starts a fresh
    /// window - mirrors [`decrement_verify_email_send_attempt`]. Only called on
    /// [`EmailError::Permanent`](crate::providers::EmailError::Permanent): a
    /// transient failure keeps the counters bumped because the queued retry
    /// still delivers.
    ///
    /// [`decrement_send_counters`]: Self::decrement_send_counters
    ///
    /// [`decrement_verify_email_send_attempt`]: Self::decrement_verify_email_send_attempt
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails. Best-effort: the
    /// overcounting it cleans up is a UX issue, not a security one.
    #[inline]
    pub async fn decrement_password_reset_send_attempt(&self, user_id: Uuid) -> RedisResult<()> {
        self.decrement_send_counters(
            &Self::password_reset_send_minute_key(user_id),
            &Self::password_reset_send_hour_key(user_id),
        )
        .await
    }

    /// Returns `true` when the user has already exceeded the
    /// [`AVATAR_UPLOAD`] cap within the rolling window.
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
        Ok(count.is_some_and(|c| c >= AVATAR_UPLOAD.max_attempts))
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
            conn.expire::<_, ()>(&key, AVATAR_UPLOAD.window_secs.cast_signed())
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

    /// Generates the Redis key for the per-email failed password-login counter.
    ///
    /// Exposed `pub` so rate-limit tests can DEL it to simulate the 60-second
    /// window having elapsed without sleeping in CI.
    #[inline]
    #[must_use]
    pub fn password_login_fail_key(email: &str) -> String {
        format!("password_login_fail:{email}")
    }

    /// Generates the Redis key for the per-user failed change-password counter.
    ///
    /// Exposed `pub` so rate-limit tests can DEL it to simulate the 60-second
    /// window having elapsed without sleeping in CI.
    #[inline]
    #[must_use]
    pub fn change_password_fail_key(user_id: Uuid) -> String {
        format!("change_password_fail:{user_id}")
    }

    /// Generates the Redis key for the per-IP registration counter.
    ///
    /// Exposed `pub` so rate-limit tests can DEL it to simulate the 60-second
    /// window having elapsed without sleeping in CI.
    #[inline]
    #[must_use]
    pub fn register_attempts_key(ip: &str) -> String {
        format!("register_attempts:{ip}")
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

    /// Generates the Redis key for a pending password-reset slot.
    ///
    /// Keyed by the hex-encoded token hash (not the user id): the redeem path
    /// is unauthenticated and carries only the token, so the hash is the lookup
    /// key and the `user_id` is the stored value. Exposed `pub` so reset tests
    /// can derive the key from the plaintext token captured in the email and
    /// assert TTL / consumption directly.
    #[inline]
    #[must_use]
    pub fn password_reset_key(token_hash: &[u8; 32]) -> String {
        format!("password_reset:{}", hex::encode(token_hash))
    }

    /// Generates the Redis key for the per-minute password-reset send counter.
    ///
    /// Exposed `pub` so the rate-limit tests can delete it to simulate the
    /// 60-second window having elapsed without sleeping in the test.
    #[inline]
    #[must_use]
    pub fn password_reset_send_minute_key(user_id: Uuid) -> String {
        format!("password_reset:send:1m:{user_id}")
    }

    /// Generates the Redis key for the per-hour password-reset send counter.
    ///
    /// Exposed `pub` so the rate-limit tests can delete it to simulate the
    /// 1-hour window having elapsed without sleeping in the test.
    #[inline]
    #[must_use]
    pub fn password_reset_send_hour_key(user_id: Uuid) -> String {
        format!("password_reset:send:1h:{user_id}")
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

    /// Returns `true` when the user has already exceeded the
    /// [`ROLE_CHANGE`] cap within the rolling window.
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
        Ok(count.is_some_and(|c| c >= ROLE_CHANGE.max_attempts))
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
            conn.expire::<_, ()>(&key, ROLE_CHANGE.window_secs.cast_signed())
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
