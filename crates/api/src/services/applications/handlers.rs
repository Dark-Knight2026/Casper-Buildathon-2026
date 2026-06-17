//! HTTP request handlers for rental-application endpoints.

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
        applications::{
            db::{self, ReviewOutcome, SubmitOutcome},
            models::{
                LandlordApplicationParams, RentalApplication, ReviewApplicationRequest,
                SubmitApplicationRequest,
            },
        },
        auth::{AuthUser, LandlordRole, RoleUser, TenantRole},
        listings::db as listings_db,
    },
};

// `POST /api/v1/listings/{id}/applications`
//
/// Submits a rental application against an active listing. The reviewing
/// landlord is denormalized from the listing, so a later review needs no join
/// back to it.
///
/// # Errors
///
/// Returns `400` on invalid input, `404` when no active listing has that id, or
/// a database error.
#[utoipa::path(
    post,
    path = "/listings/{id}/applications",
    tag = "Applications",
    request_body = SubmitApplicationRequest,
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 201, description = "Application submitted", body = RentalApplication),
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
pub async fn submit_application(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path(listing_id): Path<Uuid>,
    Json(payload): Json<SubmitApplicationRequest>,
) -> ApiResult<(StatusCode, Json<RentalApplication>)> {
    let new_application = payload.try_into()?;
    match db::submit_application(&state.db, listing_id, user.0.sub, new_application).await? {
        SubmitOutcome::Created(row) => Ok((
            StatusCode::CREATED,
            Json(RentalApplication::assemble(*row, None)),
        )),
        SubmitOutcome::ListingUnavailable => {
            Err(ApiError::NotFound("listing not found".to_owned()))
        }
    }
}

// `GET /api/v1/applications`
//
/// The caller's own applications (newest first), paginated. Each entry nests
/// the listing it targets (null if that listing has since been withdrawn).
///
/// # Errors
///
/// Returns a database error on failure.
#[utoipa::path(
    get,
    path = "/applications",
    tag = "Applications",
    params(Pagination),
    responses(
        (status = 200, description = "The tenant's applications (paginated)", body = PaginatedResponse<RentalApplication>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_my_applications(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<RentalApplication>>> {
    let (applications, total) = db::list_my_applications(
        &state.db,
        user.0.sub,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    Ok(Json(PaginatedResponse::new(
        applications,
        total,
        &pagination,
    )))
}

// `GET /api/v1/listings/{id}/applications`
//
/// The applications submitted against a listing the caller owns (newest first),
/// paginated.
///
/// # Errors
///
/// Returns `403` when the caller is not the lister, `404` when the listing does
/// not exist, or a database error.
#[utoipa::path(
    get,
    path = "/listings/{id}/applications",
    tag = "Applications",
    params(
        ("id" = Uuid, Path, description = "Listing id"),
        Pagination,
    ),
    responses(
        (status = 200, description = "Applications for the listing (paginated)", body = PaginatedResponse<RentalApplication>),
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
pub async fn list_listing_applications(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<RentalApplication>>> {
    listings_db::assert_listing_owner(&state.db, listing_id, user.0.sub).await?;
    let (applications, total) = db::list_listing_applications(
        &state.db,
        listing_id,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    Ok(Json(PaginatedResponse::new(
        applications,
        total,
        &pagination,
    )))
}

// `GET /api/v1/applications/landlord`
//
/// Every application across the caller's listings (newest first), paginated,
/// with optional status / applicant-search / listing / submission-date filters.
/// Each entry nests its listing for cross-listing context.
///
/// # Errors
///
/// Returns `400` on an invalid date range, or a database error.
#[utoipa::path(
    get,
    path = "/applications/landlord",
    tag = "Applications",
    params(LandlordApplicationParams, Pagination),
    responses(
        (status = 200, description = "The landlord's applications (paginated)", body = PaginatedResponse<RentalApplication>),
        (status = 400, description = "Invalid filter", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_landlord_applications(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Query(params): Query<LandlordApplicationParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<RentalApplication>>> {
    let filter = params.into_validated(&pagination)?;
    let (applications, total) =
        db::list_landlord_applications(&state.db, user.0.sub, &filter).await?;
    Ok(Json(PaginatedResponse::new(
        applications,
        total,
        &pagination,
    )))
}

// `GET /api/v1/applications/{id}`
//
/// A single application by id, visible to either party to it - the applicant
/// (tenant) or the reviewing landlord - with its nested listing.
///
/// # Errors
///
/// Returns `404` when the caller is party to no application with that id, or a
/// database error.
#[utoipa::path(
    get,
    path = "/applications/{id}",
    tag = "Applications",
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 200, description = "The application", body = RentalApplication),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_application(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(application_id): Path<Uuid>,
) -> ApiResult<Json<RentalApplication>> {
    match db::fetch_application(&state.db, application_id, user.0.sub).await? {
        Some(application) => Ok(Json(application)),
        None => Err(ApiError::NotFound("application not found".to_owned())),
    }
}

// `PUT /api/v1/applications/{id}/status`
//
/// Reviews an application the caller is the landlord of, advancing it along the
/// review lifecycle (`pending`/`under_review`/`conditional` ->
/// `under_review`/`conditional`/`approved`/`rejected`).
///
/// # Errors
///
/// Returns `400` when the target is not a review status, `404` when the caller
/// reviews no application with that id, `409` when the target is unreachable
/// from the current status, or a database error.
#[utoipa::path(
    put,
    path = "/applications/{id}/status",
    tag = "Applications",
    request_body = ReviewApplicationRequest,
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 200, description = "Reviewed application", body = RentalApplication),
        (status = 400, description = "Invalid target status", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 409, description = "Status transition not allowed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn review_application(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(application_id): Path<Uuid>,
    Json(payload): Json<ReviewApplicationRequest>,
) -> ApiResult<Json<RentalApplication>> {
    let status = payload.try_into()?;
    match db::review_application(&state.db, application_id, user.0.sub, status).await? {
        ReviewOutcome::Updated(row) => Ok(Json(RentalApplication::assemble(*row, None))),
        ReviewOutcome::NotFound => Err(ApiError::NotFound("application not found".to_owned())),
        ReviewOutcome::InvalidTransition => Err(ApiError::Conflict(
            "status transition is not allowed".to_owned(),
        )),
    }
}
