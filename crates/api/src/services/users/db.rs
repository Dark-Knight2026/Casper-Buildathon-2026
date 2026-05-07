//! Database operations for user profiles.

use core::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::{Error, PgConnection, PgPool};
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
                bio        = COALESCE($5, bio)
            WHERE id = $1 AND deleted_at IS NULL
        ",
        user_id,
        patch.first_name,
        patch.last_name,
        patch.phone,
        patch.bio,
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

/// Locks the user's row and returns the current role.
///
/// `SELECT ... FOR UPDATE` blocks any concurrent UPDATE on the same row
/// until the surrounding transaction commits or rolls back. This is the
/// only correct way to implement the idempotent shortcut in the role
/// change flow: without the lock, two concurrent `PATCH`es could both
/// observe `role = tenant`, both decide to bump, and both succeed -
/// producing two `audit_logs` rows and burning two rate-limit slots for
/// what should have been one logical change.
///
/// `from_str` falls back to `UserRole::Unknown` to mirror
/// `From<UserProfileRecord>` for `UserInfo`: a stray DB value that does
/// not parse cannot crash the handler, but it also cannot pass the
/// self-registerable whitelist on the request side, so the caller still
/// rejects it with a 400. Returning the typed enum (instead of the raw
/// string) lets the caller compare against the validated request enum
/// without re-parsing.
///
/// # Errors
///
/// - [`Error::RowNotFound`] when the user is missing or soft-deleted.
/// - [`sqlx::Error`] for DB transport failures.
#[inline]
pub async fn lock_user_role(conn: &mut PgConnection, user_id: Uuid) -> Result<UserRole, Error> {
    let row = sqlx::query!(
        r"
            SELECT role
            FROM users
            WHERE id = $1 AND deleted_at IS NULL
            FOR UPDATE
        ",
        user_id,
    )
    .fetch_optional(&mut *conn)
    .await?;

    let row = row.ok_or(Error::RowNotFound)?;
    Ok(UserRole::from_str(&row.role).unwrap_or(UserRole::Unknown))
}

/// Returns `true` when the user is bound to at least one currently-active
/// lease as `landlord` or `primary_tenant`.
///
/// Other lease participations (`agent_id`, listed `tenant_ids[]`) are
/// intentionally NOT included: an agent flipping to `landlord` does not
/// invalidate the agency relationship, and a listed-but-not-primary
/// tenant is not the responsible counterparty - blocking those would
/// over-restrict role changes for users with peripheral involvement.
/// The two roles that are checked are exactly the ones whose contractual
/// obligations would change meaning under a role flip.
///
/// Reads from the legacy `leases` table (P6); when
/// `app_1fa2dc8566_leases` becomes canonical, this query needs the table
/// rename - the function signature stays the same so the call site
/// does not need to change.
///
/// Runs inside the caller's transaction (`&mut PgConnection`) so the
/// gate runs under the same row lock as the role UPDATE: a lease
/// created concurrently between this check and the apply cannot slip
/// through, because the lease-creation path takes its own row lock on
/// the user and would block on us.
///
/// # Errors
///
/// Returns [`sqlx::Error`] for DB transport failures.
#[inline]
pub async fn has_blocking_leases(conn: &mut PgConnection, user_id: Uuid) -> Result<bool, Error> {
    let row = sqlx::query!(
        r#"
            SELECT EXISTS(
                SELECT 1 FROM leases
                WHERE status = 'active'
                  AND deleted_at IS NULL
                  AND (landlord_id = $1 OR primary_tenant_id = $1)
            ) AS "exists!"
        "#,
        user_id,
    )
    .fetch_one(&mut *conn)
    .await?;
    Ok(row.exists)
}

/// Applies a role change inside the caller's transaction.
///
/// Runs three statements as a single atomic unit (the caller is
/// expected to have already opened the transaction and locked the row
/// via [`lock_user_role`]):
///
/// 1. **`UPDATE users`** - rewrites `role`, stamps
///    `jwt_invalidate_before = NOW()` so the auth middleware kills every
///    outstanding access token, and bumps `updated_at` explicitly so the
///    column moves even when the standard `updated_at` trigger is not
///    deployed in tests.
/// 2. **`UPDATE refresh_tokens`** - revokes every active refresh row
///    for the user, forcing every device sharing the family to re-login.
/// 3. **`INSERT INTO audit_logs`** - records `old_role -> new_role`
///    with `status = 'success'`. We never insert from a failure path -
///    a failed UPDATE rolls back the whole transaction along with this
///    row, so the audit log can never disagree with the live `users`
///    state.
///
/// Roles arrive as `&str` because `users.role` is plain TEXT - using
/// the typed enum here would force a `to_string()` round-trip at the
/// call site and add nothing but a cloned `String` per request.
///
/// # Errors
///
/// Returns [`sqlx::Error`] for any DB failure. No UNIQUE constraint
/// touches `role`, so unique-violation cannot happen here; the caller
/// maps any error directly to 500 via the existing `From<sqlx::Error>`.
#[inline]
pub async fn apply_user_role_change(
    conn: &mut PgConnection,
    user_id: Uuid,
    old_role: &str,
    new_role: &str,
) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE users
            SET role = $2,
                jwt_invalidate_before = NOW(),
                updated_at = NOW()
            WHERE id = $1
        ",
        user_id,
        new_role,
    )
    .execute(&mut *conn)
    .await?;

    sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL
        ",
        user_id,
    )
    .execute(&mut *conn)
    .await?;

    sqlx::query!(
        r"
            INSERT INTO audit_logs (
                user_id,
                action,
                resource_type,
                resource_id,
                old_values,
                new_values,
                status
            )
            VALUES (
                $1,
                'change_role',
                'user',
                $1,
                jsonb_build_object('role', $2::text),
                jsonb_build_object('role', $3::text),
                'success'
            )
        ",
        user_id,
        old_role,
        new_role,
    )
    .execute(&mut *conn)
    .await?;

    Ok(())
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

/// Returns `true` when the user is bound to at least one currently-active lease
/// as `landlord_id` or `primary_tenant_id`.
///
/// Mirrors [`has_blocking_leases`] but kept as a separate function so the
/// role-change gate and the self-deletion gate can evolve independently:
/// extending the role-change predicate (e.g. to also block agents) must not
/// auto-broaden the deletion predicate, and vice versa. The two flows have
/// different "what does a contractual counterparty mean" semantics even when
/// the SQL happens to match today.
///
/// `deleted_at IS NULL` excludes already-soft-deleted leases so a stale row
/// from a previous tenancy does not lock the user out of leaving.
///
/// Runs as a plain `&PgPool` query rather than inside the soft-delete
/// transaction. A lease created concurrently between this check and the UPDATE
/// would in the worst case leave the lease pointing at a soft-deleted user -
/// the lease is itself paused (`deleted_at` cascades no further than the user
/// row), and the lease-creation path's own row lock on the user already
/// short-circuits via `lock_user_role`-style guards in the lease flow. The
/// simpler outer ordering (check, then soft-delete) reads more cleanly than a
/// multi-statement transaction here.
///
/// # Errors
///
/// Returns [`sqlx::Error`] for DB transport failures.
#[inline]
pub async fn has_active_lease_participation(pool: &PgPool, user_id: Uuid) -> Result<bool, Error> {
    let row = sqlx::query!(
        r#"
            SELECT EXISTS(
                SELECT 1 FROM leases
                WHERE status = 'active'
                  AND deleted_at IS NULL
                  AND (landlord_id = $1 OR primary_tenant_id = $1)
            ) AS "exists!"
        "#,
        user_id,
    )
    .fetch_one(pool)
    .await?;
    Ok(row.exists)
}

/// Soft-deletes a user account in a single transaction.
///
/// Runs four statements as one atomic unit so a partial failure cannot leave
/// the user with a half-deleted row (e.g. revoked refresh tokens but
/// `deleted_at` still NULL):
///
/// 1. **`DELETE FROM wallet_connections`** - removes every wallet binding
///    for the user. The AFTER-trigger
///    `trg_wallet_connections_sync_cache` recomputes
///    `users.wallet_address` to NULL automatically; we do NOT write the
///    cache column directly because that would race with the trigger
///    (and either duplicate the work or fight the trigger's UPDATE).
/// 2. **`UPDATE users`** - stamps `deleted_at = NOW()`, rewrites
///    `email` to a per-user placeholder
///    (`deleted-{uuid}@deleted.local`), bumps
///    `jwt_invalidate_before = NOW()` so the auth middleware kills every
///    outstanding access token, and refreshes `updated_at` explicitly
///    so the column moves even when the standard `updated_at` trigger is
///    not deployed in tests. The placeholder is generated DB-side
///    (`'deleted-' || $1::text || '@deleted.local'`) so the value
///    cannot drift between the call site's formatter and the schema's
///    UNIQUE expectation. It satisfies both the active
///    `users_email_unique` partial index (each user gets a distinct
///    address; soft-deleted rows are already excluded by the index's
///    own predicate) AND any future re-instatement of `email NOT NULL`,
///    so the column is never left in an "implicitly NULL" state.
/// 3. **`UPDATE refresh_tokens`** - revokes every active refresh row
///    for the user, mirroring the role-change path: every device
///    sharing the family is cut at the same instant the access
///    cookie's cutoff is bumped, no rotating chain survives.
/// 4. **`INSERT INTO audit_logs`** - records `self_delete_user` so a
///    moderator investigating a re-instatement request can prove the
///    deletion was self-initiated (vs. an admin action, which uses a
///    different `action` literal).
///
/// Returns [`Error::RowNotFound`] when the row is already soft-deleted
/// (or never existed). The JWT path makes the latter unreachable, so
/// the handler maps this to 404.
///
/// # Errors
///
/// - [`Error::RowNotFound`] when the user is already soft-deleted.
/// - [`sqlx::Error`] for DB transport failures.
#[inline]
pub async fn soft_delete_user(pool: &PgPool, user_id: Uuid) -> Result<(), Error> {
    let mut tx = pool.begin().await?;

    sqlx::query!(
        r"
            DELETE FROM wallet_connections
            WHERE user_id = $1
        ",
        user_id,
    )
    .execute(tx.as_mut())
    .await?;

    let rows_affected = sqlx::query!(
        r"
            UPDATE users
            SET deleted_at = NOW(),
                email = 'deleted-' || $1::text || '@deleted.local',
                jwt_invalidate_before = NOW(),
                updated_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
        ",
        user_id,
    )
    .execute(tx.as_mut())
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(Error::RowNotFound);
    }

    sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL
        ",
        user_id,
    )
    .execute(tx.as_mut())
    .await?;

    sqlx::query!(
        r"
            INSERT INTO audit_logs (
                user_id, action, resource_type, resource_id, status
            )
            VALUES ($1, 'self_delete_user', 'user', $1, 'success')
        ",
        user_id,
    )
    .execute(tx.as_mut())
    .await?;

    tx.commit().await?;

    Ok(())
}
