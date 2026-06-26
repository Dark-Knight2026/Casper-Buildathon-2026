//! HTTP request handlers for viewing endpoints.

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
        auth::{LandlordRole, RoleUser, TenantRole},
        listings::db as listings_db,
        viewings::{
            db::{self, BookOutcome, ReviewOutcome},
            models::{BookViewingRequest, UpdateViewingStatusRequest, Viewing},
        },
    },
};

// `POST /api/v1/listings/{id}/viewings`
//
/// Books an in-person viewing against an active listing. The reviewing landlord
/// is denormalized from the listing.
///
/// # Errors
///
/// Returns `400` on invalid input, `404` when no active listing has that id, or
/// a database error.
#[utoipa::path(
    post,
    path = "/listings/{id}/viewings",
    tag = "Viewings",
    request_body = BookViewingRequest,
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 201, description = "Viewing booked", body = Viewing),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn book_viewing(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path(listing_id): Path<Uuid>,
    Json(payload): Json<BookViewingRequest>,
) -> ApiResult<(StatusCode, Json<Viewing>)> {
    let new_viewing = payload.into_validated()?;
    match db::book_viewing(&state.db, listing_id, user.0.sub, new_viewing).await? {
        BookOutcome::Created(row) => Ok((StatusCode::CREATED, Json(Viewing::assemble(*row, None)))),
        BookOutcome::ListingUnavailable => Err(ApiError::NotFound("listing not found".to_owned())),
    }
}

// `GET /api/v1/viewings`
//
/// The caller's own bookings (newest first), paginated. Each entry nests the
/// listing it targets (null if that listing has since been withdrawn).
///
/// # Errors
///
/// Returns a database error on failure.
#[utoipa::path(
    get,
    path = "/viewings",
    tag = "Viewings",
    params(Pagination),
    responses(
        (status = 200, description = "The tenant's viewings (paginated)", body = PaginatedResponse<Viewing>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_my_viewings(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Viewing>>> {
    let (viewings, total) = db::list_my_viewings(
        &state.db,
        user.0.sub,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    Ok(Json(PaginatedResponse::new(viewings, total, &pagination)))
}

// `GET /api/v1/listings/{id}/viewings`
//
/// The bookings made against a listing the caller owns (newest first),
/// paginated.
///
/// # Errors
///
/// Returns `403` when the caller is not the lister, `404` when the listing does
/// not exist, or a database error.
#[utoipa::path(
    get,
    path = "/listings/{id}/viewings",
    tag = "Viewings",
    params(
        ("id" = Uuid, Path, description = "Listing id"),
        Pagination,
    ),
    responses(
        (status = 200, description = "Bookings for the listing (paginated)", body = PaginatedResponse<Viewing>),
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
pub async fn list_listing_viewings(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Viewing>>> {
    listings_db::assert_listing_owner(&state.db, listing_id, user.0.sub).await?;
    let (viewings, total) = db::list_listing_viewings(
        &state.db,
        listing_id,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    Ok(Json(PaginatedResponse::new(viewings, total, &pagination)))
}

// `DELETE /api/v1/listings/{id}/viewings/{viewingId}`
//
/// Cancels the caller's own booking (hard delete). Scoped by the caller's user
/// id, so it can only ever touch the caller's own booking.
///
/// # Errors
///
/// Returns `404` when the caller has no such booking under that listing, or a
/// database error.
#[utoipa::path(
    delete,
    path = "/listings/{id}/viewings/{viewingId}",
    tag = "Viewings",
    params(
        ("id" = Uuid, Path, description = "Listing id"),
        ("viewingId" = Uuid, Path, description = "Viewing id")
    ),
    responses(
        (status = 204, description = "Viewing cancelled"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 404, description = "Viewing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn cancel_viewing(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path((listing_id, viewing_id)): Path<(Uuid, Uuid)>,
) -> ApiResult<StatusCode> {
    if db::cancel_viewing(&state.db, listing_id, viewing_id, user.0.sub).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(ApiError::NotFound("viewing not found".to_owned()))
    }
}

// `PUT /api/v1/listings/{id}/viewings/{viewingId}`
//
/// Confirms or rejects a booking on a listing the caller owns, moving it from
/// `pending` to `confirmed` or `cancelled`.
///
/// # Errors
///
/// Returns `400` when the target status is not a decision, `403` when the
/// caller is not the lister, `404` when the listing or booking does not exist,
/// `409` when the booking is not `pending`, or a database error.
#[utoipa::path(
    put,
    path = "/listings/{id}/viewings/{viewingId}",
    tag = "Viewings",
    request_body = UpdateViewingStatusRequest,
    params(
        ("id" = Uuid, Path, description = "Listing id"),
        ("viewingId" = Uuid, Path, description = "Viewing id")
    ),
    responses(
        (status = 200, description = "Reviewed viewing", body = Viewing),
        (status = 400, description = "Invalid target status", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lister", body = ErrorResponse),
        (status = 404, description = "Listing or viewing not found", body = ErrorResponse),
        (status = 409, description = "Viewing is not pending", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn update_viewing_status(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path((listing_id, viewing_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateViewingStatusRequest>,
) -> ApiResult<Json<Viewing>> {
    let status = payload.into_validated()?;
    listings_db::assert_listing_owner(&state.db, listing_id, user.0.sub).await?;
    match db::update_viewing_status(&state.db, listing_id, viewing_id, status).await? {
        ReviewOutcome::Updated(row) => Ok(Json(Viewing::assemble(*row, None))),
        ReviewOutcome::NotFound => Err(ApiError::NotFound("viewing not found".to_owned())),
        ReviewOutcome::NotPending => Err(ApiError::Conflict("viewing is not pending".to_owned())),
    }
}
