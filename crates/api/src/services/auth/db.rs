//! Database operations for authentication.

use core::str::FromStr;

use sqlx::PgPool;
use uuid::Uuid;

use crate::common::VerificationLevel;

/// User record returned after login/registration.
#[derive(Debug)]
pub struct UserRecord {
    /// Unique identifier of the user.
    pub id: Uuid,
    /// User's role (e.g., "tenant", "landlord").
    pub role: String,
    /// User's verification level. Parsed from the underlying TEXT column
    /// at the db layer so handlers receive a typed value.
    pub verification_level: VerificationLevel,
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
            RETURNING id, role, verification_level
        "#,
        email,
        wallet_address
    )
    .fetch_one(pool)
    .await?;

    let verification_level =
        VerificationLevel::from_str(&record.verification_level).map_err(|err| {
            sqlx::Error::ColumnDecode {
                index: "verification_level".to_owned(),
                source: Box::new(err),
            }
        })?;

    Ok(UserRecord {
        id: record.id,
        role: record.role,
        verification_level,
    })
}
