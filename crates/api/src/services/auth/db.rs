//! Database operations for authentication.

use sqlx::PgPool;
use uuid::Uuid;

/// User record returned after login/registration.
#[derive(Debug)]
pub struct UserRecord {
    /// Unique identifier of the user.
    pub id: Uuid,
    /// User's role (e.g., "tenant", "landlord").
    pub role: String,
}

/// Upserts a user by wallet address.
///
/// If the user exists, updates `last_login_at`. Otherwise, creates a new user.
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `email` - Placeholder email for the user
/// * `wallet_address` - User's wallet address
///
/// # Errors
///
/// Returns `sqlx::Error` if the database operation fails.
#[inline]
pub async fn upsert_user_by_wallet(
    pool: &PgPool,
    email: &str,
    wallet_address: &str,
) -> Result<UserRecord, sqlx::Error> {
    let record = sqlx::query!(
        r#"
            INSERT INTO users ( email, role, wallet_address, first_name, last_name, auth_id, status )
            VALUES ($1, 'tenant', $2, 'Wallet', 'User', NULL, 'active')
            ON CONFLICT (wallet_address) WHERE wallet_address IS NOT NULL AND deleted_at IS NULL
                DO UPDATE SET last_login_at = NOW()
            RETURNING id, role
        "#,
        email,
        wallet_address
    )
    .fetch_one(pool)
    .await?;

    Ok(UserRecord {
        id: record.id,
        role: record.role,
    })
}
