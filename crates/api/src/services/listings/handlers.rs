//! HTTP request handlers for listing endpoints (public read surface).

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination},
    services::{
        auth::{LandlordRole, RoleUser},
        listings::{
            db::{self, ListingUpdate},
            models::{
                CreateListingRequest, Listing, ListingSearchParams, MediaRef,
                UpdateListingRequest,
            },
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

// `POST /api/v1/listings`
//
/// Creates a `draft` listing (always `rent_ltr` at MVP) owned by the caller.
///
/// # Errors
///
/// Returns `400` on invalid input, `404` when the referenced property does not
/// exist, or a database error.
#[utoipa::path(
    post,
    path = "/listings",
    tag = "Listings",
    request_body = CreateListingRequest,
    responses(
        (status = 201, description = "Draft listing created", body = Listing),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Property not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn create_listing(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Json(payload): Json<CreateListingRequest>,
) -> ApiResult<(StatusCode, Json<Listing>)> {
    let new_listing = payload.into_validated()?;
    // Referenced property must exist; RowNotFound maps to 404 via `?`.
    let property = properties_db::fetch_property(&state.db, new_listing.property_id).await?;
    let row = db::create_listing(&state.db, user.0.sub, new_listing).await?;
    let listing = Listing::assemble(row, Some(Property::from(property)), Vec::new());
    Ok((StatusCode::CREATED, Json(listing)))
}

// `PUT /api/v1/listings/{id}`
//
/// Partial update of a listing the caller owns. Re-runs the Fair Housing text
/// screen on changed text (gate wiring lands in a later commit).
///
/// # Errors
///
/// Returns `400` on invalid input, `403` when the caller is not the lister,
/// `404` when the listing does not exist, or a database error.
#[utoipa::path(
    put,
    path = "/listings/{id}",
    tag = "Listings",
    request_body = UpdateListingRequest,
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Updated listing", body = Listing),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lister", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn update_listing(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
    Json(payload): Json<UpdateListingRequest>,
) -> ApiResult<Json<Listing>> {
    let patch = payload.into_patch()?;
    let row = match db::update_listing(&state.db, listing_id, user.0.sub, patch).await? {
        ListingUpdate::Updated(row) => *row,
        ListingUpdate::NotFound => {
            return Err(ApiError::NotFound("listing not found".to_owned()));
        }
        ListingUpdate::Forbidden => {
            return Err(ApiError::Forbidden("not_listing_owner".to_owned()));
        }
    };
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

// `GET /api/v1/landlord/listings`
//
/// The caller's own listings (any state), paginated.
///
/// # Errors
///
/// Returns a database error on failure.
#[utoipa::path(
    get,
    path = "/landlord/listings",
    tag = "Listings",
    params(Pagination),
    responses(
        (status = 200, description = "The landlord's listings (paginated)", body = PaginatedResponse<Listing>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_landlord_listings(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Listing>>> {
    let (listings, total) =
        db::list_landlord_listings(&state.db, user.0.sub, pagination.page_size(), pagination.offset())
            .await?;
    Ok(Json(PaginatedResponse::new(listings, total, &pagination)))
}
