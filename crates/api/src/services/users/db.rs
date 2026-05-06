//! Database operations for user profiles.

use core::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::{Error, PgPool};
use uuid::Uuid;

use crate::common::{UserInfo, UserRole, UserStatus, VerificationLevel};

/// Full user profile loaded by [`fetch_user_profile`].
///
/// Mirrors the public-facing `UserInfo` response shape. The `verification_level`
/// and `status` columns are stored as TEXT with CHECK constraints in Postgres
/// and parsed into typed enums at the db layer so handlers never see raw
/// strings for typed values. `role` stays as `String` because the upsert path
/// (login) parses it separately into a typed `UserRole` already.
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

/// Maps a DB-side `UserProfileRecord` into the public-facing [`UserInfo`]
/// shape returned by `/me` endpoints and the wallet login response.
///
/// `verification_level` is intentionally dropped: it lives on the record so
/// authorization-checking code can read it without a second SQL trip, but
/// `UserInfo` does not expose it - surfacing aggregate verification
/// publicly is a deliberate omission to avoid leaking onboarding state to
/// the wrong UI surfaces.
///
/// `role` is parsed here with an `Unknown` fallback (mirroring the
/// wallet-login path) so a stray DB value can never 500 a profile read or
/// a refresh-token rotation - the handler always gets a typed enum.
impl From<UserProfileRecord> for UserInfo {
    #[inline]
    fn from(record: UserProfileRecord) -> Self {
        Self {
            id: record.id,
            role: UserRole::from_str(&record.role).unwrap_or(UserRole::Unknown),
            wallet_address: record.wallet_address,
            status: record.status,
            email: record.email,
            first_name: record.first_name,
            last_name: record.last_name,
            phone: record.phone,
            avatar_url: record.avatar_url,
            bio: record.bio,
            is_profile_complete: record.is_profile_complete,
            active_leases_count: record.active_leases_count,
            created_at: record.created_at,
            updated_at: record.updated_at,
        }
    }
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

/// Validated patch produced by `UpdateProfileRequest::into_patch`.
///
/// Each field is `Some(value)` to set or `None` to leave the column
/// unchanged. `phone_verified` is intentionally not in this struct - it is
/// reset implicitly by `update_user_profile` whenever `phone` is set to a
/// value different from the stored one, so callers cannot accidentally keep
/// a stale verification flag for a fresh number.
#[derive(Debug)]
pub struct ProfilePatch {
    /// New first name, or `None` to keep the existing value.
    pub first_name: Option<String>,
    /// New last name, or `None` to keep the existing value.
    pub last_name: Option<String>,
    /// New phone number, or `None` to keep the existing value. Setting this
    /// to a value different from the stored one resets `phone_verified`.
    pub phone: Option<String>,
    /// New bio, or `None` to keep the existing value.
    pub bio: Option<String>,
    /// New avatar URL, or `None` to keep the existing value.
    pub avatar_url: Option<String>,
}

/// Patches the editable subset of a user's profile.
///
/// Each column is updated via `COALESCE($n, col)`, so passing `None` for a
/// field leaves the corresponding column untouched. Side effects:
///
/// - `phone_verified` is reset to `false` if and only if a new phone is
///   provided AND it is `IS DISTINCT FROM` the stored one (NULL-aware): a
///   no-op patch never invalidates an already-verified number.
/// - `is_profile_complete` is maintained by `trg_users_profile_complete`
///   (BEFORE INSERT/UPDATE OF phone) so we never write that column directly.
/// - `updated_at` is bumped by the standard `updated_at` trigger on `users`.
///
/// After the UPDATE, the row is reloaded via [`fetch_user_profile`] so the
/// caller responds with the same shape `GET /me` produces, including the
/// joined `active_leases_count`. Any concurrent UPDATE racing between the
/// patch and the reload is acceptable: the response simply reflects the
/// final committed state, which is what the caller wants anyway.
///
/// # Errors
///
/// - [`Error::RowNotFound`] when the user no longer exists (e.g.
///   soft-deleted between JWT issue and this call - the access token
///   outlives the row by up to 15 minutes).
/// - [`sqlx::Error`] for any DB failure or column-decode error in the
///   follow-up `fetch_user_profile`.
#[inline]
pub async fn update_user_profile(
    pool: &PgPool,
    user_id: Uuid,
    patch: ProfilePatch,
) -> Result<UserProfileRecord, Error> {
    let rows_affected = sqlx::query!(
        r"
            UPDATE users
            SET
                first_name = COALESCE($2, first_name),
                last_name  = COALESCE($3, last_name),
                phone      = COALESCE($4, phone),
                phone_verified = CASE
                    WHEN $4::text IS NOT NULL AND $4 IS DISTINCT FROM phone
                    THEN false
                    ELSE phone_verified
                END,
                bio        = COALESCE($5, bio),
                avatar_url = COALESCE($6, avatar_url)
            WHERE id = $1 AND deleted_at IS NULL
        ",
        user_id,
        patch.first_name,
        patch.last_name,
        patch.phone,
        patch.bio,
        patch.avatar_url,
    )
    .execute(pool)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        // Either no user with this id (impossible: the JWT sub came from a
        // real login) or the row was soft-deleted between login and now.
        // Surface as RowNotFound so the handler maps to 404 - the same
        // shape `GET /me` uses for the deleted-while-logged-in case.
        return Err(Error::RowNotFound);
    }

    fetch_user_profile(pool, user_id).await
}

/// Rewrites `users.avatar_url` for `user_id` and returns the reloaded
/// profile.
///
/// Called by `POST /me/avatar` after the storage backend has accepted the
/// upload and produced a public URL. The two-step (storage put, then DB
/// rewrite) is intentional: the URL is the only stable identifier of the
/// stored object, so writing the column first would either require a
/// rollback path on storage failure or leave the row pointing at a
/// non-existent blob. Reload via [`fetch_user_profile`] keeps the response
/// shape consistent with `GET /me` for any caller that opts to chain.
///
/// `updated_at` is bumped by the standard `updated_at` trigger; this query
/// does not touch the column directly.
///
/// # Errors
///
/// - [`Error::RowNotFound`] when the user no longer exists (soft-deleted
///   between JWT issue and this call - the access token outlives the row
///   by up to 15 minutes).
/// - [`sqlx::Error`] for any DB failure or column-decode error in the
///   follow-up `fetch_user_profile`.
#[inline]
pub async fn update_avatar_url(
    pool: &PgPool,
    user_id: Uuid,
    avatar_url: &str,
) -> Result<UserProfileRecord, Error> {
    let rows_affected = sqlx::query!(
        r"
            UPDATE users
            SET avatar_url = $2
            WHERE id = $1 AND deleted_at IS NULL
        ",
        user_id,
        avatar_url,
    )
    .execute(pool)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(Error::RowNotFound);
    }

    fetch_user_profile(pool, user_id).await
}

/// Returns `true` when `email` is already used by some active user other
/// than `exclude_user_id`.
///
/// `exclude_user_id` lets the request handler pre-check uniqueness for the
/// caller's own (already-stored) email without spuriously reporting a
/// 409 when the user submits their current address. Soft-deleted rows
/// are excluded so re-using the email of a deleted account is allowed.
///
/// This is a UX-preserving pre-check, not a substitute for the
/// `users_email_key` UNIQUE constraint: the actual rewrite still goes
/// through the constraint via [`apply_email_change`], so a race with
/// another concurrent change is caught and surfaced as 409 by
/// `From<sqlx::Error>` for `ApiError`.
///
/// # Errors
///
/// Returns `sqlx::Error` if the query fails.
#[inline]
pub async fn is_email_taken(
    pool: &PgPool,
    email: &str,
    exclude_user_id: Uuid,
) -> Result<bool, Error> {
    let row = sqlx::query!(
        r#"
            SELECT EXISTS(
                SELECT 1 FROM users
                WHERE email = $1
                  AND id <> $2
                  AND deleted_at IS NULL
            ) AS "exists!"
        "#,
        email,
        exclude_user_id,
    )
    .fetch_one(pool)
    .await?;
    Ok(row.exists)
}

/// Rewrites the user's email to `new_email` and marks it verified.
///
/// `email_verified` is set to `TRUE` because the caller has already
/// proved control of `new_email` via the confirmation round-trip - the
/// only path into this function is a successful `take_email_change_token`
/// match. Setting it to `FALSE` here would leave the user in a stale
/// "email-known-but-not-verified" state right after they verified, and
/// would force a redundant second round-trip.
///
/// `verification_level` is NOT written explicitly: the
/// `trg_users_profile_complete` BEFORE-trigger recomputes it from the
/// atomic-bool columns (`email_verified`, `phone_verified`, ...) on every
/// UPDATE, so the aggregate is always consistent without handler code
/// touching it.
///
/// Conflicts surface as `sqlx::Error::Database` with
/// `is_unique_violation()`, which `From<sqlx::Error>` for `ApiError`
/// already maps to 409 - no special-casing needed at the call site.
///
/// # Errors
///
/// - [`Error::RowNotFound`] if the user disappeared between confirmation
///   and apply (soft-deleted, or never existed - though the JWT path
///   makes that unreachable).
/// - [`sqlx::Error`] for unique-violation (race with another email-change
///   that committed first) or any other DB failure.
#[inline]
pub async fn apply_email_change(
    pool: &PgPool,
    user_id: Uuid,
    new_email: &str,
) -> Result<UserProfileRecord, Error> {
    let rows_affected = sqlx::query!(
        r"
            UPDATE users
            SET email = $2, email_verified = TRUE
            WHERE id = $1 AND deleted_at IS NULL
        ",
        user_id,
        new_email,
    )
    .execute(pool)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(Error::RowNotFound);
    }

    fetch_user_profile(pool, user_id).await
}
