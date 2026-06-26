//! Off-chain property metadata pinned to IPFS for on-chain registration.
//!
//! Build a [`PropertyMetadata`] from a stored row, serialize it, and pin it via
//! the [`ContentPinner`](crate::providers::ContentPinner) to obtain the
//! `ipfs://{cid}` pointer the registration contract takes as its `metadataUri`
//! argument. Deliberately carries only the physical-asset descriptors - no id,
//! no timestamps - so the CID is content-addressed by the property's real-world
//! identity rather than by our surrogate key.

use serde::Serialize;

use crate::{
    common::{ApiError, ApiResult},
    providers::ContentPinner,
    services::properties::db::PropertyRow,
};

/// The pinned-metadata document for a property.
///
/// RESO-aligned camelCase wire shape, mirroring the public
/// [`Property`](super::models::Property) field names so on-chain and API
/// consumers read the same vocabulary.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PropertyMetadata {
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
    /// Property type (legacy `snake_case` value, as stored).
    pub property_type: String,
    /// Latitude.
    pub latitude: Option<f64>,
    /// Longitude.
    pub longitude: Option<f64>,
    /// Bedroom count (RESO `BedroomsTotal`).
    pub bedrooms_total: Option<i32>,
    /// Bathroom count (RESO `BathroomsTotal`).
    pub bathrooms_total: Option<f64>,
    /// Living area in sqft (RESO `LivingArea`).
    pub living_area: Option<i32>,
    /// Year built.
    pub year_built: Option<i32>,
    /// RESO parking features.
    pub parking_features: Vec<String>,
    /// County parcel / APN.
    pub parcel_apn: Option<String>,
}

impl From<&PropertyRow> for PropertyMetadata {
    #[inline]
    fn from(row: &PropertyRow) -> Self {
        Self {
            address_line1: row.address_line1.clone(),
            address_line2: row.address_line2.clone(),
            city: row.city.clone(),
            state_or_province: row.state.clone(),
            postal_code: row.zip_code.clone(),
            property_type: row.property_type.clone(),
            latitude: row.latitude,
            longitude: row.longitude,
            bedrooms_total: row.bedrooms,
            bathrooms_total: row.bathrooms,
            living_area: row.square_feet,
            year_built: row.year_built,
            parking_features: row.parking_features.clone().unwrap_or_default(),
            parcel_apn: row.parcel_id.clone(),
        }
    }
}

/// Pins a property's metadata document and returns its `ipfs://{cid}` pointer.
///
/// Called by create and update after the row is persisted, so the pinned
/// content reflects exactly what is stored. The CID is deterministic in the
/// descriptors, so re-pinning an unchanged property is idempotent.
///
/// # Errors
///
/// Returns [`ApiError::Internal`] when the metadata cannot be serialized or the
/// pinner backend fails.
#[inline]
pub async fn pin_property_metadata(
    pinner: &dyn ContentPinner,
    row: &PropertyRow,
) -> ApiResult<String> {
    let metadata = PropertyMetadata::from(row);
    let bytes = serde_json::to_vec(&metadata).map_err(|err| {
        tracing::error!(?err, "property metadata serialization failed");
        ApiError::Internal("failed to serialize property metadata".to_owned())
    })?;
    let cid = pinner.pin(&bytes).await.map_err(|err| {
        tracing::error!(?err, "property metadata pin failed");
        ApiError::Internal("failed to pin property metadata".to_owned())
    })?;
    Ok(format!("ipfs://{cid}"))
}
