//! Redis client wrapper with typed operations.

use redis::{AsyncCommands, Client, RedisError, aio::ConnectionManager};
use uuid::Uuid;

/// Time-to-live for login nonce in Redis (5 minutes).
const LOGIN_NONCE_TTL: u64 = 300;

/// Maximum failed login attempts per wallet address before rate limiting.
const LOGIN_FAIL_MAX_ATTEMPTS: u64 = 5;

/// Time window for failed login rate limiting (60 seconds).
const LOGIN_FAIL_WINDOW_SECS: u64 = 60;

/// Time-to-live for a bootstrap-admin login token (10 minutes).
const BOOTSTRAP_LOGIN_TTL: u64 = 600;

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
        let count: Option<u64> = conn.get(&key).await?;
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
        let count: u64 = conn.incr(&key, 1u64).await?;
        // Set TTL only on the first failure to start the window.
        if count == 1 {
            conn.expire::<_, ()>(&key, LOGIN_FAIL_WINDOW_SECS.cast_signed())
                .await?;
        }
        Ok(())
    }

    /// Stores a one-time bootstrap-admin login token keyed by its opaque value.
    ///
    /// Used by the `bootstrap_admin` binary: after inserting the platform
    /// admin row, the binary prints an opaque token to stdout and persists
    /// the mapping `bootstrap_login:{token} -> user_id` so that the admin
    /// can exchange the token for a session once and only once.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn save_bootstrap_login_token(&self, token: &str, user_id: Uuid) -> RedisResult<()> {
        let mut conn = self.conn.clone();
        let key = Self::bootstrap_login_key(token);
        conn.set_ex(&key, user_id.to_string(), BOOTSTRAP_LOGIN_TTL)
            .await
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
        let exists: i32 = conn.exists(&key).await?;
        Ok(exists != 0)
    }

    /// Generates the Redis key for a wallet address nonce.
    #[inline]
    fn nonce_key(wallet_address: &str) -> String {
        format!("nonce:{wallet_address}")
    }

    /// Generates the Redis key for failed login tracking.
    #[inline]
    fn login_fail_key(wallet_address: &str) -> String {
        format!("login_fail:{wallet_address}")
    }

    /// Generates the Redis key for a bootstrap-admin login token.
    #[inline]
    fn bootstrap_login_key(token: &str) -> String {
        format!("bootstrap_login:{token}")
    }

    /// Generates the Redis key for a blocklisted access-token `jti`.
    #[inline]
    fn jwt_blocklist_key(jti: Uuid) -> String {
        format!("jwt_blocklist:{jti}")
    }
}
