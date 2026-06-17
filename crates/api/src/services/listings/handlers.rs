//! HTTP request handlers for listing endpoints (public read surface).

use core::str::FromStr;
use std::sync::Arc;

use axum::{
    Json,
    extract::{Multipart, Path, Query, State, multipart::MultipartError},
    http::StatusCode,
};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination, image},
    providers::ScreenOutcome,
    services::{
        auth::{AgentRole, LandlordRole, RoleUser, TenantRole},
        listings::{
            db::{
                self, AuthorityUpload, ListingPatch, ListingRow, ListingUpdate, NewListing,
                StateTransition, WithdrawOutcome,
            },
            models::{
                AuthorityDocumentResponse, AuthorityDocumentType, CreateListingRequest,
                FairHousingScreenResponse, LandlordListingParams, Listing, ListingHistoricalData,
                ListingProvenance, ListingSearchParams, ListingState, ListingStatistics,
                MediaModerationRequest, MediaRef, MediaReorderRequest, UpdateListingRequest,
                UpdateStateRequest, ViewResponse,
            },
        },
        properties::{db as properties_db, models::Property},
    },
};

/// Screens a listing's title + description through the bound Fair Housing
/// screen, mapping a backend failure to a 500.
async fn screen_listing_text(
    state: &AppState,
    title: &str,
    description: &str,
) -> ApiResult<ScreenOutcome> {
    state
        .fair_housing
        .screen(&format!("{title}\n{description}"))
        .await
        .map_err(|err| {
            tracing::error!(?err, "fair housing screen failed");
            ApiError::Internal("fair housing screen failed".to_owned())
        })
}

/// Maximum accepted authority-document payload size (10 MB). Legal documents
/// (deed/title/management agreement) run larger than avatars, so this ceiling
/// is double the avatar limit.
const MAX_DOCUMENT_BYTES: usize = 10 * 1024 * 1024;

/// Multipart field carrying the document bytes.
const DOCUMENT_FILE_FIELD: &str = "file";
/// Multipart field carrying the document type.
const DOCUMENT_TYPE_FIELD: &str = "documentType";

/// Detected authority-document format: canonical MIME plus storage extension.
#[derive(Debug, Clone, Copy)]
struct DocumentKind {
    /// Canonical IANA MIME type.
    mime: &'static str,
    /// Storage-key extension (no leading dot).
    ext: &'static str,
}

impl DocumentKind {
    const PDF: Self = Self {
        mime: "application/pdf",
        ext: "pdf",
    };
    const PNG: Self = Self {
        mime: "image/png",
        ext: "png",
    };
    const JPEG: Self = Self {
        mime: "image/jpeg",
        ext: "jpg",
    };
}

/// Sniffs the leading bytes and returns the detected document kind, or `None`
/// for anything off the whitelist (PDF / PNG / JPEG). Blocks MIME-spoofing the
/// same way the avatar sniff does: a header alone is never trusted.
fn sniff_document_kind(payload: &[u8]) -> Option<DocumentKind> {
    const PDF_MAGIC: [u8; 4] = [0x25, 0x50, 0x44, 0x46]; // %PDF
    const PNG_MAGIC: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const JPEG_MAGIC: [u8; 3] = [0xFF, 0xD8, 0xFF];

    if payload.len() >= PDF_MAGIC.len() && payload[..PDF_MAGIC.len()] == PDF_MAGIC {
        return Some(DocumentKind::PDF);
    }
    if payload.len() >= PNG_MAGIC.len() && payload[..PNG_MAGIC.len()] == PNG_MAGIC {
        return Some(DocumentKind::PNG);
    }
    if payload.len() >= JPEG_MAGIC.len() && payload[..JPEG_MAGIC.len()] == JPEG_MAGIC {
        return Some(DocumentKind::JPEG);
    }
    None
}

/// Maps a multipart error into an API error preserving the size-vs-shape
/// distinction (413 for an oversize field, 400 for a parse failure).
fn document_multipart_err(err: &MultipartError) -> ApiError {
    if err.status() == StatusCode::PAYLOAD_TOO_LARGE {
        ApiError::PayloadTooLarge(format!(
            "Document payload exceeds {MAX_DOCUMENT_BYTES}-byte limit"
        ))
    } else {
        ApiError::BadRequest(format!("Failed to read upload: {err}"))
    }
}

/// Maximum accepted listing-media payload size (10 MB).
const MAX_MEDIA_BYTES: usize = 10 * 1024 * 1024;

/// Multipart field carrying the media bytes.
const MEDIA_FILE_FIELD: &str = "file";

/// Maps a media multipart error preserving the size-vs-shape distinction (413
/// for an oversize field, 400 for a parse failure).
fn media_multipart_err(err: &MultipartError) -> ApiError {
    if err.status() == StatusCode::PAYLOAD_TOO_LARGE {
        ApiError::PayloadTooLarge(format!(
            "Media payload exceeds {MAX_MEDIA_BYTES}-byte limit"
        ))
    } else {
        ApiError::BadRequest(format!("Failed to read upload: {err}"))
    }
}

/// Re-reads a listing's nested property and approved media and assembles the
/// public wire shape. Shared by every handler that returns a single listing.
async fn assemble_listing(state: &AppState, row: ListingRow) -> ApiResult<Listing> {
    let property = properties_db::fetch_property(&state.db, row.property_id)
        .await
        .ok()
        .map(Property::from);
    let media = db::fetch_listing_media(&state.db, row.id)
        .await?
        .into_iter()
        .map(MediaRef::from)
        .collect();
    Ok(Listing::assemble(row, property, media))
}

/// Maps a [`StateTransition`] outcome to its row or the matching API error.
fn transition_or_error(outcome: StateTransition) -> ApiResult<ListingRow> {
    match outcome {
        StateTransition::Updated(row) => Ok(*row),
        StateTransition::NotFound => Err(ApiError::NotFound("listing not found".to_owned())),
        StateTransition::Forbidden => Err(ApiError::Forbidden("not_listing_owner".to_owned())),
        StateTransition::Illegal { from, to } => Err(ApiError::Conflict(format!(
            "cannot transition listing from {from} to {to}"
        ))),
        StateTransition::GateFailed(gate) => Err(ApiError::Conflict(format!(
            "cannot activate listing: {} gate not satisfied",
            gate.label()
        ))),
    }
}

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
    if let Some(amenities) = &filter.amenities {
        // Fair-housing gate: an amenity filter must not smuggle protected-class
        // proxies (e.g. `no children`). The listing text screen is the single
        // source of truth for prohibited language, so reuse it here.
        let outcome = screen_listing_text(&state, &amenities.join(" "), "").await?;
        if !outcome.cleared {
            return Err(ApiError::BadRequest(
                "amenity filter contains prohibited protected-class language".to_owned(),
            ));
        }
    }
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
    Ok(Json(assemble_listing(&state, row).await?))
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
    let new_listing = NewListing::try_from(payload)?;
    // Referenced property must exist; RowNotFound maps to 404 via `?`.
    let property = properties_db::fetch_property(&state.db, new_listing.property_id).await?;
    let screen = screen_listing_text(&state, &new_listing.title, &new_listing.description).await?;
    let row = db::create_listing(&state.db, user.0.sub, new_listing, screen.cleared).await?;
    let listing = Listing::assemble(row, Some(Property::from(property)), Vec::new());
    Ok((StatusCode::CREATED, Json(listing)))
}

// `PUT /api/v1/listings/{id}`
//
/// Partial update of a listing the caller owns. Re-runs the Fair Housing text
/// screen when the title or description changes, restamping
/// `fairHousingCleared`.
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
    let patch = ListingPatch::try_from(payload)?;
    // Whether this update touched screenable free-text; drives the re-screen.
    let text_changed = patch.title.is_some() || patch.description.is_some();
    let mut row = match db::update_listing(&state.db, listing_id, user.0.sub, patch).await? {
        ListingUpdate::Updated(row) => *row,
        ListingUpdate::NotFound => {
            return Err(ApiError::NotFound("listing not found".to_owned()));
        }
        ListingUpdate::Forbidden => {
            return Err(ApiError::Forbidden("not_listing_owner".to_owned()));
        }
    };
    if text_changed {
        let screen = screen_listing_text(&state, &row.title, &row.description).await?;
        db::set_fair_housing_cleared(&state.db, row.id, screen.cleared).await?;
        // Reflect the fresh verdict in the row we are about to return.
        row.fair_housing_cleared = screen.cleared;
    }
    Ok(Json(assemble_listing(&state, row).await?))
}

// `GET /api/v1/listings/landlord`
//
/// The caller's own listings, filtered by lifecycle state and sorted, paginated.
///
/// # Errors
///
/// Returns `400` for an invalid `state` or `sortBy`, or a database error.
#[utoipa::path(
    get,
    path = "/listings/landlord",
    tag = "Listings",
    params(LandlordListingParams, Pagination),
    responses(
        (status = 200, description = "The landlord's listings (paginated)", body = PaginatedResponse<Listing>),
        (status = 400, description = "Invalid filter parameters", body = ErrorResponse),
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
    Query(params): Query<LandlordListingParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Listing>>> {
    let filter = params.into_validated(&pagination)?;
    let (listings, total) = db::list_landlord_listings(&state.db, user.0.sub, &filter).await?;
    Ok(Json(PaginatedResponse::new(listings, total, &pagination)))
}

// `POST /api/v1/listings/{id}/submit`
//
/// Submits a `draft` for review (`draft -> pending`). `pending` is the
/// pre-publish holding state; activation (`-> active`) runs the authority gate
/// in a later commit.
///
/// # Errors
///
/// Returns `403` when the caller is not the lister, `404` when the listing does
/// not exist, `409` when it is not in `draft`, or a database error.
#[utoipa::path(
    post,
    path = "/listings/{id}/submit",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Submitted listing", body = Listing),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lister", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 409, description = "Listing is not in a submittable state", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn submit_listing(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<Json<Listing>> {
    let outcome = db::transition_state(
        &state.db,
        listing_id,
        user.0.sub,
        ListingState::Pending,
        false,
    )
    .await?;
    let row = transition_or_error(outcome)?;
    Ok(Json(assemble_listing(&state, row).await?))
}

// `PUT /api/v1/listings/{id}/state`
//
/// Drives a listing the caller owns through a forward lifecycle transition.
/// Legal transitions only. `-> active` is authority-gate-guarded: it requires a
/// verified identity (KYC), authority tier `T1+`, and a cleared Fair Housing
/// screen. `withdrawn`/`expired` are not settable here.
///
/// # Errors
///
/// Returns `403` when the caller is not the lister, `404` when the listing does
/// not exist, `409` on an illegal transition or an unsatisfied activation gate,
/// or a database error.
#[utoipa::path(
    put,
    path = "/listings/{id}/state",
    tag = "Listings",
    request_body = UpdateStateRequest,
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Transitioned listing", body = Listing),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lister", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 409, description = "Illegal transition or unsatisfied activation gate", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn set_listing_state(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
    Json(payload): Json<UpdateStateRequest>,
) -> ApiResult<Json<Listing>> {
    // The authority gate runs only on `-> active`. Resolve the identity (KYC)
    // half here - an async provider call outside the DB - then the
    // transactional transition checks the remaining gates under a row lock.
    let kyc_verified = if payload.state == ListingState::Active {
        state
            .kyc
            .verify_identity(user.0.sub)
            .await
            .map_err(|err| {
                tracing::error!(?err, "kyc verification failed");
                ApiError::Internal("identity verification failed".to_owned())
            })?
            .verified
    } else {
        false
    };
    let outcome = db::transition_state(
        &state.db,
        listing_id,
        user.0.sub,
        payload.state,
        kyc_verified,
    )
    .await?;
    let row = transition_or_error(outcome)?;
    Ok(Json(assemble_listing(&state, row).await?))
}

// `DELETE /api/v1/listings/{id}`
//
/// Soft-withdraws a listing the caller owns (`state = 'withdrawn'`,
/// `deleted_at` stamped). Always a soft delete to preserve historical data.
///
/// # Errors
///
/// Returns `403` when the caller is not the lister, `404` when the listing does
/// not exist, or a database error.
#[utoipa::path(
    delete,
    path = "/listings/{id}",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 204, description = "Listing withdrawn"),
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
pub async fn delete_listing(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    match db::withdraw_listing(&state.db, listing_id, user.0.sub).await? {
        WithdrawOutcome::Withdrawn => Ok(StatusCode::NO_CONTENT),
        WithdrawOutcome::NotFound => Err(ApiError::NotFound("listing not found".to_owned())),
        WithdrawOutcome::Forbidden => Err(ApiError::Forbidden("not_listing_owner".to_owned())),
    }
}

// `POST /api/v1/listings/{id}/view`
//
/// Records a unique-tenant view of an active listing. Idempotent per tenant -
/// the `views` counter increments only on a tenant's first view; repeat calls
/// return the current count with `counted = false`.
///
/// # Errors
///
/// Returns `404` when no active listing has that id, or a database error.
#[utoipa::path(
    post,
    path = "/listings/{id}/view",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "View recorded", body = ViewResponse),
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
pub async fn record_listing_view(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<Json<ViewResponse>> {
    match db::record_view(&state.db, listing_id, user.0.sub).await? {
        Some(tally) => Ok(Json(ViewResponse {
            views: tally.views,
            counted: tally.counted,
        })),
        None => Err(ApiError::NotFound("listing not found".to_owned())),
    }
}

// `GET /api/v1/listings/{id}/statistics`
//
/// Performance snapshot for a listing the caller owns: views, applications,
/// active leases, monthly revenue and portfolio occupancy.
///
/// # Errors
///
/// Returns `404` when the caller owns no live listing with that id, or a
/// database error.
#[utoipa::path(
    get,
    path = "/listings/{id}/statistics",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Listing statistics", body = ListingStatistics),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_listing_statistics(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<Json<ListingStatistics>> {
    db::fetch_statistics(&state.db, listing_id, user.0.sub)
        .await?
        .map(Json)
        .ok_or_else(|| ApiError::NotFound("listing not found".to_owned()))
}

// `GET /api/v1/listings/{id}/historical-data`
//
/// Historical-activity summary for a listing the caller owns: lease and view
/// counts plus whether any history exists.
///
/// # Errors
///
/// Returns `404` when the caller owns no live listing with that id, or a
/// database error.
#[utoipa::path(
    get,
    path = "/listings/{id}/historical-data",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Listing historical data", body = ListingHistoricalData),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_listing_historical_data(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<Json<ListingHistoricalData>> {
    db::fetch_historical_data(&state.db, listing_id, user.0.sub)
        .await?
        .map(Json)
        .ok_or_else(|| ApiError::NotFound("listing not found".to_owned()))
}

// `GET /api/v1/listings/{id}/provenance`
//
/// Current authority-gate status for a listing the caller owns: identity,
/// authority tier + label, PM attribution, Fair Housing, and the derived
/// "verified lister" badge.
///
/// # Errors
///
/// Returns `404` when the caller owns no live listing with that id, or a
/// database error.
#[utoipa::path(
    get,
    path = "/listings/{id}/provenance",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Listing provenance", body = ListingProvenance),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_provenance(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<Json<ListingProvenance>> {
    db::fetch_provenance(&state.db, listing_id, user.0.sub)
        .await?
        .map(Json)
        .ok_or_else(|| ApiError::NotFound("listing not found".to_owned()))
}

// `POST /api/v1/listings/{id}/authority/documents`
//
/// Uploads a proof-of-authority document (deed/title/management agreement) for
/// a listing the caller owns, lifting its authority tier from `T0` to `T1`. A
/// management agreement also marks the listing as PM-managed.
///
/// The multipart body carries a `file` field (PDF/PNG/JPEG, max 10 MB) and a
/// `documentType` field. The caller is authorized before the file is stored, so
/// a non-owner cannot leave an orphan blob.
///
/// # Errors
///
/// Returns `400` on a missing/invalid field, `403` when the caller is not the
/// lister, `404` when the listing does not exist, `413` when the payload is too
/// large, `415` on an unsupported media type, or a storage/database error.
#[utoipa::path(
    post,
    path = "/listings/{id}/authority/documents",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    request_body(
        content = Vec<u8>,
        content_type = "multipart/form-data",
        description = "Multipart form: a `file` field (PDF/PNG/JPEG, max 10 MB) and a `documentType` field (deed/title/management_agreement)",
    ),
    responses(
        (status = 201, description = "Document stored, tier updated", body = AuthorityDocumentResponse),
        (status = 400, description = "Missing or malformed field", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lister", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 413, description = "Payload too large", body = ErrorResponse),
        (status = 415, description = "Unsupported media type", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn upload_authority_document(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
    mut multipart: Multipart,
) -> ApiResult<(StatusCode, Json<AuthorityDocumentResponse>)> {
    let mut file = None;
    let mut document_type = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|err| document_multipart_err(&err))?
    {
        match field.name() {
            Some(DOCUMENT_FILE_FIELD) => {
                let declared_mime = field.content_type().map(str::to_ascii_lowercase);
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|err| document_multipart_err(&err))?
                    .to_vec();
                file = Some((declared_mime, bytes));
            }
            Some(DOCUMENT_TYPE_FIELD) => {
                let raw = field
                    .text()
                    .await
                    .map_err(|err| document_multipart_err(&err))?;
                let parsed = AuthorityDocumentType::from_str(raw.trim()).map_err(|_| {
                    ApiError::BadRequest(
                        "documentType must be one of: deed, title, management_agreement".to_owned(),
                    )
                })?;
                document_type = Some(parsed);
            }
            _ => {}
        }
    }

    let (declared_mime, bytes) =
        file.ok_or_else(|| ApiError::BadRequest("Missing `file` field".to_owned()))?;
    let document_type = document_type
        .ok_or_else(|| ApiError::BadRequest("Missing `documentType` field".to_owned()))?;

    if bytes.len() > MAX_DOCUMENT_BYTES {
        return Err(ApiError::PayloadTooLarge(format!(
            "Document payload exceeds {MAX_DOCUMENT_BYTES}-byte limit"
        )));
    }

    let detected = sniff_document_kind(&bytes).ok_or_else(|| {
        ApiError::UnsupportedMediaType(
            "File bytes do not match a supported document format (PDF/PNG/JPEG)".to_owned(),
        )
    })?;

    // When the client sent a Content-Type, it must agree with the sniffed
    // bytes - blocks claiming `application/pdf` while sending something else.
    if let Some(declared) = &declared_mime {
        let base = declared.split(';').next().unwrap_or("").trim();
        if base != detected.mime {
            return Err(ApiError::UnsupportedMediaType(format!(
                "declared content-type {declared} does not match the file bytes"
            )));
        }
    }

    // Authorize before storing so a non-owner cannot leave an orphan blob. The
    // db write re-checks ownership under a row lock to close the TOCTOU window.
    db::assert_listing_owner(&state.db, listing_id, user.0.sub).await?;

    let key = format!(
        "listings/{listing_id}/authority/{}.{}",
        Uuid::new_v4(),
        detected.ext
    );
    let url = state
        .media_storage
        .put(&key, &bytes, detected.mime)
        .await
        .map_err(|err| {
            tracing::error!(?err, "authority document storage failed");
            ApiError::Internal("failed to store document".to_owned())
        })?;

    match db::add_authority_document(&state.db, listing_id, user.0.sub, document_type, &url).await?
    {
        AuthorityUpload::Added {
            id,
            created_at,
            provenance,
        } => Ok((
            StatusCode::CREATED,
            Json(AuthorityDocumentResponse {
                id,
                document_type,
                url,
                uploaded_at: created_at,
                provenance,
            }),
        )),
        AuthorityUpload::NotFound => Err(ApiError::NotFound("listing not found".to_owned())),
        AuthorityUpload::Forbidden => Err(ApiError::Forbidden("not_listing_owner".to_owned())),
    }
}

// `POST /api/v1/listings/{id}/fair-housing/screen`
//
/// Runs the Fair Housing advertising screen on a listing the caller owns and
/// restamps `fairHousingCleared`. Returns the verdict plus any flags for
/// remediation.
///
/// # Errors
///
/// Returns `404` when the caller owns no live listing with that id, a screen
/// backend failure, or a database error.
#[utoipa::path(
    post,
    path = "/listings/{id}/fair-housing/screen",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Screen result", body = FairHousingScreenResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn screen_listing(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
) -> ApiResult<Json<FairHousingScreenResponse>> {
    let (title, description) = db::fetch_owned_listing_text(&state.db, listing_id, user.0.sub)
        .await?
        .ok_or_else(|| ApiError::NotFound("listing not found".to_owned()))?;
    let outcome = screen_listing_text(&state, &title, &description).await?;
    db::set_fair_housing_cleared(&state.db, listing_id, outcome.cleared).await?;
    Ok(Json(FairHousingScreenResponse {
        cleared: outcome.cleared,
        flags: outcome.flags,
    }))
}

// `POST /api/v1/listings/{id}/media`
//
/// Uploads an image (PNG/JPEG/WebP, max 10 MB) to a listing the caller owns.
/// The bytes are sniffed by magic number, stripped of metadata (EXIF/GPS),
/// stored via `MediaStorage`, and pinned via `ContentPinner`. The new item
/// starts in `pending` moderation, so it is hidden from public reads until
/// approved.
///
/// # Errors
///
/// Returns `400` on a missing/malformed field, `403` when the caller is not the
/// lister, `404` when the listing does not exist, `413` when the payload is too
/// large, `415` on an unsupported media type, or a storage/pin/database error.
#[utoipa::path(
    post,
    path = "/listings/{id}/media",
    tag = "Listings",
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    request_body(
        content = Vec<u8>,
        content_type = "multipart/form-data",
        description = "Multipart form with a single `file` field (PNG/JPEG/WebP, max 10 MB)",
    ),
    responses(
        (status = 201, description = "Media stored", body = MediaRef),
        (status = 400, description = "Missing or malformed `file` field", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lister", body = ErrorResponse),
        (status = 404, description = "Listing not found", body = ErrorResponse),
        (status = 413, description = "Payload too large", body = ErrorResponse),
        (status = 415, description = "Unsupported media type", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn upload_listing_media(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
    mut multipart: Multipart,
) -> ApiResult<(StatusCode, Json<MediaRef>)> {
    let mut file = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|err| media_multipart_err(&err))?
    {
        if field.name() == Some(MEDIA_FILE_FIELD) {
            let declared_mime = field.content_type().map(str::to_ascii_lowercase);
            let bytes = field
                .bytes()
                .await
                .map_err(|err| media_multipart_err(&err))?
                .to_vec();
            file = Some((declared_mime, bytes));
            break;
        }
    }

    let (declared_mime, bytes) =
        file.ok_or_else(|| ApiError::BadRequest("Missing `file` field".to_owned()))?;

    if bytes.len() > MAX_MEDIA_BYTES {
        return Err(ApiError::PayloadTooLarge(format!(
            "Media payload exceeds {MAX_MEDIA_BYTES}-byte limit"
        )));
    }

    let detected = image::sniff_image_kind(&bytes).ok_or_else(|| {
        ApiError::UnsupportedMediaType(
            "File bytes do not match a supported image format (PNG/JPEG/WebP)".to_owned(),
        )
    })?;

    // When the client sent a Content-Type, it must agree with the sniffed bytes.
    if let Some(declared) = &declared_mime {
        let base = declared.split(';').next().unwrap_or("").trim();
        if base != detected.mime {
            return Err(ApiError::UnsupportedMediaType(format!(
                "declared content-type {declared} does not match the file bytes"
            )));
        }
    }

    // Authorize before storing so a non-owner cannot leave an orphan blob.
    db::assert_listing_owner(&state.db, listing_id, user.0.sub).await?;

    // Strip EXIF/GPS before anything leaves the process - storage and pin both
    // see only the sanitized bytes, so the CID is of the clean content too.
    let clean = state.metadata_stripper.strip(&bytes, detected.mime).await;
    let key = format!(
        "listings/{listing_id}/media/{}.{}",
        Uuid::new_v4(),
        detected.ext
    );
    let url = state
        .media_storage
        .put(&key, &clean, detected.mime)
        .await
        .map_err(|err| {
            tracing::error!(?err, "listing media storage failed");
            ApiError::Internal("failed to store media".to_owned())
        })?;
    let cid = state.content_pinner.pin(&clean).await.map_err(|err| {
        tracing::error!(?err, "listing media pin failed");
        ApiError::Internal("failed to pin media".to_owned())
    })?;

    let row = db::insert_listing_media(&state.db, listing_id, &url, &cid, &key).await?;
    Ok((StatusCode::CREATED, Json(MediaRef::from(row))))
}

// `PUT /api/v1/listings/{id}/media/{mediaId}/moderation`
//
/// Moderator decision on a media item (`pending -> approved/rejected`). This is
/// the platform's call, not the lister's, so it requires the agent role; only
/// `approved` media is shown publicly.
///
/// # Errors
///
/// Returns `404` when no such media exists under that listing, or a database
/// error.
#[utoipa::path(
    put,
    path = "/listings/{id}/media/{mediaId}/moderation",
    tag = "Listings",
    request_body = MediaModerationRequest,
    params(
        ("id" = Uuid, Path, description = "Listing id"),
        ("mediaId" = Uuid, Path, description = "Media id")
    ),
    responses(
        (status = 200, description = "Moderated media", body = MediaRef),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Agent role required", body = ErrorResponse),
        (status = 404, description = "Media not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn moderate_media(
    State(state): State<Arc<AppState>>,
    _agent: RoleUser<AgentRole>,
    Path((listing_id, media_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<MediaModerationRequest>,
) -> ApiResult<Json<MediaRef>> {
    db::set_media_moderation(&state.db, listing_id, media_id, payload.moderation_status)
        .await?
        .map(|row| Json(MediaRef::from(row)))
        .ok_or_else(|| ApiError::NotFound("media not found".to_owned()))
}

// `PUT /api/v1/listings/{id}/media`
//
/// Reorders and/or removes media on a listing the caller owns. `order` sets
/// each id's position to its index; `remove` deletes items and their stored
/// blobs. Returns the listing's full media set (any moderation status).
///
/// # Errors
///
/// Returns `403` when the caller is not the lister, `404` when the listing does
/// not exist, or a database error.
#[utoipa::path(
    put,
    path = "/listings/{id}/media",
    tag = "Listings",
    request_body = MediaReorderRequest,
    params(
        ("id" = Uuid, Path, description = "Listing id")
    ),
    responses(
        (status = 200, description = "Updated media set", body = Vec<MediaRef>),
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
pub async fn update_media(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(listing_id): Path<Uuid>,
    Json(payload): Json<MediaReorderRequest>,
) -> ApiResult<Json<Vec<MediaRef>>> {
    db::assert_listing_owner(&state.db, listing_id, user.0.sub).await?;

    // Remove first (drops rows + blobs), then reorder what remains. Blob delete
    // is best-effort: the db row is already gone, so a storage hiccup only
    // leaves an orphan, not a dangling reference.
    if let Some(remove) = payload.remove.filter(|ids| !ids.is_empty()) {
        let keys = db::remove_listing_media(&state.db, listing_id, &remove).await?;
        for key in keys {
            if let Err(err) = state.media_storage.delete(&key).await {
                tracing::warn!(?err, %key, "failed to delete removed media blob");
            }
        }
    }
    if let Some(order) = payload.order.filter(|ids| !ids.is_empty()) {
        db::reorder_listing_media(&state.db, listing_id, &order).await?;
    }

    let media = db::fetch_all_listing_media(&state.db, listing_id)
        .await?
        .into_iter()
        .map(MediaRef::from)
        .collect();
    Ok(Json(media))
}
