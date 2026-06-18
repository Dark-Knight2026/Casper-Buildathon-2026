//! Database operations for properties.
//!
//! Compile-time `sqlx` macros (checked against the `.sqlx` offline cache;
//! regenerate with `make prepare` after a schema change). NUMERIC columns
//! (`latitude`/`longitude`/`bathrooms`) are cast to `float8` so they decode
//! into `f64` without a Decimal dependency, and the matching insert params are
//! cast to `double precision` so the macro's type check passes before the DB.

use chrono::{DateTime, Utc};
use sqlx::{Error, PgPool};
use uuid::Uuid;

/// A property row as stored, using the legacy 2023 column names. The
/// RESO-aligned wire shape is produced by the model-layer `From` impl.
#[derive(Debug)]
pub struct PropertyRow {
    /// Property id.
    pub id: Uuid,
    /// USPS-normalized canonical address (generated dedup/display key).
    pub normalized_address: Option<String>,
    /// County parcel / APN; null until matched.
    pub parcel_id: Option<String>,
    /// Street address line 1.
    pub address_line1: String,
    /// Street address line 2 (unit/suite).
    pub address_line2: Option<String>,
    /// City.
    pub city: String,
    /// State / province (legacy `state` column; RESO `stateOrProvince`).
    pub state: String,
    /// Postal code (legacy `zip_code` column; RESO `postalCode`).
    pub zip_code: String,
    /// Latitude, cast to `float8`.
    pub latitude: Option<f64>,
    /// Longitude, cast to `float8`.
    pub longitude: Option<f64>,
    /// Property type (matches the schema CHECK constraint).
    pub property_type: String,
    /// Bedroom count (RESO `bedroomsTotal`).
    pub bedrooms: Option<i32>,
    /// Bathroom count, cast to `float8` (RESO `bathroomsTotal`).
    pub bathrooms: Option<f64>,
    /// Living area in sqft (RESO `livingArea`).
    pub square_feet: Option<i32>,
    /// Year built.
    pub year_built: Option<i32>,
    /// RESO parking features.
    pub parking_features: Option<Vec<String>>,
    /// Off-chain metadata pointer (`ipfs://{cid}`) pinned on create/update;
    /// the on-chain registration argument. Null until the first pin.
    pub metadata_uri: Option<String>,
    /// Contract-assigned `PropertyRegistry` id (U256 as a decimal string),
    /// written by the indexer from the `PropertyCreated` event.
    /// `null` until observed on-chain.
    pub onchain_property_id: Option<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// A lightweight listing row for the per-property offer history. Full listing
/// serialization (nested property, provenance, terms) lives in the listings
/// domain; this summary is all the property-scoped history view needs.
#[derive(Debug)]
pub struct ListingSummaryRow {
    /// Listing id.
    pub id: Uuid,
    /// Offer intent (`rent_ltr`, ...).
    pub intent: String,
    /// Lifecycle state.
    pub state: String,
    /// Listing title.
    pub title: String,
    /// Days the listing has been on market.
    pub days_on_market: i32,
    /// Auto-expiry timestamp, if set.
    pub expires_at: Option<DateTime<Utc>>,
    /// Unique-tenant view count.
    pub views: i32,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Validated input for [`upsert_property`], already mapped onto the legacy
/// column names by the model layer.
#[derive(Debug)]
pub struct NewProperty {
    /// Street address line 1.
    pub address_line1: String,
    /// Street address line 2 (unit/suite).
    pub address_line2: Option<String>,
    /// City.
    pub city: String,
    /// State / province (legacy `state` column).
    pub state: String,
    /// Postal code (legacy `zip_code` column).
    pub zip_code: String,
    /// Property type.
    pub property_type: String,
    /// Latitude.
    pub latitude: Option<f64>,
    /// Longitude.
    pub longitude: Option<f64>,
    /// Bedroom count.
    pub bedrooms: Option<i32>,
    /// Bathroom count.
    pub bathrooms: Option<f64>,
    /// Living area in sqft.
    pub square_feet: Option<i32>,
    /// Year built.
    pub year_built: Option<i32>,
    /// Parking features.
    pub parking_features: Option<Vec<String>>,
    /// County parcel / APN.
    pub parcel_id: Option<String>,
}

/// Validated partial update for [`update_property`], already mapped onto the
/// legacy column names by the model layer. Every field is optional: `None`
/// leaves the stored column untouched (the SQL COALESCEs each one).
#[derive(Debug)]
pub struct PropertyPatch {
    /// Street address line 1.
    pub address_line1: Option<String>,
    /// Street address line 2 (unit/suite).
    pub address_line2: Option<String>,
    /// City.
    pub city: Option<String>,
    /// State / province (legacy `state` column).
    pub state: Option<String>,
    /// Postal code (legacy `zip_code` column).
    pub zip_code: Option<String>,
    /// Property type.
    pub property_type: Option<String>,
    /// Latitude.
    pub latitude: Option<f64>,
    /// Longitude.
    pub longitude: Option<f64>,
    /// Bedroom count.
    pub bedrooms: Option<i32>,
    /// Bathroom count.
    pub bathrooms: Option<f64>,
    /// Living area in sqft.
    pub square_feet: Option<i32>,
    /// Year built.
    pub year_built: Option<i32>,
    /// Parking features.
    pub parking_features: Option<Vec<String>>,
    /// County parcel / APN.
    pub parcel_id: Option<String>,
}

/// Outcome of an owner-scoped [`update_property`].
#[derive(Debug)]
pub enum PropertyUpdate {
    /// Updated; carries the fresh row (boxed - it is large relative to the
    /// other variants).
    Updated(Box<PropertyRow>),
    /// No live property has that id.
    NotFound,
    /// The caller is not the property's owner.
    Forbidden,
}

/// Validated geo + pagination filter for [`search_properties_geo`]. Radius and
/// bbox bounds are pre-parsed; absent bounds are `None` (no filter on that
/// axis). Limit/offset are already clamped by the pagination layer.
#[derive(Debug)]
pub struct GeoSearch {
    /// Radius-center latitude.
    pub near_lat: Option<f64>,
    /// Radius-center longitude.
    pub near_lng: Option<f64>,
    /// Search radius in miles.
    pub radius_miles: Option<f64>,
    /// Bounding-box minimum longitude.
    pub bbox_min_lng: Option<f64>,
    /// Bounding-box minimum latitude.
    pub bbox_min_lat: Option<f64>,
    /// Bounding-box maximum longitude.
    pub bbox_max_lng: Option<f64>,
    /// Bounding-box maximum latitude.
    pub bbox_max_lat: Option<f64>,
    /// Page size (LIMIT).
    pub limit: i64,
    /// Page offset (OFFSET).
    pub offset: i64,
}

/// Flat [`upsert_property`] result: every property column plus the `xmax = 0`
/// insert/conflict discriminator, kept private since the handler only sees the
/// split `(PropertyRow, bool)`.
#[derive(Debug)]
struct UpsertRow {
    id: Uuid,
    normalized_address: Option<String>,
    parcel_id: Option<String>,
    address_line1: String,
    address_line2: Option<String>,
    city: String,
    state: String,
    zip_code: String,
    latitude: Option<f64>,
    longitude: Option<f64>,
    property_type: String,
    bedrooms: Option<i32>,
    bathrooms: Option<f64>,
    square_feet: Option<i32>,
    year_built: Option<i32>,
    parking_features: Option<Vec<String>>,
    metadata_uri: Option<String>,
    onchain_property_id: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    was_inserted: bool,
}

/// Inserts a property, or returns the existing one when the address/parcel
/// fingerprint collides.
///
/// The fingerprint is computed by a BEFORE trigger, so `ON CONFLICT` sees the
/// derived value and collapses a duplicate physical asset onto the stored row.
/// `(xmax = 0)` is `true` only for a freshly inserted tuple, letting the caller
/// distinguish a create from a dedup hit.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn upsert_property(
    pool: &PgPool,
    landlord_id: Uuid,
    new: NewProperty,
) -> Result<(PropertyRow, bool), Error> {
    let row = sqlx::query_as!(
        UpsertRow,
        r#"
            INSERT INTO properties (
                landlord_id, property_type, address_line1, address_line2,
                city, state, zip_code, latitude, longitude, bedrooms,
                bathrooms, square_feet, year_built, parking_features, parcel_id
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8::double precision, $9::double precision, $10,
                $11::double precision, $12, $13, $14, $15
            )
            ON CONFLICT (fingerprint) DO UPDATE SET updated_at = NOW()
            RETURNING
                id,
                normalized_address,
                parcel_id,
                address_line1,
                address_line2,
                city,
                state,
                zip_code,
                latitude::float8 AS "latitude?",
                longitude::float8 AS "longitude?",
                property_type,
                bedrooms,
                bathrooms::float8 AS "bathrooms?",
                square_feet,
                year_built,
                parking_features,
                metadata_uri,
                onchain_property_id::text AS "onchain_property_id?",
                created_at AS "created_at!",
                updated_at AS "updated_at!",
                (xmax::text::bigint = 0) AS "was_inserted!"
        "#,
        landlord_id,
        new.property_type,
        new.address_line1,
        new.address_line2,
        new.city,
        new.state,
        new.zip_code,
        new.latitude,
        new.longitude,
        new.bedrooms,
        new.bathrooms,
        new.square_feet,
        new.year_built,
        new.parking_features.as_deref(),
        new.parcel_id,
    )
    .fetch_one(pool)
    .await?;

    let property = PropertyRow {
        id: row.id,
        normalized_address: row.normalized_address,
        parcel_id: row.parcel_id,
        address_line1: row.address_line1,
        address_line2: row.address_line2,
        city: row.city,
        state: row.state,
        zip_code: row.zip_code,
        latitude: row.latitude,
        longitude: row.longitude,
        property_type: row.property_type,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        square_feet: row.square_feet,
        year_built: row.year_built,
        parking_features: row.parking_features,
        metadata_uri: row.metadata_uri,
        onchain_property_id: row.onchain_property_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
    Ok((property, row.was_inserted))
}

/// Applies an owner-scoped partial update to a property, then revalidates its
/// listings, atomically.
///
/// The property row is locked `FOR UPDATE` to serialize against concurrent
/// edits and the owner check. Each column COALESCEs its patch field, so an
/// absent field keeps its stored value; the fingerprint BEFORE trigger
/// recomputes from the new values, so an edit that collides with another
/// physical asset surfaces as a unique violation (mapped to `409` upstream).
///
/// Editing the asset invalidates every listing's authority: live (`active`)
/// and submitted (`pending`) offers drop back to `draft`, and the gate resets
/// (`authority_tier` -> `T0`, identity and Fair Housing cleared) so the lister
/// must re-clear it before republishing.
///
/// # Errors
///
/// Returns [`Error`] on any database failure, including a fingerprint unique
/// violation when the edited address matches another property.
#[inline]
pub async fn update_property(
    pool: &PgPool,
    property_id: Uuid,
    owner_id: Uuid,
    patch: PropertyPatch,
) -> Result<PropertyUpdate, Error> {
    let mut tx = pool.begin().await?;

    let current_owner = sqlx::query_scalar!(
        r"
            SELECT landlord_id
            FROM properties
            WHERE id = $1 AND deleted_at IS NULL
            FOR UPDATE
        ",
        property_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current_owner) = current_owner else {
        return Ok(PropertyUpdate::NotFound);
    };
    if current_owner != owner_id {
        return Ok(PropertyUpdate::Forbidden);
    }

    let row = sqlx::query_as!(
        PropertyRow,
        r#"
            UPDATE properties
            SET
                address_line1 = COALESCE($2, address_line1),
                address_line2 = COALESCE($3, address_line2),
                city = COALESCE($4, city),
                state = COALESCE($5, state),
                zip_code = COALESCE($6, zip_code),
                property_type = COALESCE($7, property_type),
                latitude = COALESCE($8::double precision, latitude),
                longitude = COALESCE($9::double precision, longitude),
                bedrooms = COALESCE($10, bedrooms),
                bathrooms = COALESCE($11::double precision, bathrooms),
                square_feet = COALESCE($12, square_feet),
                year_built = COALESCE($13, year_built),
                parking_features = COALESCE($14, parking_features),
                parcel_id = COALESCE($15, parcel_id),
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id,
                normalized_address,
                parcel_id,
                address_line1,
                address_line2,
                city,
                state,
                zip_code,
                latitude::float8 AS "latitude?",
                longitude::float8 AS "longitude?",
                property_type,
                bedrooms,
                bathrooms::float8 AS "bathrooms?",
                square_feet,
                year_built,
                parking_features,
                metadata_uri,
                onchain_property_id::text AS "onchain_property_id?",
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        property_id,
        patch.address_line1,
        patch.address_line2,
        patch.city,
        patch.state,
        patch.zip_code,
        patch.property_type,
        patch.latitude,
        patch.longitude,
        patch.bedrooms,
        patch.bathrooms,
        patch.square_feet,
        patch.year_built,
        patch.parking_features.as_deref(),
        patch.parcel_id,
    )
    .fetch_one(tx.as_mut())
    .await?;

    sqlx::query!(
        r"
            UPDATE listings
            SET
                state = CASE WHEN state IN ('active', 'pending') THEN 'draft' ELSE state END,
                authority_tier = 'T0',
                identity_verified = false,
                fair_housing_cleared = false
            WHERE property_id = $1 AND deleted_at IS NULL
        ",
        property_id,
    )
    .execute(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(PropertyUpdate::Updated(Box::new(row)))
}

/// Stores a property's pinned-metadata pointer (`ipfs://{cid}`).
///
/// Called after create/update once the handler has pinned the metadata JSON.
/// Kept separate from the data write so the URI reflects the row exactly as
/// stored - including a dedup hit that collapsed the create onto an existing
/// row - and so a null pointer on a pre-existing row is backfilled on the next
/// pin. `updated_at` is intentionally left untouched: this is a derived
/// pointer, not a user edit.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn set_property_metadata_uri(
    pool: &PgPool,
    property_id: Uuid,
    metadata_uri: &str,
) -> Result<(), Error> {
    sqlx::query!(
        r"
            UPDATE properties
            SET metadata_uri = $2
            WHERE id = $1 AND deleted_at IS NULL
        ",
        property_id,
        metadata_uri,
    )
    .execute(pool)
    .await?;
    Ok(())
}

/// Fetches a single property by id (public detail; no owner scoping).
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when no live property has that id, or any
/// other database error.
#[inline]
pub async fn fetch_property(pool: &PgPool, property_id: Uuid) -> Result<PropertyRow, Error> {
    sqlx::query_as!(
        PropertyRow,
        r#"
            SELECT
                id,
                normalized_address,
                parcel_id,
                address_line1,
                address_line2,
                city,
                state,
                zip_code,
                latitude::float8 AS "latitude?",
                longitude::float8 AS "longitude?",
                property_type,
                bedrooms,
                bathrooms::float8 AS "bathrooms?",
                square_feet,
                year_built,
                parking_features,
                metadata_uri,
                onchain_property_id::text AS "onchain_property_id?",
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM properties
            WHERE id = $1 AND deleted_at IS NULL
        "#,
        property_id,
    )
    .fetch_one(pool)
    .await
}

/// Returns the owning landlord id of a property, or `None` if it does not
/// exist. Used to gate owner-scoped reads without leaking row contents.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_property_owner(pool: &PgPool, property_id: Uuid) -> Result<Option<Uuid>, Error> {
    sqlx::query_scalar!(
        r"
            SELECT landlord_id
            FROM properties
            WHERE id = $1 AND deleted_at IS NULL
        ",
        property_id,
    )
    .fetch_optional(pool)
    .await
}

/// Lists every live listing made against a property, newest first.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_property_listings(
    pool: &PgPool,
    property_id: Uuid,
) -> Result<Vec<ListingSummaryRow>, Error> {
    sqlx::query_as!(
        ListingSummaryRow,
        r#"
            SELECT
                id,
                intent,
                state,
                title,
                days_on_market,
                expires_at,
                views,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM listings
            WHERE property_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
        "#,
        property_id,
    )
    .fetch_all(pool)
    .await
}

/// Geo + paginated property search. Returns the matching page and the total
/// match count (for pagination metadata).
///
/// Radius (`near_lat`/`near_lng`/`radius_miles`) and bbox bounds are optional
/// nullable params: a `NULL` bound short-circuits its branch to `true`, so the
/// same cached query serves radius-only, bbox-only, both, or neither. A NULL
/// `geog` (property without coordinates) drops out of any geo filter. Radius
/// results are ordered by true spherical distance; otherwise newest first.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn search_properties_geo(
    pool: &PgPool,
    search: &GeoSearch,
) -> Result<(Vec<PropertyRow>, i64), Error> {
    let mut tx = pool.begin().await?;

    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM properties
            WHERE deleted_at IS NULL
              AND ($3::float8 IS NULL OR ST_DWithin(
                    geog,
                    ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
                    $3::float8 * 1609.34
                  ))
              AND ($4::float8 IS NULL OR ST_Intersects(
                    geog,
                    ST_MakeEnvelope($4::float8, $5::float8, $6::float8, $7::float8, 4326)::geography
                  ))
        "#,
        search.near_lat,
        search.near_lng,
        search.radius_miles,
        search.bbox_min_lng,
        search.bbox_min_lat,
        search.bbox_max_lng,
        search.bbox_max_lat,
    )
    .fetch_one(tx.as_mut())
    .await?;

    let rows = sqlx::query_as!(
        PropertyRow,
        r#"
            SELECT
                id,
                normalized_address,
                parcel_id,
                address_line1,
                address_line2,
                city,
                state,
                zip_code,
                latitude::float8 AS "latitude?",
                longitude::float8 AS "longitude?",
                property_type,
                bedrooms,
                bathrooms::float8 AS "bathrooms?",
                square_feet,
                year_built,
                parking_features,
                metadata_uri,
                onchain_property_id::text AS "onchain_property_id?",
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM properties
            WHERE deleted_at IS NULL
              AND ($3::float8 IS NULL OR ST_DWithin(
                    geog,
                    ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography,
                    $3::float8 * 1609.34
                  ))
              AND ($4::float8 IS NULL OR ST_Intersects(
                    geog,
                    ST_MakeEnvelope($4::float8, $5::float8, $6::float8, $7::float8, 4326)::geography
                  ))
            ORDER BY
                CASE
                    WHEN $1::float8 IS NOT NULL AND $2::float8 IS NOT NULL
                    THEN ST_Distance(geog, ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography)
                    ELSE NULL
                END ASC NULLS LAST,
                created_at DESC
            LIMIT $8 OFFSET $9
        "#,
        search.near_lat,
        search.near_lng,
        search.radius_miles,
        search.bbox_min_lng,
        search.bbox_min_lat,
        search.bbox_max_lng,
        search.bbox_max_lat,
        search.limit,
        search.offset,
    )
    .fetch_all(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok((rows, total))
}
