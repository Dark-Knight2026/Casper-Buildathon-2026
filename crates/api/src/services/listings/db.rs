//! Database operations for listings.
//!
//! Detail/media reads use compile-time `sqlx` macros (with JSONB and
//! nullable-defaulted overrides); the public `GET /listings` search uses a
//! runtime `QueryBuilder` because its filter set is dynamic. Nested property
//! and media are batch-loaded by id to avoid N+1.

use std::collections::HashMap;

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Error, FromRow, PgPool, Postgres, QueryBuilder, types::Json};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult},
    services::{
        listings::models::{Listing, MediaRef},
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
    let mut count_builder = QueryBuilder::<Postgres>::new(
        "SELECT COUNT(*) FROM listings l \
         JOIN properties p ON p.id = l.property_id \
         WHERE l.state = 'active' AND l.deleted_at IS NULL",
    );
    push_filters(&mut count_builder, filter);
    let total = count_builder
        .build_query_scalar::<i64>()
        .fetch_one(pool)
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
        .fetch_all(pool)
        .await?;

    if rows.is_empty() {
        return Ok((Vec::new(), total));
    }

    let property_ids = rows.iter().map(|row| row.property_id).collect::<Vec<_>>();
    let listing_ids = rows.iter().map(|row| row.id).collect::<Vec<_>>();
    let properties = fetch_properties_by_ids(pool, &property_ids).await?;
    let mut media = fetch_media_by_listing_ids(pool, &listing_ids).await?;

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
async fn fetch_properties_by_ids(
    pool: &PgPool,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, Property>, Error> {
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
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|row| (row.id, Property::from(row)))
        .collect())
}

/// Batch-loads approved media by listing id into a lookup keyed by listing id.
async fn fetch_media_by_listing_ids(
    pool: &PgPool,
    ids: &[Uuid],
) -> Result<HashMap<Uuid, Vec<MediaRef>>, Error> {
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
    .fetch_all(pool)
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
