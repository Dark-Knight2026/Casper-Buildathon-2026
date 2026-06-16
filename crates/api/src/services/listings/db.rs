//! Database operations for listings.
//!
//! Detail/media reads use compile-time `sqlx` macros (with JSONB and
//! nullable-defaulted overrides); the public `GET /listings` search and the
//! landlord list use a runtime `QueryBuilder` because their filter sets are
//! dynamic. Nested property and media are batch-loaded by id to avoid N+1.

use core::str::FromStr;
use std::collections::HashMap;

use chrono::{DateTime, Duration, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Error, FromRow, PgPool, Postgres, QueryBuilder, types::Json};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppendFilters, AppendOrder, QueryBuilderExt},
    services::{
        listings::models::{
            AuthorityDocumentType, AuthorityTier, Listing, ListingHistoricalData,
            ListingProvenance, ListingSort, ListingState, ListingStatistics, MediaRef,
            ModerationStatus,
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
    /// Minimum bathrooms.
    pub min_bathrooms: Option<f64>,
    /// Minimum living area (sqft).
    pub min_living_area: Option<i32>,
    /// Maximum living area (sqft).
    pub max_living_area: Option<i32>,
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

impl AppendFilters for ListingFilter {
    /// Pushes the dynamic WHERE filters shared by the count and page queries.
    #[inline]
    fn append_to(&self, builder: &mut QueryBuilder<Postgres>) {
        if let Some(search) = &self.search {
            builder
                .push(" AND (l.title ILIKE ")
                .push_bind(format!("%{search}%"))
                .push(" OR p.address_line1 ILIKE ")
                .push_bind(format!("%{search}%"))
                .push(")");
        }
        if let Some(radius) = self.radius_miles {
            builder
                .push(" AND ST_DWithin(p.geog, ST_SetSRID(ST_MakePoint(")
                .push_bind(self.near_lng)
                .push(", ")
                .push_bind(self.near_lat)
                .push("), 4326)::geography, ")
                .push_bind(radius * 1609.34)
                .push(")");
        }
        if let Some(min_lng) = self.bbox_min_lng {
            builder
                .push(" AND ST_Intersects(p.geog, ST_MakeEnvelope(")
                .push_bind(min_lng)
                .push(", ")
                .push_bind(self.bbox_min_lat)
                .push(", ")
                .push_bind(self.bbox_max_lng)
                .push(", ")
                .push_bind(self.bbox_max_lat)
                .push(", 4326)::geography)");
        }
        if let Some(intent) = &self.intent {
            builder.push(" AND l.intent = ").push_bind(intent.as_str());
        }
        if let Some(property_type) = &self.property_type {
            builder
                .push(" AND p.property_type = ")
                .push_bind(property_type.as_str());
        }
        if let Some(min_rent) = self.min_rent {
            builder
                .push(" AND (l.terms->>'rentMonthly')::numeric >= ")
                .push_bind(min_rent);
        }
        if let Some(max_rent) = self.max_rent {
            builder
                .push(" AND (l.terms->>'rentMonthly')::numeric <= ")
                .push_bind(max_rent);
        }
        if let Some(min_bedrooms) = self.min_bedrooms {
            builder.push(" AND p.bedrooms >= ").push_bind(min_bedrooms);
        }
        if let Some(max_bedrooms) = self.max_bedrooms {
            builder.push(" AND p.bedrooms <= ").push_bind(max_bedrooms);
        }
        if let Some(min_bathrooms) = self.min_bathrooms {
            builder
                .push(" AND p.bathrooms >= ")
                .push_bind(min_bathrooms);
        }
        if let Some(min_living_area) = self.min_living_area {
            builder
                .push(" AND p.square_feet >= ")
                .push_bind(min_living_area);
        }
        if let Some(max_living_area) = self.max_living_area {
            builder
                .push(" AND p.square_feet <= ")
                .push_bind(max_living_area);
        }
        if self.pets_allowed == Some(true) {
            builder.push(" AND l.pet_policy IS DISTINCT FROM 'No Pets'");
        }
        if let Some(furnished) = self.furnished {
            builder
                .push(" AND (l.terms->>'furnished')::boolean = ")
                .push_bind(furnished);
        }
    }
}

impl AppendOrder for ListingFilter {
    /// Pushes the ORDER BY clause; distance sort binds the radius center inline.
    #[inline]
    fn append_order(&self, builder: &mut QueryBuilder<Postgres>) {
        match self.sort {
            ListingSort::Distance => {
                builder
                    .push(" ORDER BY ST_Distance(p.geog, ST_SetSRID(ST_MakePoint(")
                    .push_bind(self.near_lng)
                    .push(", ")
                    .push_bind(self.near_lat)
                    .push("), 4326)::geography)");
            }
            other => {
                builder.push(" ORDER BY ").push(other.order_column());
            }
        }
        builder.push(if self.sort_descending {
            " DESC"
        } else {
            " ASC"
        });
    }
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

    let total = QueryBuilder::<Postgres>::new(
        r"
            SELECT COUNT(*)
            FROM listings l
            JOIN properties p ON p.id = l.property_id
            WHERE l.state = 'active' AND l.deleted_at IS NULL
        ",
    )
    .append(filter)
    .build_query_scalar::<i64>()
    .fetch_one(tx.as_mut())
    .await?;

    let rows = QueryBuilder::<Postgres>::new("SELECT ")
        .push(LISTING_COLUMNS)
        .push(
            r"
                FROM listings l
                JOIN properties p ON p.id = l.property_id
                WHERE l.state = 'active' AND l.deleted_at IS NULL
            ",
        )
        .append(filter)
        .order_by(filter)
        .limit_offset(filter.limit, filter.offset)
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
    let mut grouped = HashMap::<Uuid, Vec<MediaRef>>::new();
    for row in rows {
        grouped
            .entry(row.listing_id)
            .or_default()
            .push(MediaRef::from(row));
    }
    Ok(grouped)
}

/// Batch-loads live listings by id into a lookup keyed by listing id, each
/// assembled with its nested property and approved media. Shared by the
/// downstream domains (favorites, applications, viewings) that surface a nested
/// listing; the caller imposes its own ordering from the returned map.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_listings_by_ids(
    pool: &PgPool,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, Listing>, Error> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

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
            WHERE id = ANY($1) AND deleted_at IS NULL
        "#,
        ids,
    )
    .fetch_all(pool)
    .await?;

    let property_ids = rows.iter().map(|row| row.property_id).collect::<Vec<_>>();
    let listing_ids = rows.iter().map(|row| row.id).collect::<Vec<_>>();
    let properties = fetch_properties_by_ids(pool, &property_ids).await?;
    let mut media = fetch_media_by_listing_ids(pool, &listing_ids).await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let property = properties.get(&row.property_id).cloned();
            let row_media = media.remove(&row.id).unwrap_or_default();
            (row.id, Listing::assemble(row, property, row_media))
        })
        .collect())
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

/// Creates a `draft` `rent_ltr` listing owned by `listed_by`, stamping the
/// Fair Housing screen result the handler computed from the listing text.
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
    fair_housing_cleared: bool,
) -> Result<ListingRow, Error> {
    sqlx::query_as!(
        ListingRow,
        r#"
            INSERT INTO listings (
                property_id, listed_by, intent, state, title, description,
                amenities, utilities_included, pet_policy, available_date,
                surrounding_area, terms, fair_housing_cleared
            )
            VALUES ($1, $2, 'rent_ltr', 'draft', $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        fair_housing_cleared,
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

/// Validated filter for [`list_landlord_listings`]. Empty `states` imposes no
/// lifecycle constraint; limit/offset are pre-clamped by the pagination layer.
#[derive(Debug)]
pub struct LandlordListingFilter {
    /// Lifecycle states to include; empty means every state.
    pub states: Vec<ListingState>,
    /// Page size.
    pub limit: i64,
    /// Page offset.
    pub offset: i64,
}

impl AppendFilters for LandlordListingFilter {
    /// Pushes the optional lifecycle-state filter shared by count and page.
    #[inline]
    fn append_to(&self, builder: &mut QueryBuilder<Postgres>) {
        if !self.states.is_empty() {
            builder
                .push(" AND l.state = ANY(")
                .push_bind(
                    self.states
                        .iter()
                        .map(ToString::to_string)
                        .collect::<Vec<_>>(),
                )
                .push(")");
        }
    }
}

/// Lists a landlord's own listings (newest first), optionally narrowed by
/// lifecycle state, with batch-loaded nested property and media plus the total
/// count.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_landlord_listings(
    pool: &PgPool,
    landlord_id: Uuid,
    filter: &LandlordListingFilter,
) -> Result<(Vec<Listing>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page + batch loads.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let total =
        QueryBuilder::<Postgres>::new("SELECT COUNT(*) FROM listings l WHERE l.listed_by = ")
            .push_bind(landlord_id)
            .push(" AND l.deleted_at IS NULL")
            .append(filter)
            .build_query_scalar::<i64>()
            .fetch_one(tx.as_mut())
            .await?;

    let rows = QueryBuilder::<Postgres>::new("SELECT ")
        .push(LISTING_COLUMNS)
        .push(" FROM listings l WHERE l.listed_by = ")
        .push_bind(landlord_id)
        .push(" AND l.deleted_at IS NULL")
        .append(filter)
        .push(" ORDER BY l.created_at DESC")
        .limit_offset(filter.limit, filter.offset)
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

/// Which authority gate blocked an activation (`-> active`).
#[derive(Debug, Clone, Copy)]
pub enum GateFailure {
    /// Identity (KYC) not verified.
    Identity,
    /// Authority tier below `T1` (no documents on file).
    Authority,
    /// Fair Housing advertising screen not cleared.
    FairHousing,
}

impl GateFailure {
    /// Short label naming the failing gate, for the client error message.
    #[inline]
    #[must_use]
    pub fn label(self) -> &'static str {
        match self {
            Self::Identity => "identity verification",
            Self::Authority => "authority tier (documents on file / T1+)",
            Self::FairHousing => "fair housing screen",
        }
    }
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
    /// A `-> active` transition was blocked by an unsatisfied authority gate.
    GateFailed(GateFailure),
}

/// Drives a listing through a lifecycle transition, owner-scoped and atomic.
///
/// A `SELECT ... FOR UPDATE` locks the row so the current-state read, owner
/// check, gate check and write share one snapshot - the row cannot be re-owned,
/// deleted or transitioned by anyone else in between.
///
/// `-> active` is the single authority-gate enforcement point (ADR-007 D2): it
/// requires `kyc_verified` (the handler's `KycProvider` result), authority tier
/// `>= T1`, and a cleared Fair Housing screen. The first unmet gate short-
/// circuits to [`StateTransition::GateFailed`]. A successful activation stamps
/// `identity_verified` and a fresh expiry window. `kyc_verified` is ignored for
/// every other target.
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
    kyc_verified: bool,
) -> Result<StateTransition, Error> {
    let mut tx = pool.begin().await?;

    let current = sqlx::query!(
        r"
            SELECT listed_by, state, authority_tier, fair_housing_cleared
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

    // Authority gate (D2): the single enforcement point for `-> active`. Each
    // gate is checked under the same row lock, so the verdict cannot drift
    // before the write. The tier check rejects T0 (self-attested) - T1+ means
    // documents are on file.
    if target == ListingState::Active {
        let tier = AuthorityTier::from_str(&current.authority_tier).unwrap_or(AuthorityTier::T0);
        if !kyc_verified {
            return Ok(StateTransition::GateFailed(GateFailure::Identity));
        }
        if tier == AuthorityTier::T0 {
            return Ok(StateTransition::GateFailed(GateFailure::Authority));
        }
        if !current.fair_housing_cleared {
            return Ok(StateTransition::GateFailed(GateFailure::FairHousing));
        }
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
                expires_at = COALESCE($3, expires_at),
                identity_verified = CASE WHEN $2 = 'active' THEN true
                                         ELSE identity_verified END
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

/// Fetches the derived provenance for a listing the caller owns, or `None` when
/// no live listing with that id is owned by `owner_id`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_provenance(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
) -> Result<Option<ListingProvenance>, Error> {
    let row = sqlx::query!(
        r"
            SELECT identity_verified, authority_tier, fair_housing_cleared, managed_by_pm
            FROM listings
            WHERE id = $1 AND listed_by = $2 AND deleted_at IS NULL
        ",
        listing_id,
        owner_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| {
        ListingProvenance::from_parts(
            r.identity_verified,
            &r.authority_tier,
            r.fair_housing_cleared,
            r.managed_by_pm,
        )
    }))
}

/// Fetches the screenable free-text (title, description) of a listing the
/// caller owns, or `None` when no live listing with that id is owned by
/// `owner_id`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_owned_listing_text(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
) -> Result<Option<(String, String)>, Error> {
    let row = sqlx::query!(
        r"
            SELECT title, description
            FROM listings
            WHERE id = $1 AND listed_by = $2 AND deleted_at IS NULL
        ",
        listing_id,
        owner_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| (r.title, r.description)))
}

/// Stamps the Fair Housing screen result on a listing. Caller-owned scoping is
/// the caller's responsibility (the listing id is already authorized upstream).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn set_fair_housing_cleared(
    pool: &PgPool,
    listing_id: Uuid,
    cleared: bool,
) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE listings
            SET fair_housing_cleared = $2
            WHERE id = $1
        ",
        listing_id,
        cleared,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Returns the lister of a live listing, or `None` when no live listing has
/// that id. Used to authorize a multipart upload before touching storage, so a
/// non-owner cannot leave an orphan blob behind a `403`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn listing_owner(pool: &PgPool, listing_id: Uuid) -> Result<Option<Uuid>, Error> {
    sqlx::query_scalar!(
        r"
            SELECT listed_by
            FROM listings
            WHERE id = $1 AND deleted_at IS NULL
        ",
        listing_id,
    )
    .fetch_optional(pool)
    .await
}

/// Asserts that `owner_id` is the lister of a live listing. The shared
/// listing-ownership gate for the downstream domains (applications, viewings)
/// that authorize a landlord action against a listing they must own.
///
/// # Errors
///
/// Returns [`ApiError::NotFound`] when no live listing has that id (no leak of
/// a foreign listing's existence) and [`ApiError::Forbidden`] when the caller is
/// not the lister; otherwise any database error.
#[inline]
pub async fn assert_listing_owner(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
) -> ApiResult<()> {
    match listing_owner(pool, listing_id).await? {
        None => Err(ApiError::NotFound("listing not found".to_owned())),
        Some(owner) if owner != owner_id => {
            Err(ApiError::Forbidden("not_listing_owner".to_owned()))
        }
        Some(_) => Ok(()),
    }
}

/// Outcome of an owner-scoped authority-document upload.
#[derive(Debug)]
pub enum AuthorityUpload {
    /// Stored; carries the new document id, its timestamp and the post-upload
    /// provenance (authority tier may have risen to `T1`).
    Added {
        /// New document id.
        id: Uuid,
        /// Upload timestamp.
        created_at: DateTime<Utc>,
        /// Gate status after the upload.
        provenance: ListingProvenance,
    },
    /// No live listing has that id.
    NotFound,
    /// The caller is not the lister.
    Forbidden,
}

/// Records a proof-of-authority document for a listing the caller owns and
/// lifts its authority tier, atomically.
///
/// A `SELECT ... FOR UPDATE` locks the listing so the owner check, the document
/// insert and the tier bump share one snapshot. The bump is monotonic: `T0`
/// rises to `T1`, while an already-higher tier is left untouched. A management
/// agreement also sets `managed_by_pm` (never clears it).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn add_authority_document(
    pool: &PgPool,
    listing_id: Uuid,
    owner_id: Uuid,
    document_type: AuthorityDocumentType,
    url: &str,
) -> Result<AuthorityUpload, Error> {
    let delegates_pm = document_type.delegates_pm_authority();
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
        return Ok(AuthorityUpload::NotFound);
    };
    if current_owner != owner_id {
        return Ok(AuthorityUpload::Forbidden);
    }

    let document = sqlx::query!(
        r#"
            INSERT INTO listing_authority_documents (
                listing_id, document_type, url, uploaded_by
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at AS "created_at!"
        "#,
        listing_id,
        document_type.to_string(),
        url,
        owner_id,
    )
    .fetch_one(tx.as_mut())
    .await?;

    let gate = sqlx::query!(
        r"
            UPDATE listings
            SET
                authority_tier = CASE WHEN authority_tier = 'T0' THEN 'T1'
                                      ELSE authority_tier END,
                managed_by_pm = managed_by_pm OR $2
            WHERE id = $1
            RETURNING identity_verified, authority_tier, fair_housing_cleared,
                      managed_by_pm
        ",
        listing_id,
        delegates_pm,
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;

    Ok(AuthorityUpload::Added {
        id: document.id,
        created_at: document.created_at,
        provenance: ListingProvenance::from_parts(
            gate.identity_verified,
            &gate.authority_tier,
            gate.fair_housing_cleared,
            gate.managed_by_pm,
        ),
    })
}

/// Inserts a media row for a listing, appended after existing media, and
/// returns it. Position is the next slot under a single subquery (no separate
/// max read); moderation defaults to `pending`, so the item is excluded from
/// public reads until approved. `storage_key` is kept for a later
/// `MediaStorage::delete`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn insert_listing_media(
    pool: &PgPool,
    listing_id: Uuid,
    url: &str,
    cid: &str,
    storage_key: &str,
) -> Result<MediaRow, Error> {
    sqlx::query_as!(
        MediaRow,
        r"
            INSERT INTO listing_media (listing_id, url, cid, position, storage_key)
            VALUES (
                $1, $2, $3,
                (SELECT COALESCE(MAX(position) + 1, 0)
                 FROM listing_media WHERE listing_id = $1),
                $4
            )
            RETURNING id, listing_id, url, cid, position, moderation_status
        ",
        listing_id,
        url,
        cid,
        storage_key,
    )
    .fetch_one(pool)
    .await
}

/// Sets the moderation status of a media item (the moderator action, not the
/// owner's). Scoped to `listing_id` so the path stays consistent. Returns the
/// updated row, or `None` when no such media exists under that listing.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn set_media_moderation(
    pool: &PgPool,
    listing_id: Uuid,
    media_id: Uuid,
    status: ModerationStatus,
) -> Result<Option<MediaRow>, Error> {
    sqlx::query_as!(
        MediaRow,
        r"
            UPDATE listing_media
            SET moderation_status = $3
            WHERE id = $2 AND listing_id = $1
            RETURNING id, listing_id, url, cid, position, moderation_status
        ",
        listing_id,
        media_id,
        status.to_string(),
    )
    .fetch_optional(pool)
    .await
}

/// Reorders a listing's media: each id's new position is its index in `order`.
/// Ids that are not media of this listing are ignored (the `listing_id` guard
/// in the join). A single `UPDATE ... FROM unnest WITH ORDINALITY` applies the
/// whole reordering atomically.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn reorder_listing_media(
    pool: &PgPool,
    listing_id: Uuid,
    order: &[Uuid],
) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE listing_media AS m
            SET position = (o.ord - 1)::int
            FROM unnest($2::uuid[]) WITH ORDINALITY AS o(media_id, ord)
            WHERE m.id = o.media_id AND m.listing_id = $1
        ",
        listing_id,
        order,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Removes media items from a listing and returns the storage keys of the rows
/// actually deleted, so the caller can delete the blobs. Ids not belonging to
/// this listing are ignored.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn remove_listing_media(
    pool: &PgPool,
    listing_id: Uuid,
    ids: &[Uuid],
) -> Result<Vec<String>, Error> {
    let rows = sqlx::query!(
        r"
            DELETE FROM listing_media
            WHERE listing_id = $1 AND id = ANY($2)
            RETURNING storage_key
        ",
        listing_id,
        ids,
    )
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().filter_map(|row| row.storage_key).collect())
}

/// Fetches all of a listing's media (any moderation status), ordered for
/// display. The owner-facing counterpart to [`fetch_listing_media`], which
/// returns approved-only for public reads.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_all_listing_media(
    pool: &PgPool,
    listing_id: Uuid,
) -> Result<Vec<MediaRow>, Error> {
    sqlx::query_as!(
        MediaRow,
        r"
            SELECT id, listing_id, url, cid, position, moderation_status
            FROM listing_media
            WHERE listing_id = $1
            ORDER BY position ASC
        ",
        listing_id,
    )
    .fetch_all(pool)
    .await
}
