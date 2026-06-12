//! Database operations for listings.
//!
//! Detail/media reads use compile-time `sqlx` macros (with JSONB and
//! nullable-defaulted overrides); the public `GET /listings` search uses a
//! runtime `QueryBuilder` because its filter set is dynamic. Nested property
//! and media are batch-loaded by id to avoid N+1.

use core::str::FromStr;
use std::collections::HashMap;

use chrono::{DateTime, Duration, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Error, FromRow, PgPool, Postgres, QueryBuilder, types::Json};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult},
    services::{
        listings::models::{
            Listing, ListingHistoricalData, ListingState, ListingStatistics, MediaRef,
        },
        properties::{db::PropertyRow, models::Property},
    },
};

/// A listing row as stored. Enum-typed fields (`intent`/`state`/
/// `authority_tier`) stay `String` here and are parsed at the model boundary.
#[derive(Debug, FromRow)]
pub struct ListingRow {
    /// Listing id.
    pub id: Uuid,
    /// Physical property id.
    pub property_id: Uuid,
    /// Lister user id.
    pub listed_by: Uuid,
    /// Offer intent.
    pub intent: String,
    /// Lifecycle state.
    pub state: String,
    /// Days on market.
    pub days_on_market: i32,
    /// Auto-expiry timestamp.
    pub expires_at: Option<DateTime<Utc>>,
    /// Title.
    pub title: String,
    /// Description.
    pub description: String,
    /// Amenities.
    pub amenities: Vec<String>,
    /// Utilities included.
    pub utilities_included: Vec<String>,
    /// Pet policy label.
    pub pet_policy: Option<String>,
    /// Available date.
    pub available_date: Option<NaiveDate>,
    /// Surrounding POIs (JSONB).
    pub surrounding_area: Json<Value>,
    /// Polymorphic terms (JSONB).
    pub terms: Json<Value>,
    /// Unique-tenant view count.
    pub views: i32,
    /// Gate 1 - identity verified.
    pub identity_verified: bool,
    /// Gate 2 - authority tier.
    pub authority_tier: String,
    /// Gate 3 - Fair Housing cleared.
    pub fair_housing_cleared: bool,
    /// PM attribution.
    pub managed_by_pm: bool,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// A media row as stored. `listing_id` is carried so batch reads can group.
#[derive(Debug, FromRow)]
pub struct MediaRow {
    /// Media id.
    pub id: Uuid,
    /// Owning listing id.
    pub listing_id: Uuid,
    /// CDN-fronted URL.
    pub url: String,
    /// IPFS content id.
    pub cid: Option<String>,
    /// Display ordering.
    pub position: i32,
    /// Moderation state (TEXT).
    pub moderation_status: String,
}

/// Whitelisted sort keys for the public listing search.
#[derive(Debug, Clone, Copy)]
pub enum ListingSort {
    /// By creation time.
    CreatedAt,
    /// By last update time.
    UpdatedAt,
    /// By available date.
    AvailableDate,
    /// By monthly rent (from terms).
    Rent,
    /// By distance from the radius center.
    Distance,
}

impl ListingSort {
    /// Parses a `sortBy` value, defaulting to `CreatedAt`.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] for an unknown key, or for
    /// `distance` without a radius center.
    #[inline]
    pub fn parse(value: Option<&str>, has_center: bool) -> ApiResult<Self> {
        let sort = match value {
            None | Some("createdAt") => Self::CreatedAt,
            Some("updatedAt") => Self::UpdatedAt,
            Some("availableDate") => Self::AvailableDate,
            Some("rent") => Self::Rent,
            Some("distance") => {
                if !has_center {
                    return Err(ApiError::BadRequest(
                        "sortBy=distance requires nearLat/nearLng".to_owned(),
                    ));
                }
                Self::Distance
            }
            Some(other) => {
                return Err(ApiError::BadRequest(format!("unknown sortBy '{other}'")));
            }
        };
        Ok(sort)
    }

    /// SQL ORDER-BY expression for non-distance sorts (distance is handled
    /// inline with its bound center).
    fn order_column(self) -> &'static str {
        match self {
            Self::CreatedAt | Self::Distance => "l.created_at",
            Self::UpdatedAt => "l.updated_at",
            Self::AvailableDate => "l.available_date",
            Self::Rent => "(l.terms->>'rentMonthly')::numeric",
        }
    }
}

/// Validated filter for [`list_active_listings`]. Absent fields impose no
/// constraint; limit/offset are pre-clamped by the pagination layer.
#[derive(Debug)]
pub struct ListingFilter {
    /// ILIKE term over title + address.
    pub search: Option<String>,
    /// Radius-center latitude.
    pub near_lat: Option<f64>,
    /// Radius-center longitude.
    pub near_lng: Option<f64>,
    /// Radius in miles.
    pub radius_miles: Option<f64>,
    /// Bounding-box min longitude.
    pub bbox_min_lng: Option<f64>,
    /// Bounding-box min latitude.
    pub bbox_min_lat: Option<f64>,
    /// Bounding-box max longitude.
    pub bbox_max_lng: Option<f64>,
    /// Bounding-box max latitude.
    pub bbox_max_lat: Option<f64>,
    /// Intent filter.
    pub intent: Option<String>,
    /// Property-type filter.
    pub property_type: Option<String>,
    /// Minimum monthly rent.
    pub min_rent: Option<f64>,
    /// Maximum monthly rent.
    pub max_rent: Option<f64>,
    /// Minimum bedrooms.
    pub min_bedrooms: Option<i32>,
    /// Maximum bedrooms.
    pub max_bedrooms: Option<i32>,
    /// Pets allowed (pet policy not "No Pets").
    pub pets_allowed: Option<bool>,
    /// Furnished (per terms).
    pub furnished: Option<bool>,
    /// Sort key.
    pub sort: ListingSort,
    /// Descending order.
    pub sort_descending: bool,
    /// Page size.
    pub limit: i64,
    /// Page offset.
    pub offset: i64,
}

/// Columns selected into a [`ListingRow`] for the search query (aliased to `l`).
const LISTING_COLUMNS: &str = "l.id, l.property_id, l.listed_by, l.intent, \
    l.state, l.days_on_market, l.expires_at, l.title, l.description, \
    l.amenities, l.utilities_included, l.pet_policy, l.available_date, \
    l.surrounding_area, l.terms, l.views, l.identity_verified, \
    l.authority_tier, l.fair_housing_cleared, l.managed_by_pm, l.created_at, \
    l.updated_at";

/// Fetches a single listing by id (any non-deleted state).
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when no live listing has that id, or any
/// other database error.
#[inline]
pub async fn fetch_listing(pool: &PgPool, listing_id: Uuid) -> Result<ListingRow, Error> {
    sqlx::query_as!(
        ListingRow,
        r#"
            SELECT
                id, property_id, listed_by, intent, state, days_on_market,
                expires_at, title, description, amenities, utilities_included,
                pet_policy, available_date,
                surrounding_area AS "surrounding_area: Json<serde_json::Value>",
                terms AS "terms: Json<serde_json::Value>",
                views, identity_verified, authority_tier, fair_housing_cleared,
                managed_by_pm,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM listings
            WHERE id = $1 AND deleted_at IS NULL
        "#,
        listing_id,
    )
    .fetch_one(pool)
    .await
}

/// Fetches a listing's approved media, ordered for display.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_listing_media(pool: &PgPool, listing_id: Uuid) -> Result<Vec<MediaRow>, Error> {
    sqlx::query_as!(
        MediaRow,
        r#"
            SELECT id, listing_id, url, cid, position, moderation_status
            FROM listing_media
            WHERE listing_id = $1 AND moderation_status = 'approved'
            ORDER BY position ASC
        "#,
        listing_id,
    )
    .fetch_all(pool)
    .await
}

/// Public search over active listings: a filtered, geo-aware, paginated page
/// plus the total match count. Nested property and media are batch-loaded.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_active_listings(
    pool: &PgPool,
    filter: &ListingFilter,
) -> Result<(Vec<Listing>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page + batch loads, so the total
    // and the returned page can never disagree under concurrent writes.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let mut count_builder = QueryBuilder::<Postgres>::new(
        "SELECT COUNT(*) FROM listings l \
         JOIN properties p ON p.id = l.property_id \
         WHERE l.state = 'active' AND l.deleted_at IS NULL",
    );
    push_filters(&mut count_builder, filter);
    let total = count_builder
        .build_query_scalar::<i64>()
        .fetch_one(tx.as_mut())
        .await?;

    let mut builder = QueryBuilder::<Postgres>::new("SELECT ");
    builder.push(LISTING_COLUMNS);
    builder.push(
        " FROM listings l \
         JOIN properties p ON p.id = l.property_id \
         WHERE l.state = 'active' AND l.deleted_at IS NULL",
    );
    push_filters(&mut builder, filter);
    push_order(&mut builder, filter);
    builder.push(" LIMIT ");
    builder.push_bind(filter.limit);
    builder.push(" OFFSET ");
    builder.push_bind(filter.offset);
    let rows = builder
        .build_query_as::<ListingRow>()
        .fetch_all(tx.as_mut())
        .await?;

    if rows.is_empty() {
        tx.commit().await?;
        return Ok((Vec::new(), total));
    }

    let property_ids = rows.iter().map(|row| row.property_id).collect::<Vec<_>>();
    let listing_ids = rows.iter().map(|row| row.id).collect::<Vec<_>>();
    let properties = fetch_properties_by_ids(tx.as_mut(), &property_ids).await?;
    let mut media = fetch_media_by_listing_ids(tx.as_mut(), &listing_ids).await?;
    tx.commit().await?;

    let listings = rows
        .into_iter()
        .map(|row| {
            let property = properties.get(&row.property_id).cloned();
            let row_media = media.remove(&row.id).unwrap_or_default();
            Listing::assemble(row, property, row_media)
        })
        .collect();
    Ok((listings, total))
}

/// Pushes the dynamic WHERE filters shared by the count and page queries.
fn push_filters(builder: &mut QueryBuilder<Postgres>, filter: &ListingFilter) {
    if let Some(search) = &filter.search {
        builder.push(" AND (l.title ILIKE ");
        builder.push_bind(format!("%{search}%"));
        builder.push(" OR p.address_line1 ILIKE ");
        builder.push_bind(format!("%{search}%"));
        builder.push(")");
    }
    if let Some(radius) = filter.radius_miles {
        builder.push(" AND ST_DWithin(p.geog, ST_SetSRID(ST_MakePoint(");
        builder.push_bind(filter.near_lng);
        builder.push(", ");
        builder.push_bind(filter.near_lat);
        builder.push("), 4326)::geography, ");
        builder.push_bind(radius * 1609.34);
        builder.push(")");
    }
    if let Some(min_lng) = filter.bbox_min_lng {
        builder.push(" AND ST_Intersects(p.geog, ST_MakeEnvelope(");
        builder.push_bind(min_lng);
        builder.push(", ");
        builder.push_bind(filter.bbox_min_lat);
        builder.push(", ");
        builder.push_bind(filter.bbox_max_lng);
        builder.push(", ");
        builder.push_bind(filter.bbox_max_lat);
        builder.push(", 4326)::geography)");
    }
    if let Some(intent) = &filter.intent {
        builder.push(" AND l.intent = ");
        builder.push_bind(intent.as_str());
    }
    if let Some(property_type) = &filter.property_type {
        builder.push(" AND p.property_type = ");
        builder.push_bind(property_type.as_str());
    }
    if let Some(min_rent) = filter.min_rent {
        builder.push(" AND (l.terms->>'rentMonthly')::numeric >= ");
        builder.push_bind(min_rent);
    }
    if let Some(max_rent) = filter.max_rent {
        builder.push(" AND (l.terms->>'rentMonthly')::numeric <= ");
        builder.push_bind(max_rent);
    }
    if let Some(min_bedrooms) = filter.min_bedrooms {
        builder.push(" AND p.bedrooms >= ");
        builder.push_bind(min_bedrooms);
    }
    if let Some(max_bedrooms) = filter.max_bedrooms {
        builder.push(" AND p.bedrooms <= ");
        builder.push_bind(max_bedrooms);
    }
    if filter.pets_allowed == Some(true) {
        builder.push(" AND l.pet_policy IS DISTINCT FROM 'No Pets'");
    }
    if let Some(furnished) = filter.furnished {
        builder.push(" AND (l.terms->>'furnished')::boolean = ");
        builder.push_bind(furnished);
    }
}

/// Pushes the ORDER BY clause; distance sort binds the radius center inline.
fn push_order(builder: &mut QueryBuilder<Postgres>, filter: &ListingFilter) {
    match filter.sort {
        ListingSort::Distance => {
            builder.push(" ORDER BY ST_Distance(p.geog, ST_SetSRID(ST_MakePoint(");
            builder.push_bind(filter.near_lng);
            builder.push(", ");
            builder.push_bind(filter.near_lat);
            builder.push("), 4326)::geography)");
        }
        other => {
            builder.push(" ORDER BY ");
            builder.push(other.order_column());
        }
    }
    builder.push(if filter.sort_descending {
        " DESC"
    } else {
        " ASC"
    });
}

/// Batch-loads properties by id into a lookup keyed by property id.
async fn fetch_properties_by_ids<'e, E>(
    executor: E,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, Property>, Error>
where
    E: sqlx::PgExecutor<'e>,
{
    let rows = sqlx::query_as!(
        PropertyRow,
        r#"
            SELECT
                id, normalized_address, parcel_id, address_line1, address_line2,
                city, state, zip_code,
                latitude::float8 AS "latitude?",
                longitude::float8 AS "longitude?",
                property_type, bedrooms,
                bathrooms::float8 AS "bathrooms?",
                square_feet, year_built, parking_features,
                created_at AS "created_at!", updated_at AS "updated_at!"
            FROM properties
            WHERE id = ANY($1) AND deleted_at IS NULL
        "#,
        ids,
    )
    .fetch_all(executor)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.id, Property::from(row)))
        .collect())
}

/// Batch-loads approved media by listing id into a lookup keyed by listing id.
async fn fetch_media_by_listing_ids<'e, E>(
    executor: E,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<MediaRef>>, Error>
where
    E: sqlx::PgExecutor<'e>,
{
    let rows = sqlx::query_as!(
        MediaRow,
        r#"
            SELECT id, listing_id, url, cid, position, moderation_status
            FROM listing_media
            WHERE listing_id = ANY($1) AND moderation_status = 'approved'
            ORDER BY position ASC
        "#,
        ids,
    )
    .fetch_all(executor)
    .await?;
    let mut grouped: HashMap<Uuid, Vec<MediaRef>> = HashMap::new();
    for row in rows {
        grouped
            .entry(row.listing_id)
            .or_default()
            .push(MediaRef::from(row));
    }
    Ok(grouped)
}

/// Validated input for [`create_listing`]; `listed_by` is supplied by the
/// handler from the authenticated landlord.
#[derive(Debug)]
pub struct NewListing {
    /// Physical property this offer is against.
    pub property_id: Uuid,
    /// Title.
    pub title: String,
    /// Description.
    pub description: String,
    /// Amenities.
    pub amenities: Vec<String>,
    /// Utilities included.
    pub utilities_included: Vec<String>,
    /// Pet policy label.
    pub pet_policy: Option<String>,
    /// Available date.
    pub available_date: Option<NaiveDate>,
    /// Surrounding POIs (JSONB).
    pub surrounding_area: Value,
    /// Polymorphic terms (JSONB).
    pub terms: Value,
}

/// Partial update for [`update_listing`]; `None` fields are left unchanged.
#[derive(Debug)]
pub struct ListingPatch {
    /// Title.
    pub title: Option<String>,
    /// Description.
    pub description: Option<String>,
    /// Amenities.
    pub amenities: Option<Vec<String>>,
    /// Utilities included.
    pub utilities_included: Option<Vec<String>>,
    /// Pet policy label.
    pub pet_policy: Option<String>,
    /// Available date.
    pub available_date: Option<NaiveDate>,
    /// Surrounding POIs (JSONB).
    pub surrounding_area: Option<Value>,
    /// Polymorphic terms (JSONB).
    pub terms: Option<Value>,
}

/// Creates a `draft` `rent_ltr` listing owned by `listed_by`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure (e.g. a missing `property_id`
/// surfaces as a foreign-key violation).
#[inline]
pub async fn create_listing(
    pool: &PgPool,
    listed_by: Uuid,
    new: NewListing,
) -> Result<ListingRow, Error> {
    sqlx::query_as!(
        ListingRow,
        r#"
            INSERT INTO listings (
                property_id, listed_by, intent, state, title, description,
                amenities, utilities_included, pet_policy, available_date,
                surrounding_area, terms
            )
            VALUES ($1, $2, 'rent_ltr', 'draft', $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING
                id, property_id, listed_by, intent, state, days_on_market,
                expires_at, title, description, amenities, utilities_included,
                pet_policy, available_date,
                surrounding_area AS "surrounding_area: Json<serde_json::Value>",
                terms AS "terms: Json<serde_json::Value>",
                views, identity_verified, authority_tier, fair_housing_cleared,
                managed_by_pm,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        new.property_id,
        listed_by,
        new.title,
        new.description,
        new.amenities.as_slice(),
        new.utilities_included.as_slice(),
        new.pet_policy,
        new.available_date,
        new.surrounding_area,
        new.terms,
    )
    .fetch_one(pool)
    .await
}

/// Outcome of an owner-scoped update: the fresh row, or why it was refused.
#[derive(Debug)]
pub enum ListingUpdate {
    /// Updated; carries the fresh row (boxed - it dwarfs the unit variants).
    Updated(Box<ListingRow>),
    /// No live listing has that id.
    NotFound,
    /// The caller is not the lister.
    Forbidden,
}

/// Applies a partial update to a listing owned by `owner_id`, atomically.
///
/// The owner check and the write run in one transaction: a `SELECT ... FOR
/// UPDATE` locks the row, so it cannot be deleted or re-owned between the check
/// and the `UPDATE ... RETURNING`. This closes the check-then-act (TOCTOU)
/// window the previous owner-check-then-update split had.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn update_listing(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
    patch: ListingPatch,
) -> Result<ListingUpdate, Error> {
    let mut tx = pool.begin().await?;

    let current_owner = sqlx::query_scalar!(
        r"
            SELECT listed_by
            FROM listings
            WHERE id = $1 AND deleted_at IS NULL
            FOR UPDATE
        ",
        listing_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current_owner) = current_owner else {
        return Ok(ListingUpdate::NotFound);
    };
    if current_owner != owner_id {
        return Ok(ListingUpdate::Forbidden);
    }

    let row = sqlx::query_as!(
        ListingRow,
        r#"
            UPDATE listings
            SET
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                amenities = COALESCE($4, amenities),
                utilities_included = COALESCE($5, utilities_included),
                pet_policy = COALESCE($6, pet_policy),
                available_date = COALESCE($7, available_date),
                surrounding_area = COALESCE($8, surrounding_area),
                terms = COALESCE($9, terms)
            WHERE id = $1
            RETURNING
                id, property_id, listed_by, intent, state, days_on_market,
                expires_at, title, description, amenities, utilities_included,
                pet_policy, available_date,
                surrounding_area AS "surrounding_area: Json<serde_json::Value>",
                terms AS "terms: Json<serde_json::Value>",
                views, identity_verified, authority_tier, fair_housing_cleared,
                managed_by_pm,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        listing_id,
        patch.title,
        patch.description,
        patch.amenities.as_deref(),
        patch.utilities_included.as_deref(),
        patch.pet_policy,
        patch.available_date,
        patch.surrounding_area,
        patch.terms,
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(ListingUpdate::Updated(Box::new(row)))
}

/// Lists a landlord's own listings (any state), newest first, with batch-loaded
/// nested property and media plus the total count.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_landlord_listings(
    pool: &PgPool,
    landlord_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<(Vec<Listing>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page + batch loads.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM listings
            WHERE listed_by = $1 AND deleted_at IS NULL
        "#,
        landlord_id,
    )
    .fetch_one(tx.as_mut())
    .await?;

    let rows = sqlx::query_as!(
        ListingRow,
        r#"
            SELECT
                id, property_id, listed_by, intent, state, days_on_market,
                expires_at, title, description, amenities, utilities_included,
                pet_policy, available_date,
                surrounding_area AS "surrounding_area: Json<serde_json::Value>",
                terms AS "terms: Json<serde_json::Value>",
                views, identity_verified, authority_tier, fair_housing_cleared,
                managed_by_pm,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM listings
            WHERE listed_by = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        "#,
        landlord_id,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;

    if rows.is_empty() {
        tx.commit().await?;
        return Ok((Vec::new(), total));
    }

    let property_ids = rows.iter().map(|row| row.property_id).collect::<Vec<_>>();
    let listing_ids = rows.iter().map(|row| row.id).collect::<Vec<_>>();
    let properties = fetch_properties_by_ids(tx.as_mut(), &property_ids).await?;
    let mut media = fetch_media_by_listing_ids(tx.as_mut(), &listing_ids).await?;
    tx.commit().await?;

    let listings = rows
        .into_iter()
        .map(|row| {
            let property = properties.get(&row.property_id).cloned();
            let row_media = media.remove(&row.id).unwrap_or_default();
            Listing::assemble(row, property, row_media)
        })
        .collect();
    Ok((listings, total))
}

/// Outcome of an owner-scoped lifecycle transition.
#[derive(Debug)]
pub enum StateTransition {
    /// Transitioned; carries the fresh row (boxed - it dwarfs the unit
    /// variants).
    Updated(Box<ListingRow>),
    /// No live listing has that id.
    NotFound,
    /// The caller is not the lister.
    Forbidden,
    /// The requested transition is not legal from the current state.
    Illegal {
        /// Current state.
        from: ListingState,
        /// Requested target state.
        to: ListingState,
    },
}

/// Drives a listing through a lifecycle transition, owner-scoped and atomic.
///
/// A `SELECT ... FOR UPDATE` locks the row so the current-state read, owner
/// check and write share one snapshot - the row cannot be re-owned, deleted or
/// transitioned by anyone else in between. On `-> active` a fresh expiry window
/// is stamped; the authority gate that guards activation is wired in a later
/// commit.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn transition_state(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
    target: ListingState,
) -> Result<StateTransition, Error> {
    let mut tx = pool.begin().await?;

    let current = sqlx::query!(
        r"
            SELECT listed_by, state
            FROM listings
            WHERE id = $1 AND deleted_at IS NULL
            FOR UPDATE
        ",
        listing_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current) = current else {
        return Ok(StateTransition::NotFound);
    };
    if current.listed_by != owner_id {
        return Ok(StateTransition::Forbidden);
    }
    let from = ListingState::from_str(&current.state).unwrap_or(ListingState::Draft);
    if !from.can_transition_to(target) {
        return Ok(StateTransition::Illegal { from, to: target });
    }

    // Stamp a fresh expiry window only when publishing; every other transition
    // passes NULL, and COALESCE keeps the stored `expires_at` untouched.
    let new_expires_at = (target == ListingState::Active).then(|| Utc::now() + Duration::days(90)); // 90-day LTR window

    let row = sqlx::query_as!(
        ListingRow,
        r#"
            UPDATE listings
            SET
                state = $2,
                expires_at = COALESCE($3, expires_at)
            WHERE id = $1
            RETURNING
                id, property_id, listed_by, intent, state, days_on_market,
                expires_at, title, description, amenities, utilities_included,
                pet_policy, available_date,
                surrounding_area AS "surrounding_area: Json<serde_json::Value>",
                terms AS "terms: Json<serde_json::Value>",
                views, identity_verified, authority_tier, fair_housing_cleared,
                managed_by_pm,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        listing_id,
        target.to_string(),
        new_expires_at,
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(StateTransition::Updated(Box::new(row)))
}

/// Outcome of a soft withdraw.
#[derive(Debug)]
pub enum WithdrawOutcome {
    /// Soft-withdrawn (`state = 'withdrawn'`, `deleted_at` stamped).
    Withdrawn,
    /// No live listing has that id.
    NotFound,
    /// The caller is not the lister.
    Forbidden,
}

/// Soft-withdraws a listing the caller owns: sets `state = 'withdrawn'` and
/// stamps `deleted_at`, under the same `FOR UPDATE` lock as a state transition.
///
/// Always a soft delete. A hard delete is withheld until historical-data
/// tracking can confirm no downstream rows (leases, applications, views)
/// reference the listing.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn withdraw_listing(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
) -> Result<WithdrawOutcome, Error> {
    let mut tx = pool.begin().await?;

    let current_owner = sqlx::query_scalar!(
        r"
            SELECT listed_by
            FROM listings
            WHERE id = $1 AND deleted_at IS NULL
            FOR UPDATE
        ",
        listing_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current_owner) = current_owner else {
        return Ok(WithdrawOutcome::NotFound);
    };
    if current_owner != owner_id {
        return Ok(WithdrawOutcome::Forbidden);
    }

    sqlx::query!(
        r"
            UPDATE listings
            SET state = 'withdrawn', deleted_at = now()
            WHERE id = $1
        ",
        listing_id,
    )
    .execute(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(WithdrawOutcome::Withdrawn)
}

/// The unique-tenant view counter after a [`record_view`] call.
#[derive(Debug)]
pub struct ViewTally {
    /// View count after the operation.
    pub views: i32,
    /// Whether this call incremented the counter (`false` = a repeat view).
    pub counted: bool,
}

/// Records a unique-tenant view of an active listing and returns the resulting
/// tally, or `None` when no active listing has that id.
///
/// A single CTE does everything atomically: it gates on the listing being
/// `active`, inserts the event with `ON CONFLICT DO NOTHING`, and bumps
/// `listings.views` only when that insert actually happened (`RETURNING` is
/// empty on conflict). One registered tenant therefore counts at most once, and
/// the event-insert and counter-bump can never disagree.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn record_view(
    pool: &PgPool,
    listing_id: Uuid,
    viewer_id: Uuid,
) -> Result<Option<ViewTally>, Error> {
    let row = sqlx::query!(
        r#"
            WITH target AS (
                SELECT id, views
                FROM listings
                WHERE id = $1 AND state = 'active' AND deleted_at IS NULL
            ),
            inserted AS (
                INSERT INTO listing_view_events (listing_id, user_id)
                SELECT id, $2 FROM target
                ON CONFLICT (listing_id, user_id) DO NOTHING
                RETURNING id
            ),
            bumped AS (
                UPDATE listings
                SET views = views + 1
                WHERE id = $1 AND EXISTS (SELECT 1 FROM inserted)
                RETURNING views
            )
            SELECT
                (SELECT id FROM target) AS "found_id?",
                EXISTS (SELECT 1 FROM inserted) AS "counted!",
                COALESCE((SELECT views FROM bumped), (SELECT views FROM target)) AS "views?"
        "#,
        listing_id,
        viewer_id,
    )
    .fetch_one(pool)
    .await?;

    if row.found_id.is_none() {
        return Ok(None);
    }
    Ok(Some(ViewTally {
        views: row.views.unwrap_or(0),
        counted: row.counted,
    }))
}

/// Fetches a performance snapshot for a listing the caller owns, or `None` when
/// no live listing with that id is owned by `owner_id`.
///
/// Lease metrics are scoped to the listing's `property_id` (leases keep their FK
/// on the physical asset, ADR-007); `occupancy_rate` reuses the shared
/// `calculate_occupancy_rate` over the lister's portfolio. The owner check is in
/// the `WHERE`, so a foreign listing reads as absent rather than leaking its
/// existence.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_statistics(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
) -> Result<Option<ListingStatistics>, Error> {
    let row = sqlx::query!(
        r#"
            SELECT
                (
                    SELECT COUNT(*) FROM listing_view_events v
                    WHERE v.listing_id = l.id
                ) AS "total_views!",
                (
                    SELECT COUNT(*) FROM leases le
                    WHERE le.property_id = l.property_id
                      AND le.status = 'active' AND le.deleted_at IS NULL
                ) AS "active_leases!",
                (
                    SELECT COALESCE(SUM(le.monthly_rent), 0) FROM leases le
                    WHERE le.property_id = l.property_id
                      AND le.status = 'active' AND le.deleted_at IS NULL
                )::float8 AS "monthly_revenue!",
                calculate_occupancy_rate(l.listed_by)::float8 AS "occupancy_rate!"
            FROM listings l
            WHERE l.id = $1 AND l.listed_by = $2 AND l.deleted_at IS NULL
        "#,
        listing_id,
        owner_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| ListingStatistics {
        total_views: r.total_views,
        // The applications domain is not wired into this surface yet.
        total_applications: 0,
        active_leases: r.active_leases,
        monthly_revenue: r.monthly_revenue,
        occupancy_rate: r.occupancy_rate,
    }))
}

/// Fetches a historical-activity summary for a listing the caller owns, or
/// `None` when no live listing with that id is owned by `owner_id`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_historical_data(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
) -> Result<Option<ListingHistoricalData>, Error> {
    let row = sqlx::query!(
        r#"
            SELECT
                (
                    SELECT COUNT(*) FROM leases le
                    WHERE le.property_id = l.property_id AND le.deleted_at IS NULL
                ) AS "total_leases!",
                (
                    SELECT COUNT(*) FROM listing_view_events v
                    WHERE v.listing_id = l.id
                ) AS "total_views!"
            FROM listings l
            WHERE l.id = $1 AND l.listed_by = $2 AND l.deleted_at IS NULL
        "#,
        listing_id,
        owner_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| ListingHistoricalData {
        total_leases: r.total_leases,
        total_views: r.total_views,
        has_historical_data: r.total_leases > 0 || r.total_views > 0,
    }))
}
