//! Database operations for authentication.

use core::str::FromStr;

use chrono::{DateTime, Utc};
use sqlx::{Error, PgConnection, PgPool};
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

/// Outcome of [`upsert_user_by_wallet`].
///
/// Each variant maps to a distinct handler response (200 vs. 403), so the
/// result is an exhaustive enum rather than a collapsed `Option`/error.
/// Mirrors the [`RefreshOutcome`] pattern used by the refresh-rotation
/// path in this same module.
#[derive(Debug)]
pub enum UpsertOutcome {
    /// Wallet resolved (existing or just-created) to an `active` user.
    Resolved(UserRecord),
    /// Wallet is linked to a user whose `status` is not `'active'`
    /// (suspended, inactive, or pending verification). Login must be
    /// rejected with 403 and no tokens issued.
    NotActive,
}

/// Resolves a user by wallet address, creating a new account if none exists.
///
/// Lookup goes through `wallet_connections` (the canonical multi-wallet table)
/// rather than `users.wallet_address` (a cached column). This lets a user log
/// in with any of their connected wallets - `cspr.click` SDK, Casper Wallet
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
/// Concurrent first-logins for the same wallet are race-safe: both INSERT
/// statements use `ON CONFLICT DO NOTHING`, and the loser rolls back its
/// transaction and retries through the SELECT branch, where it sees the
/// winner's row and falls into the UPDATE path. A bounded retry (two
/// attempts) prevents pathological loops while comfortably covering the
/// single race the constraints can produce.
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
/// Returns `sqlx::Error` on DB failure. Concurrent first-time logins for
/// the same wallet are handled internally and never surface as
/// unique-constraint errors to the caller.
#[inline]
pub async fn upsert_user_by_wallet(
    pool: &PgPool,
    email: &str,
    wallet_address: &str,
    role: UserRole,
) -> Result<UpsertOutcome, Error> {
    let role_str = role.to_string();

    for _ in 0..2 {
        let mut tx = pool.begin().await?;

        let existing = sqlx::query!(
            r"
                SELECT u.id, u.role, u.verification_level, u.status
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

        if let Some(row) = existing {
            // Status gate: only `active` users may receive tokens. The
            // SELECT above intentionally does not filter on status so we
            // can distinguish "wallet unknown" (-> create new account)
            // from "wallet known but suspended/inactive" (-> 403). A
            // status filter inside the SELECT would collapse both cases
            // into the INSERT branch and accidentally provision a fresh
            // active account on top of a deliberately-disabled one.
            if row.status.as_deref() != Some("active") {
                // No mutating writes happened in this branch, so the
                // transaction simply rolls back on drop.
                return Ok(UpsertOutcome::NotActive);
            }

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

            tx.commit().await?;
            return Ok(UpsertOutcome::Resolved(UserRecord {
                id: row.id,
                role: row.role,
                verification_level,
            }));
        }

        // `users_email_unique` is a partial index
        // (`WHERE email IS NOT NULL AND deleted_at IS NULL`), so the
        // `ON CONFLICT` target must repeat that predicate verbatim or
        // Postgres rejects the statement with "no unique or exclusion
        // constraint matching the ON CONFLICT specification".
        let inserted_user = sqlx::query!(
            r"
                INSERT INTO users (email, role, first_name, last_name, auth_id, status, last_login_at)
                VALUES ($1, $2, 'Wallet', 'User', NULL, 'active', NOW())
                ON CONFLICT (email) WHERE email IS NOT NULL AND deleted_at IS NULL DO NOTHING
                RETURNING id, role, verification_level
            ",
            email,
            role_str,
        )
        .fetch_optional(tx.as_mut())
        .await?;

        let Some(inserted) = inserted_user else {
            // Race lost on email: another transaction created this user
            // first. Roll back and retry through the SELECT branch.
            tx.rollback().await?;
            continue;
        };

        // `wallet_connections` has no unique on `wallet_address` alone -
        // only the composite `UNIQUE (user_id, wallet_address)`. The pair
        // is the only collision possible in this branch (same user just
        // inserted, same wallet) and a `DO NOTHING` keeps the operation
        // idempotent if a parallel retry observes the same state.
        sqlx::query!(
            r"
                INSERT INTO wallet_connections (user_id, wallet_address, provider, is_primary, is_custodial)
                VALUES ($1, $2, 'casper_wallet', true, false)
                ON CONFLICT (user_id, wallet_address) DO NOTHING
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

        tx.commit().await?;
        return Ok(UpsertOutcome::Resolved(UserRecord {
            id: inserted.id,
            role: inserted.role,
            verification_level,
        }));
    }

    // Retry budget exhausted: both iterations lost the email-conflict
    // race without the SELECT branch ever observing the committed row.
    // Surface this as `Error::Protocol` rather than `RowNotFound` -
    // `RowNotFound` is mapped to HTTP 404 ("Resource not found") by the
    // `From<sqlx::Error> for ApiError` impl, which would mislead callers
    // into thinking the wallet itself was missing. The catch-all arm in
    // `errors.rs` routes `Error::Protocol` through `ApiError::Database`
    // -> HTTP 500, which is the correct status for a server-side
    // contention failure.
    Err(Error::Protocol(
        "upsert_user_by_wallet: retry budget exhausted".to_owned(),
    ))
}

/// Revokes every still-active `refresh_tokens` row for the given user.
///
/// Called at login time so a fresh login invalidates any prior session (web
/// browser, mobile, stolen cookie). The match condition is `revoked_at IS NULL`
/// rather than `expires_at > NOW()` because we want
/// already-expired-but-not-revoked rows to be cleaned up too: leaving a
/// dangling row with `revoked_at IS NULL` is what would otherwise let the
/// partial unique index (`(token_hash) WHERE revoked_at IS NULL`) silently
/// block a future hash collision recovery.
///
/// UX trade-off: this enforces a **single-device session model**. Logging in on
/// phone forcibly logs out web; the simultaneous-multi-device case is not yet
/// supported because we have no per-session metadata - refresh rows are
/// anonymous beyond `user_id` and `family_id`, so we cannot tell "phone" apart
/// from "web" to revoke selectively. When session-listing lands (with the
/// per-session capture re-introduced), this function should be replaced by
/// "revoke other sessions" exposed through a `DELETE /sessions/:id` endpoint
/// instead of being implicit in `login`.
///
/// # Errors
///
/// Returns `sqlx::Error` on DB failure. Upstream maps `?` -> `ApiError` like
/// every other db call in this module.
#[inline]
pub async fn revoke_all_active_refresh_tokens_for_user(
    conn: &mut PgConnection,
    user_id: Uuid,
) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL
        ",
        user_id,
    )
    .execute(conn)
    .await?;
    Ok(())
}

/// Inserts a fresh `refresh_tokens` row and returns its primary key.
///
/// `token_hash` is the raw SHA-256 of the opaque plaintext - never the
/// plaintext itself. The plaintext is returned to the caller exactly once (in
/// the `Set-Cookie` header) and only the hash is persisted.
///
/// `family_id` groups all rotations of one login session: at first login the
/// caller passes a brand-new UUID; on rotation the new row inherits the
/// predecessor's `family_id`. Reuse-detection later revokes the entire family
/// in one statement.
///
/// `replaced_by` is left NULL here - it is set on the predecessor row during
/// rotation, not at issuance.
///
/// # Errors
///
/// Returns `sqlx::Error` on DB failure. The partial unique index on
/// `(token_hash) WHERE revoked_at IS NULL` would surface the
/// astronomically-unlikely SHA-256 collision as a unique-violation; upstream
/// maps that to `ApiError::Conflict`.
#[inline]
pub async fn insert_refresh_token(
    conn: &mut PgConnection,
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
    .fetch_one(conn)
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

    // Insert the successor BEFORE pointing the predecessor at it. The
    // `replaced_by` FK references `refresh_tokens(id)` and is checked
    // immediately (PostgreSQL FKs are NOT DEFERRABLE by default), so
    // back-pointing to a row that does not yet exist trips a foreign-key
    // violation even inside a single transaction. The two writes still
    // commit atomically - external observers never see the intermediate
    // "successor exists, predecessor not yet revoked" state because the
    // FOR UPDATE lock holds them off until COMMIT.
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

    tx.commit().await?;

    Ok(RefreshOutcome::Rotated(RotatedRefresh {
        user_id: row.user_id,
        family_id: row.family_id,
        role,
        verification_level,
    }))
}

/// Returns the `users.jwt_invalidate_before` value for the given user, if set.
///
/// Used by the auth middleware to enforce force-revoke flows: any access
/// token whose `iat` claim is at or below this cutoff must be rejected,
/// even though its `exp` is still in the future and its `jti` is not in
/// the logout blocklist.
///
/// The query intentionally does NOT filter on `deleted_at IS NULL`.
/// `soft_delete_user` stamps `deleted_at` AND `jwt_invalidate_before`
/// in the same UPDATE, so a soft-deleted user's row carries a non-NULL
/// cutoff that must reach the middleware. Filtering deleted rows here
/// would mask the cutoff and let the JWT through on `AuthUser` endpoints
/// that never load the user profile (`tax::calculate_tax_liability`,
/// `analytics::get_property_performance`) - the soft-deleted user would
/// retain full access to those endpoints until the JWT's natural expiry.
///
/// `Ok(None)` therefore means exactly one thing: no force-revoke event
/// has ever been recorded for this user (or the row is absent entirely).
///
/// # Errors
///
/// Returns `sqlx::Error` on infrastructure failure. Upstream maps `?` to
/// `ApiError::Internal` so the middleware fails closed on DB outages.
#[inline]
pub async fn fetch_jwt_invalidate_before(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<DateTime<Utc>>, Error> {
    let row = sqlx::query!(
        r"
            SELECT jwt_invalidate_before
            FROM users
            WHERE id = $1
        ",
        user_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.and_then(|r| r.jwt_invalidate_before))
}

/// Fetches the user's email for the verification-send flow.
///
/// Returns `Ok(None)` when the user has no email set (`users.email` is
/// nullable - wallet-only accounts exist), which the send handler maps to
/// `400 email_not_set`. A missing row collapses to the same `None`; a token
/// that passed `AuthUser` always corresponds to a real user, so in practice
/// `None` means "email not set", not "user gone".
///
/// # Errors
///
/// Returns `sqlx::Error` on infrastructure failure (connection, decode).
#[inline]
pub async fn fetch_user_email_for_verify(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<String>, Error> {
    let row = sqlx::query!(
        r"
            SELECT email
            FROM users
            WHERE id = $1
        ",
        user_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.and_then(|r| r.email))
}

/// Revokes every active row in the family that contains `presented_hash`.
///
/// Idempotent and tolerant by design - the logout handler calls this with a
/// raw cookie value the client supplied, so the hash may not match anything
/// (already-rotated, never-existed, or garbage). In every case the call is a
/// successful no-op rather than an error: logout is meant to leave the
/// account in a defined state regardless of what the client presents.
///
/// Already-revoked rows in the matched family are left untouched so their
/// original `revoked_at` timestamps are preserved for audit.
///
/// # Errors
///
/// Returns `sqlx::Error` only on infrastructure failure (connection drop,
/// statement-cache miss, etc.). The "no rows match" outcome is normal and
/// surfaces as `Ok(())` with `rows_affected = 0`.
#[inline]
pub async fn revoke_refresh_family_by_hash(
    pool: &PgPool,
    presented_hash: &[u8],
) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE family_id = (
                SELECT family_id
                FROM refresh_tokens
                WHERE token_hash = $1
                LIMIT 1
            )
              AND revoked_at IS NULL
        ",
        presented_hash,
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// One row of [`list_active_sessions`].
///
/// `token_hash` is intentionally exposed (instead of being hidden behind an
/// `is_current` boolean computed in the db layer) so the handler can do a
/// constant-time comparison against the SHA-256 of the request's refresh cookie
/// WITHOUT a second SQL trip and without leaking either the cookie or the
/// stored hashes back into a logged query parameter.
#[derive(Debug)]
pub struct ActiveSession {
    /// Primary key of the `refresh_tokens` row.
    pub id: Uuid,
    /// Family id - all tokens rotated from the same login share it. The handler
    /// does not currently expose this to the client (sessions UI shows one
    /// entry per login, not per rotation), but db consumers running
    /// `revoke-all` need it later in PR #6.
    pub family_id: Uuid,
    /// Wall-clock issuance timestamp.
    pub issued_at: DateTime<Utc>,
    /// Absolute expiration timestamp. Already past `NOW()` rows are excluded by
    /// the SELECT, so this is always strictly in the future.
    pub expires_at: DateTime<Utc>,
    /// SHA-256 of the opaque refresh-token plaintext (BYTEA in schema).
    /// Compared against `sha256(request_cookie_value)` in the handler to flag
    /// the session that issued the current request.
    pub token_hash: Vec<u8>,
}

/// Returns every currently-usable refresh-token row owned by `user_id`,
/// newest issuance first.
///
/// "Currently-usable" means `revoked_at IS NULL AND expires_at > NOW()`.
/// Already-revoked-but-not-yet-pruned rows are excluded so the sessions UI
/// never shows a session the user just terminated, and expired-but-still-
/// alive rows are excluded so we do not advertise dead handles to refresh.
///
/// Ordering by `issued_at DESC` puts the freshest row first, which is the
/// only ordering the sessions list UI actually needs - clients render the
/// rows top-down and the most-recent login is the most relevant entry.
///
/// # Errors
///
/// Returns [`Error`] for DB transport failures.
#[inline]
pub async fn list_active_sessions(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<ActiveSession>, Error> {
    let rows = sqlx::query!(
        r"
            SELECT id, family_id, issued_at, expires_at, token_hash
            FROM refresh_tokens
            WHERE user_id = $1
              AND revoked_at IS NULL
              AND expires_at > NOW()
            ORDER BY issued_at DESC
        ",
        user_id,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| ActiveSession {
            id: row.id,
            family_id: row.family_id,
            issued_at: row.issued_at,
            expires_at: row.expires_at,
            token_hash: row.token_hash,
        })
        .collect())
}

/// Revokes a single refresh-token row owned by `user_id`.
///
/// Wrapped in a transaction with `SELECT ... FOR UPDATE` on the row so the
/// revoke does not race with `rotate_refresh_token` (which holds the same
/// `FOR UPDATE OF rt` lock on its predecessor): if a rotation is in flight
/// for this exact id, our UPDATE blocks until the rotation commits, and we
/// then either revoke the no-longer-active row (rotation already revoked
/// it -> our UPDATE matches zero rows -> false) or we revoke a row the
/// rotation chose not to rotate (also fine).
///
/// `user_id` is part of the WHERE clause so a forged path parameter from
/// user A cannot revoke user B's session - the row simply does not match
/// and the function returns `false` without leaking existence.
///
/// # Returns
///
/// `true` if exactly one row was revoked, `false` if no row matched
/// (id unknown, already revoked, expired, or not owned by `user_id`).
/// Handlers map `false` -> 404 to keep the contract uniform across the
/// "session never existed" and "session already gone" cases.
///
/// # Errors
///
/// Returns [`Error`] for DB transport failures. Caller is expected
/// to map via `From<sqlx::Error> for ApiError` (no special-casing needed).
#[inline]
pub async fn revoke_session_by_id(
    pool: &PgPool,
    user_id: Uuid,
    session_id: Uuid,
) -> Result<bool, Error> {
    let mut tx = pool.begin().await?;

    let locked = sqlx::query!(
        r"
            SELECT id
            FROM refresh_tokens
            WHERE id = $1
              AND user_id = $2
              AND revoked_at IS NULL
            FOR UPDATE
        ",
        session_id,
        user_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    if locked.is_none() {
        return Ok(false);
    }

    let rows_affected = sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
        ",
        session_id,
        user_id,
    )
    .execute(tx.as_mut())
    .await?
    .rows_affected();

    tx.commit().await?;

    Ok(rows_affected == 1)
}

/// Revokes every active refresh-token row for `user_id`, optionally
/// preserving the row identified by `keep_token_hash`, and conditionally
/// stamps `users.jwt_invalidate_before` to invalidate every outstanding
/// access token.
///
/// All side effects run inside one transaction: an audit-log INSERT
/// failure rolls the revoke and the cutoff bump back together, so the
/// audit trail can never disagree with the live state.
///
/// Two orthogonal axes:
///
/// - `keep_token_hash = Some(hash)` -> rows whose `token_hash` matches
///   the supplied bytes are preserved. The handler passes the SHA-256 of
///   the caller's refresh cookie here when running the "log out other
///   devices" mode, so the caller's session keeps working. `None`
///   revokes every active row including the caller's.
/// - `keep_current` -> drives both the `users.jwt_invalidate_before`
///   bump (skipped when `true`, stamped when `false`) and the boolean
///   echoed verbatim into `audit_logs.metadata`. Two orthogonal flags
///   instead of one let a future surface ask for "keep one refresh row
///   AND still bump the cutoff" if needed; today the handler always
///   pairs `Some(...) + true` or `None + false`.
///
/// Returns the number of refresh rows actually transitioned from active
/// to revoked - already-revoked rows in the user's account are not
/// counted. The handler echoes this in the response so the UI can
/// render "n other devices signed out" without a follow-up read.
///
/// # Errors
///
/// Returns [`Error`] for DB transport failures.
#[inline]
pub async fn revoke_all_sessions_for_user(
    pool: &PgPool,
    user_id: Uuid,
    keep_token_hash: Option<&[u8]>,
    keep_current: bool,
) -> Result<u64, Error> {
    let mut tx = pool.begin().await?;

    let revoked = sqlx::query!(
        r"
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE user_id = $1
              AND revoked_at IS NULL
              AND ($2::bytea IS NULL OR token_hash != $2)
        ",
        user_id,
        keep_token_hash,
    )
    .execute(tx.as_mut())
    .await?
    .rows_affected();

    if !keep_current {
        // `updated_at = NOW()` is bumped explicitly so the column moves
        // even when the standard `updated_at` trigger is not deployed in
        // tests - same rationale as `apply_user_role_change`.
        sqlx::query!(
            r"
                UPDATE users
                SET jwt_invalidate_before = NOW(), updated_at = NOW()
                WHERE id = $1 AND deleted_at IS NULL
            ",
            user_id,
        )
        .execute(tx.as_mut())
        .await?;
    }

    sqlx::query!(
        r"
            INSERT INTO audit_logs (
                user_id,
                action,
                resource_type,
                resource_id,
                metadata,
                status
            )
            VALUES (
                $1,
                'revoke_all_sessions',
                'user',
                $1,
                jsonb_build_object('keep_current', $2::bool),
                'success'
            )
        ",
        user_id,
        keep_current,
    )
    .execute(tx.as_mut())
    .await?;

    tx.commit().await?;

    Ok(revoked)
}

/// Outcome of [`confirm_email_verification`].
///
/// The two arms drive different handler behaviour, so this is an enum
/// rather than a `bool`: only the `Verified` transition warrants a fresh
/// access/refresh pair. `AlreadyVerified` means another path (admin manual
/// set, or a duplicate confirm tap) flipped the flag first - re-issuing
/// there would revoke the user's other live sessions for a no-op action,
/// so the handler returns the current profile without touching cookies.
#[derive(Debug, Eq, PartialEq)]
pub enum VerifyConfirmOutcome {
    /// `email_verified` transitioned `false -> true` in this call. The
    /// handler must re-issue tokens so the bumped `verification_level`
    /// reaches the access claim immediately.
    Verified,
    /// The user was already `email_verified = true` (or soft-deleted) when
    /// the UPDATE ran, so it matched zero rows. No audit row is written and
    /// no tokens are re-issued.
    AlreadyVerified,
}

/// Marks the user's email verified and records the audit trail, atomically.
///
/// The UPDATE is guarded by `email_verified = FALSE` so a concurrent admin
/// set or a double-submit collapses to zero rows and
/// [`VerifyConfirmOutcome::AlreadyVerified`] instead of writing a spurious
/// second audit entry. The `trg_users_sync_verification_level` BEFORE-trigger
/// recomputes `verification_level` inside the same statement, so the audit
/// row's `new_values` reads the already-upgraded level straight from the
/// row rather than recomputing it in Rust.
///
/// The audit INSERT uses `INSERT ... SELECT FROM users` to pull
/// `email`/`role`/`verification_level` from the just-updated row in one
/// trip; `$2::text::inet` lets the caller pass the client IP as a plain
/// string (sqlx is built without the `inet` type feature) while Postgres
/// parses it into the `inet` column. Both the UPDATE and the INSERT share
/// one transaction so the verified flag and its audit record commit together
/// or not at all.
///
/// # Errors
///
/// Returns `sqlx::Error` on any DB failure; both writes roll back together.
#[inline]
pub async fn confirm_email_verification(
    pool: &PgPool,
    user_id: Uuid,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
) -> Result<VerifyConfirmOutcome, Error> {
    let mut tx = pool.begin().await?;

    let updated = sqlx::query!(
        r"
            UPDATE users
            SET email_verified = TRUE
            WHERE id = $1 AND email_verified = FALSE AND deleted_at IS NULL
            RETURNING id
        ",
        user_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    if updated.is_none() {
        // Nothing mutated; the transaction rolls back on drop. No audit row
        // for a no-op confirm.
        return Ok(VerifyConfirmOutcome::AlreadyVerified);
    }

    sqlx::query!(
        r"
            INSERT INTO audit_logs (
                user_id,
                user_email,
                user_role,
                action,
                resource_type,
                resource_id,
                new_values,
                status,
                ip_address,
                user_agent,
                request_method,
                request_path
            )
            SELECT
                u.id,
                u.email,
                u.role,
                'verify_email',
                'user',
                u.id,
                jsonb_build_object('verification_level', u.verification_level),
                'success',
                $2::text::inet,
                $3,
                'POST',
                '/auth/verify/email/confirm'
            FROM users u
            WHERE u.id = $1
        ",
        user_id,
        ip_address,
        user_agent,
    )
    .execute(tx.as_mut())
    .await?;

    tx.commit().await?;

    Ok(VerifyConfirmOutcome::Verified)
}
