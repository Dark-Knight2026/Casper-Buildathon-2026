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
    providers::CheckSubject,
    services::{
        applications::{
            db::{self, DraftOutcome, ReviewOutcome, SubmitOutcome},
            models::{
                AddNoteRequest, ApplicationNote, ApplicationScore, ApplicationStatus,
                BackgroundCheck, LandlordApplicationParams, RentalApplication,
                RequestBackgroundCheckRequest, ReviewApplicationRequest, SubmitApplicationRequest,
            },
            scoring,
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
    let status = if payload.as_draft {
        ApplicationStatus::Draft
    } else {
        ApplicationStatus::Pending
    };
    let new_application = payload.try_into()?;
    match db::submit_application(&state.db, listing_id, user.0.sub, new_application, status).await?
    {
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
    let application = db::fetch_application(&state.db, application_id, user.0.sub)
        .await?
        .ok_or_else(|| ApiError::NotFound("application not found".to_owned()))?;
    let tenant_info = db::fetch_tenant_info(&state.db, application.user_id).await?;
    Ok(Json(application.with_tenant(tenant_info)))
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

// `POST /api/v1/applications/{id}/notes`
//
/// Adds a private landlord note to an application the caller reviews. The note
/// is never shown to the applicant.
///
/// # Errors
///
/// Returns `400` on a blank body, `404` when the caller is the landlord of no
/// application with that id, or a database error.
#[utoipa::path(
    post,
    path = "/applications/{id}/notes",
    tag = "Applications",
    request_body = AddNoteRequest,
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 201, description = "Note added", body = ApplicationNote),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn add_application_note(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(application_id): Path<Uuid>,
    Json(payload): Json<AddNoteRequest>,
) -> ApiResult<(StatusCode, Json<ApplicationNote>)> {
    let body = String::try_from(payload)?;
    match db::add_application_note(&state.db, application_id, user.0.sub, body).await? {
        Some(row) => Ok((StatusCode::CREATED, Json(ApplicationNote::from(row)))),
        None => Err(ApiError::NotFound("application not found".to_owned())),
    }
}

// `GET /api/v1/applications/{id}/notes`
//
/// Lists the private landlord notes on an application the caller reviews (newest
/// first).
///
/// # Errors
///
/// Returns `404` when the caller is the landlord of no application with that id,
/// or a database error.
#[utoipa::path(
    get,
    path = "/applications/{id}/notes",
    tag = "Applications",
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 200, description = "The application's notes", body = Vec<ApplicationNote>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_application_notes(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(application_id): Path<Uuid>,
) -> ApiResult<Json<Vec<ApplicationNote>>> {
    match db::list_application_notes(&state.db, application_id, user.0.sub).await? {
        Some(rows) => Ok(Json(rows.into_iter().map(ApplicationNote::from).collect())),
        None => Err(ApiError::NotFound("application not found".to_owned())),
    }
}

// `POST /api/v1/applications/{id}/background-checks`
//
/// Requests a background check on an application the caller reviews. Requires
/// the applicant to have consented; the configured provider runs the check and
/// its outcome is recorded.
///
/// # Errors
///
/// Returns `400` when the applicant has not consented, `404` when the caller is
/// the landlord of no application with that id, `500` on a provider failure, or
/// a database error.
#[utoipa::path(
    post,
    path = "/applications/{id}/background-checks",
    tag = "Applications",
    request_body = RequestBackgroundCheckRequest,
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 201, description = "Check requested", body = BackgroundCheck),
        (status = 400, description = "Applicant has not consented", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn request_background_check(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(application_id): Path<Uuid>,
    Json(payload): Json<RequestBackgroundCheckRequest>,
) -> ApiResult<(StatusCode, Json<BackgroundCheck>)> {
    let Some(subject) =
        db::fetch_application_subject(&state.db, application_id, user.0.sub).await?
    else {
        return Err(ApiError::NotFound("application not found".to_owned()));
    };
    if !subject.consent {
        return Err(ApiError::BadRequest(
            "applicant has not consented to a background check".to_owned(),
        ));
    }

    let check_subject = CheckSubject {
        full_name: subject.full_name,
        date_of_birth: subject.date_of_birth,
    };
    let outcome = state
        .background_check
        .run_check(payload.check_type, &check_subject)
        .await
        .map_err(|err| {
            tracing::error!(?err, "background check failed");
            ApiError::Internal("background check failed".to_owned())
        })?;

    let row = db::insert_background_check(
        &state.db,
        application_id,
        user.0.sub,
        payload.check_type,
        outcome.status,
        outcome.result,
        outcome.reference,
    )
    .await?;
    Ok((StatusCode::CREATED, Json(BackgroundCheck::from(row))))
}

// `GET /api/v1/applications/{id}/background-checks`
//
/// Lists the background checks on an application the caller reviews (newest
/// first).
///
/// # Errors
///
/// Returns `404` when the caller is the landlord of no application with that id,
/// or a database error.
#[utoipa::path(
    get,
    path = "/applications/{id}/background-checks",
    tag = "Applications",
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 200, description = "The application's background checks", body = Vec<BackgroundCheck>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_background_checks(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(application_id): Path<Uuid>,
) -> ApiResult<Json<Vec<BackgroundCheck>>> {
    match db::list_background_checks(&state.db, application_id, user.0.sub).await? {
        Some(rows) => Ok(Json(rows.into_iter().map(BackgroundCheck::from).collect())),
        None => Err(ApiError::NotFound("application not found".to_owned())),
    }
}

// `GET /api/v1/applications/{id}/score`
//
/// The computed applicant score for an application the caller reviews, with its
/// weighted breakdown. Recomputed on each read from current data and check
/// results, never stored.
///
/// # Errors
///
/// Returns `404` when the caller is the landlord of no application with that id,
/// or a database error.
#[utoipa::path(
    get,
    path = "/applications/{id}/score",
    tag = "Applications",
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 200, description = "The application's score", body = ApplicationScore),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_application_score(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(application_id): Path<Uuid>,
) -> ApiResult<Json<ApplicationScore>> {
    match db::fetch_score_inputs(&state.db, application_id, user.0.sub).await? {
        Some(inputs) => Ok(Json(scoring::compute(&inputs))),
        None => Err(ApiError::NotFound("application not found".to_owned())),
    }
}

// `PATCH /api/v1/applications/{id}`
//
/// Replaces a draft application's fields. Only the applicant may edit it, and
/// only while it is a `draft`.
///
/// # Errors
///
/// Returns `400` on invalid input, `404` when the caller owns no application
/// with that id, `409` when it is not a draft, or a database error.
#[utoipa::path(
    patch,
    path = "/applications/{id}",
    tag = "Applications",
    request_body = SubmitApplicationRequest,
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 200, description = "Updated draft", body = RentalApplication),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 409, description = "Application is not a draft", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn update_application(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path(application_id): Path<Uuid>,
    Json(payload): Json<SubmitApplicationRequest>,
) -> ApiResult<Json<RentalApplication>> {
    let new_application = payload.try_into()?;
    match db::update_draft(&state.db, application_id, user.0.sub, new_application).await? {
        DraftOutcome::Updated(row) => Ok(Json(RentalApplication::assemble(*row, None))),
        DraftOutcome::NotFound => Err(ApiError::NotFound("application not found".to_owned())),
        DraftOutcome::NotDraft => Err(ApiError::Conflict("application is not a draft".to_owned())),
    }
}

// `POST /api/v1/applications/{id}/submit`
//
/// Submits a draft application, moving it from `draft` to `pending`. Only the
/// applicant may submit it, and only a `draft`.
///
/// # Errors
///
/// Returns `404` when the caller owns no application with that id, `409` when it
/// is not a draft, or a database error.
#[utoipa::path(
    post,
    path = "/applications/{id}/submit",
    tag = "Applications",
    params(
        ("id" = Uuid, Path, description = "Application id")
    ),
    responses(
        (status = 200, description = "Submitted application", body = RentalApplication),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Tenant role required", body = ErrorResponse),
        (status = 404, description = "Application not found", body = ErrorResponse),
        (status = 409, description = "Application is not a draft", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn submit_draft_application(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path(application_id): Path<Uuid>,
) -> ApiResult<Json<RentalApplication>> {
    match db::submit_draft(&state.db, application_id, user.0.sub).await? {
        DraftOutcome::Updated(row) => Ok(Json(RentalApplication::assemble(*row, None))),
        DraftOutcome::NotFound => Err(ApiError::NotFound("application not found".to_owned())),
        DraftOutcome::NotDraft => Err(ApiError::Conflict("application is not a draft".to_owned())),
    }
}
