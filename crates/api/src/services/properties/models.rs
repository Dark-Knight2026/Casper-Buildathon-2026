//! Request/response models for the property endpoints.
//!
//! The DB keeps the original 2023 column names (`state`, `zip_code`,
//! `bedrooms`, ...); this layer is the RESO-aligned facade. Wire field names
//! are camelCased (`stateOrProvince`, `postalCode`, `bedroomsTotal`,
//! `livingArea`, `parkingFeatures`) via `#[serde(rename_all = "camelCase")]`
//! and mapped back to the legacy columns in the [`From`]/`into_validated`
//! conversions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, Pagination, PropertyId},
    services::properties::db::{
        GeoSearch, ListingSummaryRow, NewProperty, PropertyPatch, PropertyRow,
    },
};

/// Property types accepted on create. Mirrors the `properties.property_type`
/// CHECK constraint from the 2023 schema; the RESO display taxonomy
/// (`house`/`studio`/`loft`) is a frontend concern to reconcile before
/// Phase 3, so the DB constraint stays the authority.
const PROPERTY_TYPES: [&str; 7] = [
    "single_family",
    "multi_family",
    "apartment",
    "condo",
    "townhouse",
    "commercial",
    "other",
];

const MAX_ADDRESS_LEN: usize = 200;
const MAX_CITY_LEN: usize = 100;
const MAX_STATE_LEN: usize = 50;
const MAX_POSTAL_LEN: usize = 20;
const MAX_PARCEL_LEN: usize = 100;
const MAX_PARKING_FEATURE_LEN: usize = 100;
const MAX_PARKING_FEATURES: usize = 32;

/// Physical-asset record (RESO-aligned). Returned by detail and create.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Property {
    /// Property id.
    #[schema(value_type = Uuid)]
    pub id: PropertyId,
    /// USPS-normalized canonical address (the dedup/display key).
    pub normalized_address: Option<String>,
    /// County parcel / APN; null until matched.
    pub parcel_apn: Option<String>,
    /// Street address line 1.
    pub address_line1: String,
    /// Street address line 2 (unit/suite).
    pub address_line2: Option<String>,
    /// City.
    pub city: String,
    /// State / province (RESO `StateOrProvince`).
    pub state_or_province: String,
    /// Postal code (RESO `PostalCode`).
    pub postal_code: String,
    /// Latitude.
    pub latitude: Option<f64>,
    /// Longitude.
    pub longitude: Option<f64>,
    /// Property type.
    pub property_type: String,
    /// Bedroom count (RESO `BedroomsTotal`).
    pub bedrooms_total: Option<i32>,
    /// Bathroom count (RESO `BathroomsTotal`); fractional allowed.
    pub bathrooms_total: Option<f64>,
    /// Living area in sqft (RESO `LivingArea`).
    pub living_area: Option<i32>,
    /// Year built.
    pub year_built: Option<i32>,
    /// RESO parking features.
    pub parking_features: Vec<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl From<PropertyRow> for Property {
    #[inline]
    fn from(row: PropertyRow) -> Self {
        Self {
            id: row.id,
            normalized_address: row.normalized_address,
            parcel_apn: row.parcel_id,
            address_line1: row.address_line1,
            address_line2: row.address_line2,
            city: row.city,
            state_or_province: row.state,
            postal_code: row.zip_code,
            latitude: row.latitude,
            longitude: row.longitude,
            property_type: row.property_type,
            bedrooms_total: row.bedrooms,
            bathrooms_total: row.bathrooms,
            living_area: row.square_feet,
            year_built: row.year_built,
            parking_features: row.parking_features.unwrap_or_default(),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// One listing in a property's offer history (lightweight summary).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PropertyListingSummary {
    /// Listing id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Offer intent (`rent_ltr`, ...).
    pub intent: String,
    /// Lifecycle state.
    pub state: String,
    /// Listing title.
    pub title: String,
    /// Days on market.
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

impl From<ListingSummaryRow> for PropertyListingSummary {
    #[inline]
    fn from(row: ListingSummaryRow) -> Self {
        Self {
            id: row.id,
            intent: row.intent,
            state: row.state,
            title: row.title,
            days_on_market: row.days_on_market,
            expires_at: row.expires_at,
            views: row.views,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Create-a-property payload. Dedup-aware: an address/parcel match returns the
/// existing property rather than creating a duplicate.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreatePropertyRequest {
    /// Street address line 1 (required).
    pub address_line1: String,
    /// Street address line 2 (unit/suite).
    pub address_line2: Option<String>,
    /// City (required).
    pub city: String,
    /// State / province (required).
    pub state_or_province: String,
    /// Postal code (required).
    pub postal_code: String,
    /// Property type (must match an allowed value).
    pub property_type: String,
    /// Latitude in `[-90, 90]`.
    pub latitude: Option<f64>,
    /// Longitude in `[-180, 180]`.
    pub longitude: Option<f64>,
    /// Bedroom count (non-negative).
    pub bedrooms_total: Option<i32>,
    /// Bathroom count (non-negative; fractional allowed).
    pub bathrooms_total: Option<f64>,
    /// Living area in sqft (non-negative).
    pub living_area: Option<i32>,
    /// Year built (non-negative).
    pub year_built: Option<i32>,
    /// Parking features.
    pub parking_features: Option<Vec<String>>,
    /// County parcel / APN.
    pub parcel_apn: Option<String>,
}

impl CreatePropertyRequest {
    /// Trims, validates, and maps the payload onto the legacy column names.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when a required field is empty, a
    /// length cap is exceeded, `propertyType` is not an allowed value, a
    /// coordinate is out of range, or a numeric attribute is negative.
    #[inline]
    pub fn into_validated(self) -> ApiResult<NewProperty> {
        let property_type = self.property_type.trim().to_owned();
        if !PROPERTY_TYPES.contains(&property_type.as_str()) {
            return Err(ApiError::BadRequest(format!(
                "propertyType must be one of: {}",
                PROPERTY_TYPES.join(", ")
            )));
        }

        validate_coordinate("latitude", self.latitude, 90.0)?;
        validate_coordinate("longitude", self.longitude, 180.0)?;
        non_negative_int("bedroomsTotal", self.bedrooms_total)?;
        non_negative_int("livingArea", self.living_area)?;
        non_negative_int("yearBuilt", self.year_built)?;
        if let Some(bathrooms) = self.bathrooms_total
            && (!bathrooms.is_finite() || bathrooms < 0.0)
        {
            return Err(ApiError::BadRequest(
                "bathroomsTotal must be a non-negative number".to_owned(),
            ));
        }

        Ok(NewProperty {
            address_line1: required("addressLine1", &self.address_line1, MAX_ADDRESS_LEN)?,
            address_line2: optional("addressLine2", self.address_line2, MAX_ADDRESS_LEN)?,
            city: required("city", &self.city, MAX_CITY_LEN)?,
            state: required("stateOrProvince", &self.state_or_province, MAX_STATE_LEN)?,
            zip_code: required("postalCode", &self.postal_code, MAX_POSTAL_LEN)?,
            property_type,
            latitude: self.latitude,
            longitude: self.longitude,
            bedrooms: self.bedrooms_total,
            bathrooms: self.bathrooms_total,
            square_feet: self.living_area,
            year_built: self.year_built,
            parking_features: validate_parking(self.parking_features)?,
            parcel_id: optional("parcelApn", self.parcel_apn, MAX_PARCEL_LEN)?,
        })
    }
}

/// Edit-a-property payload. Every field is optional: an omitted field is left
/// untouched, so a landlord can correct a single mistyped value. Editing any
/// field re-triggers listing revalidation (handled in the DB layer), since a
/// changed physical asset invalidates a listing's authority.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePropertyRequest {
    /// Street address line 1.
    pub address_line1: Option<String>,
    /// Street address line 2 (unit/suite).
    pub address_line2: Option<String>,
    /// City.
    pub city: Option<String>,
    /// State / province.
    pub state_or_province: Option<String>,
    /// Postal code.
    pub postal_code: Option<String>,
    /// Property type (must match an allowed value).
    pub property_type: Option<String>,
    /// Latitude in `[-90, 90]`.
    pub latitude: Option<f64>,
    /// Longitude in `[-180, 180]`.
    pub longitude: Option<f64>,
    /// Bedroom count (non-negative).
    pub bedrooms_total: Option<i32>,
    /// Bathroom count (non-negative; fractional allowed).
    pub bathrooms_total: Option<f64>,
    /// Living area in sqft (non-negative).
    pub living_area: Option<i32>,
    /// Year built (non-negative).
    pub year_built: Option<i32>,
    /// Parking features.
    pub parking_features: Option<Vec<String>>,
    /// County parcel / APN.
    pub parcel_apn: Option<String>,
}

impl UpdatePropertyRequest {
    /// Trims, validates, and maps the present fields onto the legacy column
    /// names. Absent fields stay `None` so the DB layer's COALESCE leaves them
    /// untouched.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when a provided field is blank, a length
    /// cap is exceeded, `propertyType` is not an allowed value, a coordinate is
    /// out of range, or a numeric attribute is negative.
    #[inline]
    pub fn into_validated_patch(self) -> ApiResult<PropertyPatch> {
        let property_type = match self.property_type {
            Some(raw) => {
                let trimmed = raw.trim().to_owned();
                if !PROPERTY_TYPES.contains(&trimmed.as_str()) {
                    return Err(ApiError::BadRequest(format!(
                        "propertyType must be one of: {}",
                        PROPERTY_TYPES.join(", ")
                    )));
                }
                Some(trimmed)
            }
            None => None,
        };

        validate_coordinate("latitude", self.latitude, 90.0)?;
        validate_coordinate("longitude", self.longitude, 180.0)?;
        non_negative_int("bedroomsTotal", self.bedrooms_total)?;
        non_negative_int("livingArea", self.living_area)?;
        non_negative_int("yearBuilt", self.year_built)?;
        if let Some(bathrooms) = self.bathrooms_total
            && (!bathrooms.is_finite() || bathrooms < 0.0)
        {
            return Err(ApiError::BadRequest(
                "bathroomsTotal must be a non-negative number".to_owned(),
            ));
        }

        Ok(PropertyPatch {
            address_line1: required_if_present(
                "addressLine1",
                self.address_line1,
                MAX_ADDRESS_LEN,
            )?,
            address_line2: optional("addressLine2", self.address_line2, MAX_ADDRESS_LEN)?,
            city: required_if_present("city", self.city, MAX_CITY_LEN)?,
            state: required_if_present("stateOrProvince", self.state_or_province, MAX_STATE_LEN)?,
            zip_code: required_if_present("postalCode", self.postal_code, MAX_POSTAL_LEN)?,
            property_type,
            latitude: self.latitude,
            longitude: self.longitude,
            bedrooms: self.bedrooms_total,
            bathrooms: self.bathrooms_total,
            square_feet: self.living_area,
            year_built: self.year_built,
            parking_features: validate_parking(self.parking_features)?,
            parcel_id: optional("parcelApn", self.parcel_apn, MAX_PARCEL_LEN)?,
        })
    }
}

/// Trims a required string, rejecting empty/over-long values.
fn required(field: &str, value: &str, max_len: usize) -> ApiResult<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest(format!("{field} cannot be empty")));
    }
    if trimmed.chars().count() > max_len {
        return Err(ApiError::BadRequest(format!(
            "{field} must be at most {max_len} characters"
        )));
    }
    Ok(trimmed.to_owned())
}

/// Validates a patch field backing a NOT NULL column: an absent value stays
/// `None` (column left untouched), but a present one must be non-blank and
/// within length, since the column cannot store an empty value.
fn required_if_present(
    field: &str,
    value: Option<String>,
    max_len: usize,
) -> ApiResult<Option<String>> {
    let Some(raw) = value else {
        return Ok(None);
    };
    Ok(Some(required(field, &raw, max_len)?))
}

/// Trims an optional string; blank collapses to `None`.
fn optional(field: &str, value: Option<String>, max_len: usize) -> ApiResult<Option<String>> {
    let Some(raw) = value else {
        return Ok(None);
    };
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.chars().count() > max_len {
        return Err(ApiError::BadRequest(format!(
            "{field} must be at most {max_len} characters"
        )));
    }
    Ok(Some(trimmed.to_owned()))
}

/// Rejects a coordinate that is non-finite or outside `[-bound, bound]`.
fn validate_coordinate(field: &str, value: Option<f64>, bound: f64) -> ApiResult<()> {
    if let Some(coord) = value
        && (!coord.is_finite() || coord.abs() > bound)
    {
        return Err(ApiError::BadRequest(format!("{field} is out of range")));
    }
    Ok(())
}

/// Rejects a negative integer attribute.
fn non_negative_int(field: &str, value: Option<i32>) -> ApiResult<()> {
    if let Some(number) = value
        && number < 0
    {
        return Err(ApiError::BadRequest(format!(
            "{field} must be non-negative"
        )));
    }
    Ok(())
}

/// Trims parking features, dropping blanks and capping count/length. Empty
/// result collapses to `None`.
fn validate_parking(value: Option<Vec<String>>) -> ApiResult<Option<Vec<String>>> {
    let Some(raw) = value else {
        return Ok(None);
    };
    if raw.len() > MAX_PARKING_FEATURES {
        return Err(ApiError::BadRequest(format!(
            "parkingFeatures must have at most {MAX_PARKING_FEATURES} items"
        )));
    }
    let mut features = Vec::with_capacity(raw.len());
    for item in raw {
        let trimmed = item.trim();
        if trimmed.is_empty() {
            continue;
        }
        if trimmed.chars().count() > MAX_PARKING_FEATURE_LEN {
            return Err(ApiError::BadRequest(format!(
                "each parkingFeatures item must be at most {MAX_PARKING_FEATURE_LEN} characters"
            )));
        }
        features.push(trimmed.to_owned());
    }
    Ok(if features.is_empty() {
        None
    } else {
        Some(features)
    })
}

/// Geo + pagination query for `GET /properties/search`. Radius mode requires
/// `nearLat`+`nearLng`+`radiusMiles` together; `bbox` is
/// `minLng,minLat,maxLng,maxLat`. Both modes may combine (AND); neither lists all.
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct PropertySearchParams {
    /// Radius-center latitude (with `nearLng` + `radiusMiles`).
    pub near_lat: Option<f64>,
    /// Radius-center longitude (with `nearLat` + `radiusMiles`).
    pub near_lng: Option<f64>,
    /// Search radius in miles, `(0, 500]`.
    pub radius_miles: Option<f64>,
    /// Bounding box `minLng,minLat,maxLng,maxLat`.
    pub bbox: Option<String>,
}

impl PropertySearchParams {
    /// Validates geo params and resolves bbox + pagination into a [`GeoSearch`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when the radius trio is partial, a
    /// coordinate/radius is out of range, or `bbox` is malformed.
    #[inline]
    pub fn into_validated(self, pagination: &Pagination) -> ApiResult<GeoSearch> {
        let radius_count = [
            self.near_lat.is_some(),
            self.near_lng.is_some(),
            self.radius_miles.is_some(),
        ]
        .iter()
        .filter(|present| **present)
        .count();
        if radius_count != 0 && radius_count != 3 {
            return Err(ApiError::BadRequest(
                "nearLat, nearLng and radiusMiles must be provided together".to_owned(),
            ));
        }
        validate_coordinate("nearLat", self.near_lat, 90.0)?;
        validate_coordinate("nearLng", self.near_lng, 180.0)?;
        if let Some(radius) = self.radius_miles
            && (!radius.is_finite() || radius <= 0.0 || radius > 500.0)
        {
            // 500-mile ceiling keeps the radius scan bounded.
            return Err(ApiError::BadRequest(
                "radiusMiles must be in (0, 500]".to_owned(),
            ));
        }

        let (bbox_min_lng, bbox_min_lat, bbox_max_lng, bbox_max_lat) = match &self.bbox {
            Some(raw) => {
                let (min_lng, min_lat, max_lng, max_lat) = parse_bbox(raw)?;
                (Some(min_lng), Some(min_lat), Some(max_lng), Some(max_lat))
            }
            None => (None, None, None, None),
        };

        Ok(GeoSearch {
            near_lat: self.near_lat,
            near_lng: self.near_lng,
            radius_miles: self.radius_miles,
            bbox_min_lng,
            bbox_min_lat,
            bbox_max_lng,
            bbox_max_lat,
            limit: pagination.page_size(),
            offset: pagination.offset(),
        })
    }
}

/// Parses a `minLng,minLat,maxLng,maxLat` bbox string into validated bounds.
fn parse_bbox(raw: &str) -> ApiResult<(f64, f64, f64, f64)> {
    let parts = raw.split(',').collect::<Vec<_>>();
    if parts.len() != 4 {
        return Err(ApiError::BadRequest(
            "bbox must be 'minLng,minLat,maxLng,maxLat'".to_owned(),
        ));
    }
    let bounds = parts
        .iter()
        .map(|part| part.trim().parse::<f64>())
        .collect::<Result<Vec<f64>, _>>()
        .map_err(|_| ApiError::BadRequest("bbox values must be numbers".to_owned()))?;
    let (min_lng, min_lat, max_lng, max_lat) = (bounds[0], bounds[1], bounds[2], bounds[3]);
    if !(-180.0..=180.0).contains(&min_lng)
        || !(-180.0..=180.0).contains(&max_lng)
        || !(-90.0..=90.0).contains(&min_lat)
        || !(-90.0..=90.0).contains(&max_lat)
    {
        return Err(ApiError::BadRequest(
            "bbox coordinates out of range".to_owned(),
        ));
    }
    if min_lng > max_lng || min_lat > max_lat {
        return Err(ApiError::BadRequest(
            "bbox min must not exceed max".to_owned(),
        ));
    }
    Ok((min_lng, min_lat, max_lng, max_lat))
}
