//! Database operations for authentication.

use core::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::{Error, PgPool};
use uuid::Uuid;

use crate::common::{UserRole, UserStatus, VerificationLevel};

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
    /// Account status. Parsed from the underlying TEXT column at the db
    /// layer so handlers receive a typed value.
    pub status: Option<UserStatus>,
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

/// Resolves a user by wallet address, creating a new account if none exists.
///
/// Lookup goes through `wallet_connections` (the canonical multi-wallet table)
/// rather than `users.wallet_address` (a cached column). This lets a user log
/// in with any of their connected wallets - cspr.click SDK, Casper Wallet
/// extension, or a future custodial provisioned address.
///
/// All side effects happen inside a single transaction:
///
/// - **Existing `wallet_connection`:** bumps `wallet_connections.last_used_at`
///   and `users.last_login_at` for the resolved user; `email`/`role`
///   parameters are ignored.
/// - **New wallet:** inserts a `users` row (without writing `wallet_address`
///   directly - the AFTER-trigger on `wallet_connections` syncs the cached
///   column) and a `wallet_connections` row with `is_primary=true,
///   is_custodial=false, provider='casper_wallet'`.
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `email` - Placeholder email used only when creating a new user
/// * `wallet_address` - User's wallet address (must be lowercased by caller)
/// * `role` - Role to assign on first insert; ignored on existing user.
///   Caller MUST pre-validate via [`UserRole::is_self_registerable`].
///
/// # Errors
///
/// Returns `sqlx::Error` on DB failure (including unique-constraint violation
/// from concurrent first-time logins of the same wallet, which is mapped to
/// `ApiError::Conflict` upstream).
#[inline]
pub async fn upsert_user_by_wallet(
    pool: &PgPool,
    email: &str,
    wallet_address: &str,
    role: UserRole,
) -> Result<UserRecord, Error> {
    let mut tx = pool.begin().await?;

    let existing = sqlx::query!(
        r"
            SELECT u.id, u.role, u.verification_level
            FROM users u
            JOIN wallet_connections wc ON wc.user_id = u.id
            WHERE wc.wallet_address = $1
              AND u.deleted_at IS NULL
            LIMIT 1
        ",
        wallet_address,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let record = if let Some(row) = existing {
        sqlx::query!(
            r"
                UPDATE wallet_connections
                SET last_used_at = NOW()
                WHERE user_id = $1 AND wallet_address = $2
            ",
            row.id,
            wallet_address,
        )
        .execute(tx.as_mut())
        .await?;

        sqlx::query!(
            r"
                UPDATE users
                SET last_login_at = NOW()
                WHERE id = $1
            ",
            row.id,
        )
        .execute(tx.as_mut())
        .await?;

        let verification_level =
            VerificationLevel::from_str(&row.verification_level).map_err(|err| {
                Error::ColumnDecode {
                    index: "verification_level".to_owned(),
                    source: Box::new(err),
                }
            })?;

        UserRecord {
            id: row.id,
            role: row.role,
            verification_level,
        }
    } else {
        let role_str = role.to_string();
        let inserted = sqlx::query!(
            r"
                INSERT INTO users (email, role, first_name, last_name, auth_id, status)
                VALUES ($1, $2, 'Wallet', 'User', NULL, 'active')
                RETURNING id, role, verification_level
            ",
            email,
            role_str,
        )
        .fetch_one(tx.as_mut())
        .await?;

        sqlx::query!(
            r"
                INSERT INTO wallet_connections (user_id, wallet_address, provider, is_primary, is_custodial)
                VALUES ($1, $2, 'casper_wallet', true, false)
            ",
            inserted.id,
            wallet_address,
        )
        .execute(tx.as_mut())
        .await?;

        let verification_level = VerificationLevel::from_str(&inserted.verification_level)
            .map_err(|err| Error::ColumnDecode {
                index: "verification_level".to_owned(),
                source: Box::new(err),
            })?;

        UserRecord {
            id: inserted.id,
            role: inserted.role,
            verification_level,
        }
    };

    tx.commit().await?;

    Ok(record)
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
pub async fn fetch_user_profile(pool: &PgPool, user_id: Uuid) -> Result<UserProfileRecord, Error> {
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
            Error::ColumnDecode {
                index: "verification_level".to_owned(),
                source: Box::new(err),
            }
        })?;

    let status = record
        .status
        .map(|s| UserStatus::from_str(&s))
        .transpose()
        .map_err(|err| Error::ColumnDecode {
            index: "status".to_owned(),
            source: Box::new(err),
        })?;

    Ok(UserProfileRecord {
        id: record.id,
        wallet_address: record.wallet_address,
        role: record.role,
        status,
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

/// Inserts a fresh `refresh_tokens` row and returns its primary key.
///
/// `token_hash` is the raw SHA-256 of the opaque plaintext - never the
/// plaintext itself. The plaintext is returned to the caller exactly once
/// (in the `Set-Cookie` header) and only the hash is persisted.
///
/// `family_id` groups all rotations of one login session: at first login
/// the caller passes a brand-new UUID; on rotation (Phase 4.2) the new row
/// inherits the predecessor's `family_id`. Reuse-detection later revokes
/// the entire family in one statement.
///
/// `replaced_by` is left NULL here - it is set on the predecessor row
/// during rotation, not at issuance.
///
/// # Errors
///
/// Returns `sqlx::Error` on DB failure. The partial unique index on
/// `(token_hash) WHERE revoked_at IS NULL` would surface the
/// astronomically-unlikely SHA-256 collision as a unique-violation;
/// upstream maps that to `ApiError::Conflict`.
#[inline]
pub async fn insert_refresh_token(
    pool: &PgPool,
    user_id: Uuid,
    family_id: Uuid,
    token_hash: &[u8],
    expires_at: DateTime<Utc>,
) -> Result<Uuid, Error> {
    let row = sqlx::query!(
        r"
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        ",
        user_id,
        token_hash,
        family_id,
        expires_at,
    )
    .fetch_one(pool)
    .await?;

    Ok(row.id)
}

/// Owner metadata returned from a successful refresh-token rotation.
#[derive(Debug)]
pub struct RotatedRefresh {
    /// User the rotated token belongs to.
    pub user_id: Uuid,
    /// Family id shared by the predecessor and the freshly minted row.
    pub family_id: Uuid,
    /// User's role at the moment of rotation. Parsed at the db layer (with
    /// `Unknown` as the fallback for unrecognized strings, mirroring the
    /// wallet-login path) so the handler can encode it directly into the
    /// new access JWT without reparsing.
    pub role: UserRole,
    /// Aggregate verification level (parsed at the db layer so callers do
    /// not see raw strings for typed values).
    pub verification_level: VerificationLevel,
}

/// Outcome of [`rotate_refresh_token`].
///
/// Each variant maps to a distinct handler response, so the result enum is
/// exhaustive rather than collapsed into `Option`/`Result` - the handler
/// must explicitly handle reuse vs. expiry vs. unknown vs. success because
/// they all 401 but log differently.
#[derive(Debug)]
pub enum RefreshOutcome {
    /// Predecessor was active; revoked + new row inserted.
    Rotated(RotatedRefresh),
    /// Predecessor was already revoked - sign of theft. The whole family
    /// is revoked by this same call before returning.
    Reused {
        /// The user the compromised family belongs to (for audit logging).
        user_id: Uuid,
        /// Family identifier (for audit logging).
        family_id: Uuid,
    },
    /// Predecessor row exists but `expires_at <= NOW()`; the row is also
    /// revoked here so the partial unique index stays clean.
    Expired,
    /// No row matches the presented hash. Either the token never existed,
    /// the family was revoked and rows pruned, or the client is sending
    /// garbage.
    NotFound,
}

/// Rotates a refresh token under a `SELECT ... FOR UPDATE` row lock.
///
/// The lock is the load-bearing piece of this function: two concurrent
/// refresh requests for the same plaintext (typical for a duplicated
/// browser tab or a flaky-network mobile retry) without it would both
/// observe `revoked_at IS NULL`, both insert successors, and the second
/// COMMIT would later trip reuse-detection - logging the legitimate user
/// out for no reason. With `FOR UPDATE` the second transaction blocks on
/// the row until the first commits, then sees `revoked_at IS NOT NULL`
/// and correctly takes the reuse-detection branch.
///
/// All side effects happen inside one transaction so the predecessor's
/// revoke and the successor's insert either both apply or neither does.
///
/// # Arguments
///
/// * `pool` - DB connection pool
/// * `presented_hash` - SHA-256 of the plaintext the client presented
/// * `new_token_id` - Pre-generated UUID for the successor row
/// * `new_token_hash` - SHA-256 of the plaintext returned to the client
/// * `new_expires_at` - Absolute expiration timestamp of the successor
///
/// # Errors
///
/// Returns `sqlx::Error` on DB failure. Unique-violation on the partial
/// `(token_hash) WHERE revoked_at IS NULL` index (astronomically unlikely
/// SHA-256 collision) surfaces as `ApiError::Conflict` upstream.
#[inline]
pub async fn rotate_refresh_token(
    pool: &PgPool,
    presented_hash: &[u8],
    new_token_id: Uuid,
    new_token_hash: &[u8],
    new_expires_at: DateTime<Utc>,
) -> Result<RefreshOutcome, Error> {
    let mut tx = pool.begin().await?;

    // `FOR UPDATE OF rt` locks only the refresh-token row; the joined
    // `users` row is read-only here and locking it would create needless
    // contention with profile updates that hit the same user.
    let row = sqlx::query!(
        r"
            SELECT
                rt.id,
                rt.user_id,
                rt.family_id,
                rt.expires_at,
                rt.revoked_at,
                u.role,
                u.verification_level
            FROM refresh_tokens rt
            JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = $1
            FOR UPDATE OF rt
        ",
        presented_hash,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(row) = row else {
        // Nothing to commit; transaction rolls back on drop.
        return Ok(RefreshOutcome::NotFound);
    };

    if row.revoked_at.is_some() {
        // Reuse detected: the presented token was already rotated or
        // logged out. Anyone replaying it is either the legitimate client
        // racing itself (the second arm of the FOR UPDATE serialization)
        // or an attacker. Either way the safe action is to revoke every
        // active sibling so the entire family is locked out.
        sqlx::query!(
            r"
                UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE family_id = $1 AND revoked_at IS NULL
            ",
            row.family_id,
        )
        .execute(tx.as_mut())
        .await?;
        tx.commit().await?;
        return Ok(RefreshOutcome::Reused {
            user_id: row.user_id,
            family_id: row.family_id,
        });
    }

    if row.expires_at <= Utc::now() {
        // Expired tokens are revoked here so the partial active index
        // does not accumulate stale entries. The handler still returns
        // 401 - an expired token is unusable.
        sqlx::query!(
            r"
                UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE id = $1
            ",
            row.id,
        )
        .execute(tx.as_mut())
        .await?;
        tx.commit().await?;
        return Ok(RefreshOutcome::Expired);
    }

    let verification_level =
        VerificationLevel::from_str(&row.verification_level).map_err(|err| {
            Error::ColumnDecode {
                index: "verification_level".to_owned(),
                source: Box::new(err),
            }
        })?;

    // `UserRole` parses with an `Unknown` fallback (no `Err` for unrecognized
    // strings) - mirrors the wallet-login path so a stray DB value can never
    // 500 the refresh handler.
    let role = UserRole::from_str(&row.role).unwrap_or(UserRole::Unknown);

    sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET revoked_at = NOW(), replaced_by = $1
            WHERE id = $2
        ",
        new_token_id,
        row.id,
    )
    .execute(tx.as_mut())
    .await?;

    sqlx::query!(
        r"
            INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        ",
        new_token_id,
        row.user_id,
        new_token_hash,
        row.family_id,
        new_expires_at,
    )
    .execute(tx.as_mut())
    .await?;

    tx.commit().await?;

    Ok(RefreshOutcome::Rotated(RotatedRefresh {
        user_id: row.user_id,
        family_id: row.family_id,
        role,
        verification_level,
    }))
}
