//! Redis client wrapper with typed operations.

use redis::{AsyncCommands, RedisError};

/// Time-to-live for login nonce in Redis (5 minutes).
const LOGIN_NONCE_TTL: u64 = 300;

/// A convenience type alias for `Result` returned from Redis client.
pub type RedisResult<T> = Result<T, RedisError>;

/// Wrapper around Redis client for nonce operations.
#[derive(Debug, Clone)]
pub struct RedisStore {
    client: redis::Client,
}

impl RedisStore {
    /// Creates a new `NonceStore` from a Redis client.
    #[inline]
    #[must_use]
    pub const fn new(client: redis::Client) -> Self {
        Self { client }
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
        let mut connection = self.client.get_multiplexed_async_connection().await?;
        let key = Self::nonce_key(wallet_address);
        connection.set_ex(&key, message, LOGIN_NONCE_TTL).await
    }

    /// Retrieves the nonce message for the given wallet address.
    ///
    /// Returns `None` if the nonce doesn't exist or has expired.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn get_nonce(&self, wallet_address: &str) -> RedisResult<Option<String>> {
        let mut connection = self.client.get_multiplexed_async_connection().await?;
        let key = Self::nonce_key(wallet_address);
        connection.get(&key).await
    }

    /// Deletes the nonce for the given wallet address.
    ///
    /// Used after successful login to prevent replay attacks.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection fails.
    #[inline]
    pub async fn delete_nonce(&self, wallet_address: &str) -> RedisResult<()> {
        let mut connection = self.client.get_multiplexed_async_connection().await?;
        let key = Self::nonce_key(wallet_address);
        connection.del(&key).await
    }

    /// Checks if Redis is reachable.
    ///
    /// # Errors
    ///
    /// Returns `RedisError` if the connection or ping fails.
    #[inline]
    pub async fn ping(&self) -> RedisResult<()> {
        let mut connection = self.client.get_multiplexed_async_connection().await?;
        redis::cmd("PING").query_async::<()>(&mut connection).await
    }

    /// Generates the Redis key for a wallet address.
    #[inline]
    fn nonce_key(wallet_address: &str) -> String {
        format!("nonce:{wallet_address}")
    }
}
