//! Request/response models for the favorites endpoints.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::services::listings::models::Listing;

/// Payload for `POST /favorites`: the listing the tenant wants to save.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AddFavoriteRequest {
    /// Listing to save.
    #[schema(value_type = Uuid)]
    pub listing_id: Uuid,
}

/// A saved listing with the full listing it targets.
///
/// The favorite itself carries only the timestamp; the offer it points to is
/// nested whole (the listing in turn nests its physical property and approved
/// media), per the ADR-007 two-entity contract.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteResponse {
    /// Saved listing id (also the `listing.id`).
    #[schema(value_type = Uuid)]
    pub listing_id: Uuid,
    /// When the tenant saved it.
    pub favorited_at: DateTime<Utc>,
    /// The saved listing, with its nested property and approved media.
    pub listing: Listing,
}
