//! Database operations for favorites.
//!
//! All queries are tenant-scoped by `user_id`. The nested listing each favorite
//! points to is hydrated through [`listings_db::fetch_listings_by_ids`], so the
//! favorites layer owns only the join table and delegates listing assembly.

use chrono::{DateTime, Utc};
use sqlx::{Error, PgPool};
use uuid::Uuid;

use crate::services::{favorites::models::FavoriteResponse, listings::db as listings_db};

/// Outcome of an idempotent favorite insert.
#[derive(Debug)]
pub enum AddFavorite {
    /// Newly saved; carries the save timestamp.
    Added(DateTime<Utc>),
    /// Already saved by this tenant - a no-op.
    Duplicate,
    /// No live listing has that id.
    ListingNotFound,
}

/// Saves a listing for a tenant, idempotently, distinguishing a duplicate from
/// a missing listing in one round trip.
///
/// A single CTE gates on the listing being live, inserts with `ON CONFLICT DO
/// NOTHING`, and reports back both whether the listing exists and the inserted
/// `created_at` (NULL on a conflict). The handler maps the three cases to
/// `201`/`409`/`404`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn add_favorite(
    pool: &PgPool,
    user_id: Uuid,
    listing_id: Uuid,
) -> Result<AddFavorite, Error> {
    let row = sqlx::query!(
        r#"
            WITH live AS (
                SELECT id FROM listings WHERE id = $2 AND deleted_at IS NULL
            ),
            inserted AS (
                INSERT INTO favorites (user_id, listing_id)
                SELECT $1, id FROM live
                ON CONFLICT (user_id, listing_id) DO NOTHING
                RETURNING created_at
            )
            SELECT
                EXISTS (SELECT 1 FROM live) AS "listing_exists!",
                (SELECT created_at FROM inserted) AS "favorited_at?"
        "#,
        user_id,
        listing_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(match (row.listing_exists, row.favorited_at) {
        (false, _) => AddFavorite::ListingNotFound,
        (true, Some(favorited_at)) => AddFavorite::Added(favorited_at),
        (true, None) => AddFavorite::Duplicate,
    })
}

/// Removes a tenant's favorite, returning whether a row was actually deleted
/// (`false` => the listing was not favorited, so the handler answers `404`).
/// The `user_id` predicate is the owner check: a tenant can only unsave its own.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn remove_favorite(
    pool: &PgPool,
    user_id: Uuid,
    listing_id: Uuid,
) -> Result<bool, Error> {
    let result = sqlx::query!(
        r"
            DELETE FROM favorites
            WHERE user_id = $1 AND listing_id = $2
        ",
        user_id,
        listing_id,
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected() > 0)
}

/// Lists a tenant's saved listings (newest first), each with its nested
/// listing, plus the total count for pagination. Favorites whose listing is no
/// longer live (soft-withdrawn) are dropped by the join, so the count and the
/// page agree on the live set.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_favorites(
    pool: &PgPool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<(Vec<FavoriteResponse>, i64), Error> {
    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM favorites f
            JOIN listings l ON l.id = f.listing_id AND l.deleted_at IS NULL
            WHERE f.user_id = $1
        "#,
        user_id,
    )
    .fetch_one(pool)
    .await?;

    let entries = sqlx::query!(
        r"
            SELECT f.listing_id, f.created_at
            FROM favorites f
            JOIN listings l ON l.id = f.listing_id AND l.deleted_at IS NULL
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
            LIMIT $2 OFFSET $3
        ",
        user_id,
        limit,
        offset,
    )
    .fetch_all(pool)
    .await?;

    let ids = entries
        .iter()
        .map(|entry| entry.listing_id)
        .collect::<Vec<_>>();
    let mut listings = listings_db::fetch_listings_by_ids(pool, &ids).await?;
    let favorites = entries
        .into_iter()
        .filter_map(|entry| {
            listings
                .remove(&entry.listing_id)
                .map(|listing| FavoriteResponse {
                    listing_id: entry.listing_id,
                    favorited_at: entry.created_at,
                    listing,
                })
        })
        .collect();
    Ok((favorites, total))
}

/// Lists the ids of a tenant's saved listings (newest first), live ones only.
/// Drives the lightweight "is this favorited" UI state without hydrating each
/// listing.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_favorite_ids(pool: &PgPool, user_id: Uuid) -> Result<Vec<Uuid>, Error> {
    sqlx::query_scalar!(
        r"
            SELECT f.listing_id
            FROM favorites f
            JOIN listings l ON l.id = f.listing_id AND l.deleted_at IS NULL
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        ",
        user_id,
    )
    .fetch_all(pool)
    .await
}
