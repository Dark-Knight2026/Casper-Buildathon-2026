//! Database operations for authentication.

use core::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::common::{UserRole, VerificationLevel};

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

/// Full user profile loaded by [`fetch_user_profile`].
///
/// Mirrors the public-facing `UserInfo` response shape. The `role`,
/// `verification_level` and `status` columns are stored as TEXT with CHECK
/// constraints in Postgres and parsed into typed enums (where applicable) at
/// the db layer so handlers never see raw strings for typed values.
#[derive(Debug)]
pub struct UserProfileRecord {
    /// Unique identifier of the user.
    pub id: Uuid,
    /// Primary wallet address (cached column synced from the primary
    /// `wallet_connections` row by trigger).
    pub wallet_address: Option<String>,
    /// User's role.
    pub role: String,
    /// Account status (`active`, `inactive`, `suspended`, `pending_verification`).
    pub status: Option<String>,
    /// Email address (nullable: wallet-only users may have none).
    pub email: Option<String>,
    /// First name (NOT NULL in `users` schema).
    pub first_name: String,
    /// Last name (NOT NULL in `users` schema).
    pub last_name: String,
    /// Phone number.
    pub phone: Option<String>,
    /// Avatar URL.
    pub avatar_url: Option<String>,
    /// Free-form bio.
    pub bio: Option<String>,
    /// `true` once email, `first_name`, `last_name` and phone are all populated.
    pub is_profile_complete: bool,
    /// Aggregate verification state.
    pub verification_level: VerificationLevel,
    /// Number of currently `active` leases where the user participates.
    pub active_leases_count: i64,
    /// Account creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last profile update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Upserts a user by wallet address.
///
/// If the user exists, updates `last_login_at` and leaves `role` unchanged
/// (the `role` parameter is honored only on first insert - subsequent logins
/// cannot promote a user via the `role` field). Otherwise, creates a new user
/// with the supplied role.
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `email` - Placeholder email for the user
/// * `wallet_address` - User's wallet address
/// * `role` - Role to assign on first insert; ignored on conflict. Caller MUST
///   pre-validate via [`UserRole::is_self_registerable`] - this layer trusts
///   the input and only the DB CHECK constraint provides a final guard.
///
/// # Errors
///
/// Returns `sqlx::Error` if the database operation fails.
#[inline]
pub async fn upsert_user_by_wallet(
    pool: &PgPool,
    email: &str,
    wallet_address: &str,
    role: UserRole,
) -> Result<UserRecord, sqlx::Error> {
    let role_str = role.to_string();
    let record = sqlx::query!(
        r#"
            INSERT INTO users ( email, role, wallet_address, first_name, last_name, auth_id, status )
            VALUES ($1, $3, $2, 'Wallet', 'User', NULL, 'active')
            ON CONFLICT (wallet_address) WHERE wallet_address IS NOT NULL AND deleted_at IS NULL
                DO UPDATE SET last_login_at = NOW()
            RETURNING id, role, verification_level
        "#,
        email,
        wallet_address,
        role_str,
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

/// Loads the full profile for `user_id`, joining lease participation counts.
///
/// `active_leases_count` is computed via a correlated subquery that checks all
/// four user-fields on `leases` (`primary_tenant_id`, `tenant_ids[]`,
/// `landlord_id`, `agent_id`) and uses `COUNT(DISTINCT l.id)` to avoid
/// double-counting when the same user is listed in multiple roles on one lease.
///
/// Returns `Err(sqlx::Error::RowNotFound)` if the user does not exist or is
/// soft-deleted.
///
/// # Errors
///
/// Returns `sqlx::Error` if the query fails or `verification_level` cannot be
/// decoded into the typed enum.
#[inline]
pub async fn fetch_user_profile(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<UserProfileRecord, sqlx::Error> {
    let record = sqlx::query!(
        r#"
            SELECT
                u.id,
                u.wallet_address,
                u.role,
                u.status,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.avatar_url,
                u.bio,
                u.is_profile_complete,
                u.verification_level,
                u.created_at AS "created_at!",
                u.updated_at AS "updated_at!",
                (
                    SELECT COUNT(DISTINCT l.id)
                    FROM leases l
                    WHERE l.status = 'active'
                      AND (
                          l.primary_tenant_id = u.id
                          OR l.landlord_id = u.id
                          OR l.agent_id = u.id
                          OR u.id = ANY(l.tenant_ids)
                      )
                ) AS "active_leases_count!"
            FROM users u
            WHERE u.id = $1 AND u.deleted_at IS NULL
        "#,
        user_id
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

    Ok(UserProfileRecord {
        id: record.id,
        wallet_address: record.wallet_address,
        role: record.role,
        status: record.status,
        email: record.email,
        first_name: record.first_name,
        last_name: record.last_name,
        phone: record.phone,
        avatar_url: record.avatar_url,
        bio: record.bio,
        is_profile_complete: record.is_profile_complete,
        verification_level,
        active_leases_count: record.active_leases_count,
        created_at: record.created_at,
        updated_at: record.updated_at,
    })
}
