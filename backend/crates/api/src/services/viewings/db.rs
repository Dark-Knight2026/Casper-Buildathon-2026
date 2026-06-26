//! Database operations for viewings.
//!
//! `landlord_id` is denormalized from the listing at booking time. The nested
//! listing in `GET /viewings` is hydrated through
//! [`listings_db::fetch_listings_by_ids`]; a booking outlives a withdrawn
//! listing, so that nested listing is optional.

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::{Error, FromRow, PgPool};
use uuid::Uuid;

use crate::services::{
    listings::db as listings_db,
    viewings::models::{Viewing, ViewingStatus},
};

/// A viewing row as stored. `status` stays `String` here and is parsed at the
/// model boundary.
#[derive(Debug, FromRow)]
pub struct ViewingRow {
    /// Viewing id.
    pub id: Uuid,
    /// Listing this booking targets.
    pub listing_id: Uuid,
    /// Booking tenant user id.
    pub user_id: Uuid,
    /// Reviewing landlord user id.
    pub landlord_id: Uuid,
    /// Requested viewing date.
    pub viewing_date: NaiveDate,
    /// Requested viewing time (free-form string).
    pub viewing_time: String,
    /// Booking status (TEXT).
    pub status: String,
    /// Booking timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Validated input for [`book_viewing`]; `listing_id`/`user_id`/`landlord_id`
/// are supplied by the handler and the listing lookup.
#[derive(Debug)]
pub struct NewViewing {
    /// Requested viewing date.
    pub viewing_date: NaiveDate,
    /// Requested viewing time.
    pub viewing_time: String,
}

/// Outcome of a booking attempt.
#[derive(Debug)]
pub enum BookOutcome {
    /// Created; carries the fresh row (boxed - it dwarfs the unit variant).
    Created(Box<ViewingRow>),
    /// No active listing has that id, so there is nothing to book.
    ListingUnavailable,
}

/// Books a tenant's viewing against an active listing, denormalizing the
/// listing's lister into `landlord_id`.
///
/// One atomic `INSERT ... SELECT`: the active-listing gate lives in the
/// `SELECT`'s `WHERE`, so a missing/inactive listing inserts nothing (an empty
/// `RETURNING` becomes [`BookOutcome::ListingUnavailable`]) with no
/// check-then-insert window.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn book_viewing(
    pool: &PgPool,
    listing_id: Uuid,
    tenant_id: Uuid,
    new: NewViewing,
) -> Result<BookOutcome, Error> {
    let row = sqlx::query_as!(
        ViewingRow,
        r"
            INSERT INTO viewings (
                listing_id, user_id, landlord_id, viewing_date, viewing_time
            )
            SELECT l.id, $1, l.listed_by, $2, $3
            FROM listings l
            WHERE l.id = $4 AND l.state = 'active' AND l.deleted_at IS NULL
            RETURNING
                id, listing_id, user_id, landlord_id, viewing_date,
                viewing_time, status, created_at, updated_at
        ",
        tenant_id,
        new.viewing_date,
        new.viewing_time,
        listing_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(match row {
        Some(viewing) => BookOutcome::Created(Box::new(viewing)),
        None => BookOutcome::ListingUnavailable,
    })
}

/// Lists a tenant's own bookings (newest first), each with its nested listing,
/// plus the total count for pagination. A booking whose listing was withdrawn
/// keeps a `null` listing rather than disappearing.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_my_viewings(
    pool: &PgPool,
    tenant_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<(Vec<Viewing>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page, so the total and the
    // returned page cannot disagree under concurrent bookings.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM viewings
            WHERE user_id = $1
        "#,
        tenant_id,
    )
    .fetch_one(tx.as_mut())
    .await?;

    let rows = sqlx::query_as!(
        ViewingRow,
        r"
            SELECT
                id, listing_id, user_id, landlord_id, viewing_date,
                viewing_time, status, created_at, updated_at
            FROM viewings
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        ",
        tenant_id,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;
    tx.commit().await?;

    // Hydrate the nested listings after the snapshot closes: a separate table,
    // and optional (a booking outlives a withdrawn listing).
    let listing_ids = rows.iter().map(|row| row.listing_id).collect::<Vec<_>>();
    let listings = listings_db::fetch_listings_by_ids(pool, &listing_ids).await?;
    let viewings = rows
        .into_iter()
        .map(|row| {
            let listing = listings.get(&row.listing_id).cloned();
            Viewing::assemble(row, listing)
        })
        .collect();
    Ok((viewings, total))
}

/// Lists the bookings made against a listing (newest first) plus the total
/// count. The caller's ownership of the listing is asserted upstream, so this
/// read is unscoped beyond `listing_id`. No nested listing - the landlord
/// already holds it.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_listing_viewings(
    pool: &PgPool,
    listing_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<(Vec<Viewing>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page, so the total and the
    // returned page cannot disagree under concurrent bookings.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM viewings
            WHERE listing_id = $1
        "#,
        listing_id,
    )
    .fetch_one(tx.as_mut())
    .await?;

    let rows = sqlx::query_as!(
        ViewingRow,
        r"
            SELECT
                id, listing_id, user_id, landlord_id, viewing_date,
                viewing_time, status, created_at, updated_at
            FROM viewings
            WHERE listing_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        ",
        listing_id,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;
    tx.commit().await?;

    let viewings = rows
        .into_iter()
        .map(|row| Viewing::assemble(row, None))
        .collect();
    Ok((viewings, total))
}

/// Cancels (hard-deletes) a tenant's own booking, returning whether a row was
/// actually deleted (`false` => no such booking for this tenant under that
/// listing, so the handler answers `404`). The `user_id` predicate is the owner
/// check; `listing_id` keeps the delete consistent with the path.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn cancel_viewing(
    pool: &PgPool,
    listing_id: Uuid,
    viewing_id: Uuid,
    tenant_id: Uuid,
) -> Result<bool, Error> {
    let result = sqlx::query!(
        r"
            DELETE FROM viewings
            WHERE id = $1 AND listing_id = $2 AND user_id = $3
        ",
        viewing_id,
        listing_id,
        tenant_id,
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected() > 0)
}

/// Outcome of a landlord's confirm/reject.
#[derive(Debug)]
pub enum ReviewOutcome {
    /// Reviewed; carries the fresh row (boxed - it dwarfs the unit variants).
    Updated(Box<ViewingRow>),
    /// No booking with that id exists under that listing.
    NotFound,
    /// The booking is not `pending`, so it cannot be reviewed again.
    NotPending,
}

/// Moves a booking from `pending` to a terminal status, atomically. The
/// caller's ownership of the listing is asserted upstream, so this scopes by
/// `listing_id` only.
///
/// A `SELECT ... FOR UPDATE` locks the row so the pending-state check and the
/// write share one snapshot. A booking that is not under the given listing is
/// [`ReviewOutcome::NotFound`]; an already-decided one is
/// [`ReviewOutcome::NotPending`].
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn update_viewing_status(
    pool: &PgPool,
    listing_id: Uuid,
    viewing_id: Uuid,
    status: ViewingStatus,
) -> Result<ReviewOutcome, Error> {
    let mut tx = pool.begin().await?;

    let current = sqlx::query_scalar!(
        r"
            SELECT status
            FROM viewings
            WHERE id = $1 AND listing_id = $2
            FOR UPDATE
        ",
        viewing_id,
        listing_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current_status) = current else {
        return Ok(ReviewOutcome::NotFound);
    };
    if current_status != "pending" {
        return Ok(ReviewOutcome::NotPending);
    }

    let row = sqlx::query_as!(
        ViewingRow,
        r"
            UPDATE viewings
            SET status = $3
            WHERE id = $1 AND listing_id = $2
            RETURNING
                id, listing_id, user_id, landlord_id, viewing_date,
                viewing_time, status, created_at, updated_at
        ",
        viewing_id,
        listing_id,
        status.to_string(),
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(ReviewOutcome::Updated(Box::new(row)))
}
