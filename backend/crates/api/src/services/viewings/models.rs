//! Request/response models for the viewing endpoints.
//!
//! `status` is a fixed-set TEXT column mapped to a `strum` enum at the model
//! boundary (the `ListingState`/`ApplicationStatus` pattern). `viewingTime`
//! stays a string (`'14:00'`) to match the wire contract.

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult},
    services::{
        listings::models::Listing,
        viewings::db::{NewViewing, ViewingRow},
    },
};

/// Lifecycle status of a viewing booking. Stored as TEXT (CHECK) in the DB;
/// parsed into this enum at the model boundary.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ViewingStatus {
    /// Awaiting landlord confirmation.
    Pending,
    /// Confirmed by the landlord.
    Confirmed,
    /// Cancelled (by the landlord's decision).
    Cancelled,
}

/// A viewing booking as returned on the wire.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Viewing {
    /// Viewing id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Listing this booking targets.
    #[schema(value_type = Uuid)]
    pub listing_id: Uuid,
    /// Booking tenant user id.
    #[schema(value_type = Uuid)]
    pub user_id: Uuid,
    /// Reviewing landlord user id.
    #[schema(value_type = Uuid)]
    pub landlord_id: Uuid,
    /// Requested viewing date (`YYYY-MM-DD`).
    pub viewing_date: NaiveDate,
    /// Requested viewing time (free-form string, e.g. "14:00").
    pub viewing_time: String,
    /// Booking status.
    pub status: ViewingStatus,
    /// The listing this booking targets; nested in `GET /viewings`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub listing: Option<Listing>,
    /// Booking timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl Viewing {
    /// Assembles the wire shape from a row plus an optional nested listing.
    #[inline]
    #[must_use]
    pub fn assemble(row: ViewingRow, listing: Option<Listing>) -> Self {
        Self {
            id: row.id,
            listing_id: row.listing_id,
            user_id: row.user_id,
            landlord_id: row.landlord_id,
            viewing_date: row.viewing_date,
            viewing_time: row.viewing_time,
            status: ViewingStatus::from_str(&row.status).unwrap_or(ViewingStatus::Pending),
            listing,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Book-a-viewing payload (`POST /listings/{id}/viewings`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BookViewingRequest {
    /// Requested viewing date (`YYYY-MM-DD`).
    pub viewing_date: NaiveDate,
    /// Requested viewing time (e.g. "14:00").
    pub viewing_time: String,
}

impl BookViewingRequest {
    /// Validates the payload and maps it into a [`NewViewing`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when `viewingTime` is blank.
    #[inline]
    pub fn into_validated(self) -> ApiResult<NewViewing> {
        let viewing_time = self.viewing_time.trim();
        if viewing_time.is_empty() {
            return Err(ApiError::BadRequest(
                "viewingTime cannot be empty".to_owned(),
            ));
        }
        Ok(NewViewing {
            viewing_date: self.viewing_date,
            viewing_time: viewing_time.to_owned(),
        })
    }
}

/// Confirm/reject payload (`PUT /listings/{id}/viewings/{viewingId}`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateViewingStatusRequest {
    /// Decision: `confirmed` or `cancelled` (`pending` is not a valid target).
    pub status: ViewingStatus,
}

impl UpdateViewingStatusRequest {
    /// Validates that the requested status is a terminal review decision.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when the target is `pending` (a review
    /// can only confirm or cancel).
    #[inline]
    pub fn into_validated(self) -> ApiResult<ViewingStatus> {
        if self.status == ViewingStatus::Pending {
            return Err(ApiError::BadRequest(
                "status must be 'confirmed' or 'cancelled'".to_owned(),
            ));
        }
        Ok(self.status)
    }
}
