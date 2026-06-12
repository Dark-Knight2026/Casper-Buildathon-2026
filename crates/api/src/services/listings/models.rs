//! Request/response models for the listing endpoints.
//!
//! `surrounding_area` and `terms` are JSONB passed through as
//! `serde_json::Value` (terms are polymorphic by intent; MVP serves
//! `RentLtrTerms`). `provenance` is derived read-only from the gate columns.

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strum::{Display, EnumString};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, Pagination},
    services::{
        listings::db::{
            ListingFilter, ListingPatch, ListingRow, ListingSort, MediaRow, NewListing,
        },
        properties::models::Property,
    },
};

/// Moderation state of a media item. Stored as TEXT (CHECK constraint) in the
/// DB; parsed into this enum at the model boundary.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ModerationStatus {
    /// Awaiting moderation; excluded from public display.
    Pending,
    /// Approved for public display.
    Approved,
    /// Rejected.
    Rejected,
}

/// A media item attached to a listing.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MediaRef {
    /// Media id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// CDN-fronted URL.
    pub url: String,
    /// IPFS content id; null until pinned.
    pub cid: Option<String>,
    /// Display ordering.
    pub position: i32,
    /// Moderation state.
    pub moderation_status: ModerationStatus,
}

impl From<MediaRow> for MediaRef {
    #[inline]
    fn from(row: MediaRow) -> Self {
        Self {
            id: row.id,
            url: row.url,
            cid: row.cid,
            position: row.position,
            moderation_status: ModerationStatus::from_str(&row.moderation_status)
                .unwrap_or(ModerationStatus::Pending),
        }
    }
}

/// Offer intent. Stored as TEXT (CHECK) in the DB; MVP creates only `RentLtr`.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ListingIntent {
    /// Long-term rental.
    RentLtr,
    /// Short-term rental.
    RentStr,
    /// Sale.
    Sale,
    /// Fractional offering.
    Fractional,
}

/// Lifecycle state machine for a listing. Stored as TEXT (CHECK) in the DB.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ListingState {
    /// Editable draft, not publicly visible.
    Draft,
    /// Live and publicly searchable.
    Active,
    /// Under offer / application review.
    Pending,
    /// Leased.
    Leased,
    /// Sold.
    Sold,
    /// Withdrawn by the lister.
    Withdrawn,
    /// Auto-expired (days-on-market).
    Expired,
}

impl ListingState {
    /// Whether an owner may drive this listing from `self` to `target`.
    ///
    /// Forward lifecycle only. `withdrawn` is reached via `DELETE` (soft
    /// withdraw) and `expired` via the auto-expiry worker, so neither is
    /// settable through the state endpoint. `pending` is the post-submit,
    /// pre-publish holding state where the authority gate runs before
    /// `-> active`.
    #[inline]
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        matches!(
            (self, target),
            (Self::Draft, Self::Pending)
                | (Self::Pending, Self::Active | Self::Draft)
                | (Self::Active, Self::Leased | Self::Sold | Self::Draft)
        )
    }
}

/// Authority-to-list tier. Stored as TEXT (`T0`/`T1`/`T2`) in the DB; serde
/// keeps the uppercase wire form rather than `snake_case`.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
pub enum AuthorityTier {
    /// Self-attested (lowest).
    #[serde(rename = "T0")]
    #[strum(serialize = "T0")]
    T0,
    /// Documents on file.
    #[serde(rename = "T1")]
    #[strum(serialize = "T1")]
    T1,
    /// Source-verified (deferred in the hackathon).
    #[serde(rename = "T2")]
    #[strum(serialize = "T2")]
    T2,
}

/// Read-only provenance / authority badge derived from the gate columns.
///
/// The four booleans are the ADR-007 §3 gate contract (identity, PM
/// attribution, Fair Housing, derived badge), not a state machine - they ship
/// as-is on the wire, so they stay flat rather than folding into enums.
#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListingProvenance {
    /// Gate 1 - identity (KYC) verified.
    pub identity_verified: bool,
    /// Gate 2 - authority tier (`T0`/`T1`/`T2`).
    pub authority_tier: AuthorityTier,
    /// Human label for the authority tier.
    pub authority_label: String,
    /// Conduct attributes to a property manager (ADR-006).
    pub managed_by_pm: bool,
    /// Gate 3 - Fair Housing advertising screen cleared.
    pub fair_housing_cleared: bool,
    /// "Verified lister" badge: identity verified AND authority >= T1.
    pub verified_lister_badge: bool,
}

impl ListingProvenance {
    /// Derives the provenance view (label + badge) from the gate columns.
    fn from_parts(
        identity_verified: bool,
        authority_tier: &str,
        fair_housing_cleared: bool,
        managed_by_pm: bool,
    ) -> Self {
        let tier = AuthorityTier::from_str(authority_tier).unwrap_or(AuthorityTier::T0);
        let authority_label = match tier {
            AuthorityTier::T1 => "Documents on file",
            AuthorityTier::T2 if managed_by_pm => "Verified manager",
            AuthorityTier::T2 => "Verified owner",
            AuthorityTier::T0 => "Unverified",
        }
        .to_owned();
        // Hackathon badge threshold is T1 (full ADR raises it to T2).
        let verified_lister_badge = identity_verified && tier != AuthorityTier::T0;
        Self {
            identity_verified,
            authority_tier: tier,
            authority_label,
            managed_by_pm,
            fair_housing_cleared,
            verified_lister_badge,
        }
    }
}

/// A listing: a time-bound offer against a property.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Listing {
    /// Listing id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Physical property this offer is against.
    #[schema(value_type = Uuid)]
    pub property_id: Uuid,
    /// Landlord / PM who listed it.
    #[schema(value_type = Uuid)]
    pub listed_by: Uuid,
    /// Offer intent (`rent_ltr`, ...).
    pub intent: ListingIntent,
    /// Lifecycle state.
    pub state: ListingState,
    /// Days on market.
    pub days_on_market: i32,
    /// Auto-expiry timestamp, if set.
    pub expires_at: Option<DateTime<Utc>>,
    /// Listing title.
    pub title: String,
    /// Listing description.
    pub description: String,
    /// Amenities.
    pub amenities: Vec<String>,
    /// Utilities included.
    pub utilities_included: Vec<String>,
    /// Pet policy label.
    pub pet_policy: Option<String>,
    /// Available date (`YYYY-MM-DD`).
    pub available_date: Option<NaiveDate>,
    /// Surrounding points of interest (JSON array).
    #[schema(value_type = Object)]
    pub surrounding_area: Value,
    /// Pricing/terms, polymorphic by intent (JSON).
    #[schema(value_type = Object)]
    pub terms: Value,
    /// Unique-tenant view count.
    pub views: i32,
    /// Derived provenance / authority view.
    pub provenance: ListingProvenance,
    /// On-chain anchor; always null in the hackathon.
    #[schema(value_type = Option<Object>)]
    pub on_chain: Option<Value>,
    /// Media items (approved only in public responses).
    pub media: Vec<MediaRef>,
    /// Nested physical property (present in detail/search responses).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub property: Option<Property>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl Listing {
    /// Assembles the wire shape from a row plus its nested property and media.
    #[inline]
    #[must_use]
    pub fn assemble(row: ListingRow, property: Option<Property>, media: Vec<MediaRef>) -> Self {
        let provenance = ListingProvenance::from_parts(
            row.identity_verified,
            &row.authority_tier,
            row.fair_housing_cleared,
            row.managed_by_pm,
        );
        Self {
            id: row.id,
            property_id: row.property_id,
            listed_by: row.listed_by,
            intent: ListingIntent::from_str(&row.intent).unwrap_or(ListingIntent::RentLtr),
            state: ListingState::from_str(&row.state).unwrap_or(ListingState::Draft),
            days_on_market: row.days_on_market,
            expires_at: row.expires_at,
            title: row.title,
            description: row.description,
            amenities: row.amenities,
            utilities_included: row.utilities_included,
            pet_policy: row.pet_policy,
            available_date: row.available_date,
            surrounding_area: row.surrounding_area.0,
            terms: row.terms.0,
            views: row.views,
            provenance,
            on_chain: None,
            media,
            property,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Public search query for `GET /listings` (active listings only). Geo, plus
/// non-protected-class attribute filters and a whitelisted sort.
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct ListingSearchParams {
    /// ILIKE over title + address line 1.
    pub search: Option<String>,
    /// Radius-center latitude (with `nearLng` + `radiusMiles`).
    pub near_lat: Option<f64>,
    /// Radius-center longitude (with `nearLat` + `radiusMiles`).
    pub near_lng: Option<f64>,
    /// Search radius in miles, `(0, 500]`.
    pub radius_miles: Option<f64>,
    /// Bounding box `minLng,minLat,maxLng,maxLat`.
    pub bbox: Option<String>,
    /// Offer intent filter.
    pub intent: Option<String>,
    /// Property type filter.
    pub property_type: Option<String>,
    /// Minimum monthly rent.
    pub min_rent: Option<f64>,
    /// Maximum monthly rent.
    pub max_rent: Option<f64>,
    /// Minimum bedrooms.
    pub min_bedrooms: Option<i32>,
    /// Maximum bedrooms.
    pub max_bedrooms: Option<i32>,
    /// Pet policy is not "No Pets".
    pub pets_allowed: Option<bool>,
    /// Furnished (per terms).
    pub furnished: Option<bool>,
    /// Sort key: `createdAt`/`updatedAt`/`availableDate`/`rent`/`distance`.
    pub sort_by: Option<String>,
    /// Sort order: `asc`/`desc`.
    pub sort_order: Option<String>,
}

impl ListingSearchParams {
    /// Validates geo + sort params and resolves them into a [`ListingFilter`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when the radius trio is partial, a
    /// coordinate/radius is out of range, `bbox` is malformed, `sortBy=distance`
    /// is requested without a radius center, or an unknown sort key is given.
    #[inline]
    pub fn into_validated(self, pagination: &Pagination) -> ApiResult<ListingFilter> {
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

        let has_center = self.near_lat.is_some() && self.near_lng.is_some();
        let sort = ListingSort::parse(self.sort_by.as_deref(), has_center)?;
        let sort_descending = match self.sort_order.as_deref() {
            Some("asc") => false,
            Some("desc") | None => true,
            Some(other) => {
                return Err(ApiError::BadRequest(format!(
                    "sortOrder must be 'asc' or 'desc', got '{other}'"
                )));
            }
        };

        Ok(ListingFilter {
            search: self.search.filter(|term| !term.trim().is_empty()),
            near_lat: self.near_lat,
            near_lng: self.near_lng,
            radius_miles: self.radius_miles,
            bbox_min_lng,
            bbox_min_lat,
            bbox_max_lng,
            bbox_max_lat,
            intent: self.intent,
            property_type: self.property_type,
            min_rent: self.min_rent,
            max_rent: self.max_rent,
            min_bedrooms: self.min_bedrooms,
            max_bedrooms: self.max_bedrooms,
            pets_allowed: self.pets_allowed,
            furnished: self.furnished,
            sort,
            sort_descending,
            limit: pagination.page_size(),
            offset: pagination.offset(),
        })
    }
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

/// Long-term rental terms - the only terms shape created/served at MVP.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RentLtrTerms {
    /// Monthly rent.
    pub rent_monthly: f64,
    /// Security deposit.
    pub security_deposit: f64,
    /// Offered lease terms (e.g. "1 Year", "Month-to-Month").
    pub lease_terms_offered: Vec<String>,
    /// Furnished.
    pub furnished: bool,
}

impl RentLtrTerms {
    /// Validates the terms and serializes them to a JSONB value.
    fn into_value(self) -> ApiResult<Value> {
        if !self.rent_monthly.is_finite() || self.rent_monthly <= 0.0 {
            return Err(ApiError::BadRequest(
                "terms.rentMonthly must be a positive number".to_owned(),
            ));
        }
        if !self.security_deposit.is_finite() || self.security_deposit < 0.0 {
            return Err(ApiError::BadRequest(
                "terms.securityDeposit must be a non-negative number".to_owned(),
            ));
        }
        if self.lease_terms_offered.is_empty() {
            return Err(ApiError::BadRequest(
                "terms.leaseTermsOffered must not be empty".to_owned(),
            ));
        }
        serde_json::to_value(self)
            .map_err(|_| ApiError::Internal("failed to serialize terms".to_owned()))
    }
}

/// Create-a-listing payload (always a `rent_ltr` draft at MVP).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateListingRequest {
    /// Physical property this offer is against.
    #[schema(value_type = Uuid)]
    pub property_id: Uuid,
    /// Listing title.
    pub title: String,
    /// Listing description.
    pub description: Option<String>,
    /// Amenities.
    pub amenities: Option<Vec<String>>,
    /// Utilities included.
    pub utilities_included: Option<Vec<String>>,
    /// Pet policy label.
    pub pet_policy: Option<String>,
    /// Available date (`YYYY-MM-DD`).
    pub available_date: Option<NaiveDate>,
    /// Surrounding POIs (JSON array).
    #[schema(value_type = Option<Object>)]
    pub surrounding_area: Option<Value>,
    /// Long-term rental terms.
    pub terms: RentLtrTerms,
}

impl CreateListingRequest {
    /// Validates and maps the payload into a [`NewListing`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] on empty title, over-long text, or
    /// invalid terms.
    #[inline]
    pub fn into_validated(self) -> ApiResult<NewListing> {
        let title = validate_title(&self.title)?;
        let description = validate_description(&self.description.unwrap_or_default())?;
        let terms = self.terms.into_value()?;
        Ok(NewListing {
            property_id: self.property_id,
            title,
            description,
            amenities: clean_list(self.amenities.unwrap_or_default()),
            utilities_included: clean_list(self.utilities_included.unwrap_or_default()),
            pet_policy: clean_optional(self.pet_policy),
            available_date: self.available_date,
            surrounding_area: self
                .surrounding_area
                .unwrap_or_else(|| Value::Array(Vec::new())),
            terms,
        })
    }
}

/// Partial listing update; absent fields are left unchanged.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateListingRequest {
    /// Listing title.
    pub title: Option<String>,
    /// Listing description.
    pub description: Option<String>,
    /// Amenities.
    pub amenities: Option<Vec<String>>,
    /// Utilities included.
    pub utilities_included: Option<Vec<String>>,
    /// Pet policy label.
    pub pet_policy: Option<String>,
    /// Available date (`YYYY-MM-DD`).
    pub available_date: Option<NaiveDate>,
    /// Surrounding POIs (JSON array).
    #[schema(value_type = Option<Object>)]
    pub surrounding_area: Option<Value>,
    /// Long-term rental terms.
    pub terms: Option<RentLtrTerms>,
}

impl UpdateListingRequest {
    /// Validates and maps the payload into a [`ListingPatch`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] on empty title, over-long text, or
    /// invalid terms.
    #[inline]
    pub fn into_patch(self) -> ApiResult<ListingPatch> {
        Ok(ListingPatch {
            title: self.title.as_deref().map(validate_title).transpose()?,
            description: self
                .description
                .as_deref()
                .map(validate_description)
                .transpose()?,
            amenities: self.amenities.map(clean_list),
            utilities_included: self.utilities_included.map(clean_list),
            pet_policy: self.pet_policy.map(|policy| policy.trim().to_owned()),
            available_date: self.available_date,
            surrounding_area: self.surrounding_area,
            terms: self.terms.map(RentLtrTerms::into_value).transpose()?,
        })
    }
}

/// Target-state payload for `PUT /listings/{id}/state`.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStateRequest {
    /// Desired lifecycle state. Only forward transitions are accepted;
    /// `withdrawn`/`expired` are driven by `DELETE` and the expiry worker.
    pub state: ListingState,
}

/// Result of recording a tenant view (`POST /listings/{id}/view`).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ViewResponse {
    /// Unique-tenant view count after this request.
    pub views: i32,
    /// Whether this request counted as a new view (`false` if already viewed).
    pub counted: bool,
}

/// Listing performance snapshot (`GET /listings/{id}/statistics`).
///
/// Lease-derived metrics are scoped to the listing's physical `property`;
/// `occupancyRate` is the lister's portfolio occupancy via the shared formula.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListingStatistics {
    /// Unique-tenant views of this listing.
    pub total_views: i64,
    /// Rental applications received. The applications domain is not part of
    /// this surface yet, so this is reported as `0`.
    pub total_applications: i64,
    /// Active leases on the listing's property.
    pub active_leases: i64,
    /// Monthly revenue from those active leases.
    pub monthly_revenue: f64,
    /// Lister portfolio occupancy rate (active-leased / total properties * 100).
    pub occupancy_rate: f64,
}

/// Historical-activity summary (`GET /listings/{id}/historical-data`).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListingHistoricalData {
    /// All leases ever recorded on the listing's property.
    pub total_leases: i64,
    /// All unique-tenant views of this listing.
    pub total_views: i64,
    /// Whether any historical activity exists at all.
    pub has_historical_data: bool,
}

/// Trims a title, rejecting empty / over-long values.
fn validate_title(raw: &str) -> ApiResult<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest("title cannot be empty".to_owned()));
    }
    if trimmed.chars().count() > 200 {
        return Err(ApiError::BadRequest(
            "title must be at most 200 characters".to_owned(),
        ));
    }
    Ok(trimmed.to_owned())
}

/// Trims a description, rejecting over-long values.
fn validate_description(raw: &str) -> ApiResult<String> {
    let trimmed = raw.trim();
    if trimmed.chars().count() > 4000 {
        return Err(ApiError::BadRequest(
            "description must be at most 4000 characters".to_owned(),
        ));
    }
    Ok(trimmed.to_owned())
}

/// Trims list items, dropping blanks.
fn clean_list(items: Vec<String>) -> Vec<String> {
    items
        .into_iter()
        .filter_map(|item| {
            let trimmed = item.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_owned())
            }
        })
        .collect()
}

/// Trims an optional string; blank collapses to `None`.
fn clean_optional(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_owned())
        .filter(|trimmed| !trimmed.is_empty())
}
