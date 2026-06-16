//! HTTP request handlers for lease-agreement endpoints.

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
        auth::{AuthUser, LandlordRole, RoleUser},
        leases::{
            db,
            models::{CreateLeaseRequest, Lease, LeaseListParams, UpdateLeaseRequest},
        },
        properties::db as properties_db,
    },
};

// `POST /api/v1/leases`
//
/// Creates a `draft` lease agreement against a property the caller owns.
///
/// Landlord-only. Validates the terms (30-day-month duration, positive rent,
/// allowed currency, consistent manager split), property ownership, and that
/// the tenant exists. Nothing on-chain happens here.
///
/// # Errors
///
/// Returns `400` on invalid terms or an unknown tenant, `403` when the caller
/// is not the property owner, `404` when the property is missing.
#[utoipa::path(
    post,
    path = "/leases",
    tag = "Leases",
    request_body = CreateLeaseRequest,
    responses(
        (status = 201, description = "Draft lease created", body = Lease),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required or not the property owner", body = ErrorResponse),
        (status = 404, description = "Property not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn create_lease(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Json(payload): Json<CreateLeaseRequest>,
) -> ApiResult<(StatusCode, Json<Lease>)> {
    let new_lease = payload.into_validated()?;
    // Referenced property must exist and belong to the caller.
    let owner = properties_db::fetch_property_owner(&state.db, new_lease.property_id)
        .await?
        .ok_or_else(|| ApiError::NotFound("property not found".to_owned()))?;
    if owner != user.0.sub {
        return Err(ApiError::Forbidden("not_property_owner".to_owned()));
    }
    if !db::user_exists(&state.db, new_lease.primary_tenant_id).await? {
        return Err(ApiError::BadRequest("tenant not found".to_owned()));
    }
    let row = db::create_lease(&state.db, user.0.sub, new_lease).await?;
    Ok((StatusCode::CREATED, Json(Lease::from(row))))
}

// `GET /api/v1/leases/{id}`
//
/// Returns a single lease agreement to one of its parties.
///
/// Readable only by the landlord or a listed tenant; any other authenticated
/// caller gets `403`.
///
/// # Errors
///
/// Returns `403` when the caller is not a party, `404` when no live lease has
/// that id.
#[utoipa::path(
    get,
    path = "/leases/{id}",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    responses(
        (status = 200, description = "Lease detail", body = Lease),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not a party to this lease", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_lease(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Path(lease_id): Path<Uuid>,
) -> ApiResult<Json<Lease>> {
    let row = db::fetch_lease(&state.db, lease_id).await?;
    // Only the landlord or a listed tenant may read the agreement.
    if row.landlord_id != claims.sub && !row.tenant_ids.contains(&claims.sub) {
        return Err(ApiError::Forbidden("not_a_lease_party".to_owned()));
    }
    Ok(Json(Lease::from(row)))
}

// `GET /api/v1/leases`
//
/// Lists the caller's leases, scoped by role and optionally filtered by status.
///
/// `landlordId=me` returns leases the caller owns, `tenantId=me` those they are
/// a tenant on; with neither, both are returned. A caller never sees a lease
/// they are not a party to.
///
/// # Errors
///
/// Returns `400` when `tenantId`/`landlordId` is set to anything but `me`, or a
/// database error.
#[utoipa::path(
    get,
    path = "/leases",
    tag = "Leases",
    params(LeaseListParams, Pagination),
    responses(
        (status = 200, description = "Caller's leases (paginated)", body = PaginatedResponse<Lease>),
        (status = 400, description = "Invalid query", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_leases(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Query(params): Query<LeaseListParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Lease>>> {
    let (scope, status) = params.resolve()?;
    let (rows, total) = db::list_leases(
        &state.db,
        claims.sub,
        scope,
        status.as_deref(),
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    let leases = rows.into_iter().map(Lease::from).collect();
    Ok(Json(PaginatedResponse::new(leases, total, &pagination)))
}

// `PATCH /api/v1/leases/{id}`
//
/// Edits a draft lease's terms.
///
/// Landlord-only, owner-only, and allowed only while the lease is a `draft`;
/// omitted fields keep their current value. Editing a non-draft lease is `409`.
///
/// # Errors
///
/// Returns `400` on invalid merged terms, `403` when not the landlord, `404`
/// when the lease is missing, `409` when the lease is no longer a draft.
#[utoipa::path(
    patch,
    path = "/leases/{id}",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    request_body = UpdateLeaseRequest,
    responses(
        (status = 200, description = "Updated lease", body = Lease),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lease landlord", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 409, description = "Lease is not a draft", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn update_lease(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(lease_id): Path<Uuid>,
    Json(payload): Json<UpdateLeaseRequest>,
) -> ApiResult<Json<Lease>> {
    let current = db::fetch_lease(&state.db, lease_id).await?;
    if current.landlord_id != user.0.sub {
        return Err(ApiError::Forbidden("not_lease_landlord".to_owned()));
    }
    if current.status != "draft" {
        return Err(ApiError::Conflict(
            "lease can only be edited while draft".to_owned(),
        ));
    }
    let edit = payload.into_validated(&current)?;
    let row = db::update_lease_draft(&state.db, lease_id, edit).await?;
    Ok(Json(Lease::from(row)))
}

// `DELETE /api/v1/leases/{id}`
//
/// Soft-deletes a draft lease.
///
/// Landlord-only, owner-only, and allowed only while the lease is a `draft`;
/// deleting a committed/active lease is `409`.
///
/// # Errors
///
/// Returns `403` when not the landlord, `404` when the lease is missing, `409`
/// when the lease is not a draft.
#[utoipa::path(
    delete,
    path = "/leases/{id}",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    responses(
        (status = 204, description = "Draft lease deleted"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lease landlord", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 409, description = "Lease is not a draft", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn delete_lease(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(lease_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    let current = db::fetch_lease(&state.db, lease_id).await?;
    if current.landlord_id != user.0.sub {
        return Err(ApiError::Forbidden("not_lease_landlord".to_owned()));
    }
    if current.status != "draft" {
        return Err(ApiError::Conflict(
            "only a draft lease can be deleted".to_owned(),
        ));
    }
    db::soft_delete_lease(&state.db, lease_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
