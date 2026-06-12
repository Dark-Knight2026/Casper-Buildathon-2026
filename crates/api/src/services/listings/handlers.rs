//! HTTP request handlers for listing endpoints (public read surface).

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
};
use uuid::Uuid;

use crate::{
    common::{ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination},
    services::{
        listings::{
            db,
            models::{Listing, ListingSearchParams, MediaRef},
        },
        properties::{db as properties_db, models::Property},
    },
};

// `GET /api/v1/listings`
//
/// Public search over active listings (filters + geo + pagination).
///
/// Active state only; whitelisted sort (incl. `distance` when a radius center
/// is given). No protected-class filters. Each result nests its property and
/// approved media.
///
/// # Errors
///
/// Returns `400` on invalid filter/sort params, or a database error.
#[utoipa::path(
    get,
    path = "/listings",
    tag = "Listings",
    params(ListingSearchParams, Pagination),
    responses(
        (status = 200, description = "Active listings (paginated)", body = PaginatedResponse<Listing>),
        (status = 400, description = "Invalid search parameters", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    )
)]
#[inline]
pub async fn list_listings(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListingSearchParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Listing>>> {
    let filter = params.into_validated(&pagination)?;
    let (listings, total) = db::list_active_listings(&state.db, &filter).await?;
    Ok(Json(PaginatedResponse::new(listings, total, &pagination)))
}

// `GET /api/v1/listings/{id}`
//
/// Listing detail: the offer, its nested physical property, approved media,
/// and derived provenance. Public; `onChain` is always null in the hackathon.
///
/// # Errors
///
/// Returns `404` when no live listing has that id, or a database error.
#[utoipa::path(
    get,
    path = "/listings/{id}",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Listing detail", body = Listing),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    )
)]
#[inline]
pub async fn get_listing(
    State(state): State<Arc<AppState>>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<Json<Listing>> {
    let row = db::fetch_listing(&state.db, listing_id).await?;
    let property = properties_db::fetch_property(&state.db, row.property_id)
        .await
        .ok()
        .map(Property::from);
    let media = db::fetch_listing_media(&state.db, listing_id)
        .await?
        .into_iter()
        .map(MediaRef::from)
        .collect();
    Ok(Json(Listing::assemble(row, property, media)))
}
