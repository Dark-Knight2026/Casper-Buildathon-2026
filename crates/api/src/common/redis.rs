//! Redis client wrapper with typed operations.

use redis::{AsyncCommands, Client, RedisError, aio::ConnectionManager};

/// Time-to-live for login nonce in Redis (5 minutes).
const LOGIN_NONCE_TTL: u64 = 300;

/// Maximum failed login attempts per wallet address before rate limiting.
const LOGIN_FAIL_MAX_ATTEMPTS: u64 = 5;

/// Time window for failed login rate limiting (60 seconds).
const LOGIN_FAIL_WINDOW_SECS: u64 = 60;

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
}
