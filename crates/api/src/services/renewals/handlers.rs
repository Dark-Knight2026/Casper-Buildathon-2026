//! HTTP request handlers for lease-renewal endpoints.

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
        leases::db as leases_db,
        renewals::{
            db::{self, NewRenewal},
            models::{CreateRenewalRequest, Renewal, RenewalListParams},
        },
    },
};

// `POST /api/v1/renewals`
//
/// Creates a renewal offer on a lease the caller owns.
///
/// Landlord-only. The target lease must be `active` or `expiring_soon` and owned
/// by the caller; the tenant is taken from the lease. The offer is created
/// already `sent`.
///
/// # Errors
///
/// Returns `400` on invalid terms or a lease with no tenant, `403` when not the
/// lease landlord, `404` when the lease is missing, `409` when the lease is not
/// renewable (not `active`/`expiring_soon`).
#[utoipa::path(
    post,
    path = "/renewals",
    tag = "Renewals",
    request_body = CreateRenewalRequest,
    responses(
        (status = 201, description = "Renewal offer created", body = Renewal),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lease landlord", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 409, description = "Lease is not renewable", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn create_renewal(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Json(payload): Json<CreateRenewalRequest>,
) -> ApiResult<(StatusCode, Json<Renewal>)> {
    let lease = leases_db::fetch_lease(&state.db, payload.lease_id).await?;
    if lease.landlord_id != user.0.sub {
        return Err(ApiError::Forbidden("not_lease_landlord".to_owned()));
    }
    if !matches!(lease.status.as_str(), "active" | "expiring_soon") {
        return Err(ApiError::Conflict(
            "only an active lease can be renewed".to_owned(),
        ));
    }
    let tenant_id = *lease
        .tenant_ids
        .first()
        .ok_or_else(|| ApiError::BadRequest("lease has no tenant to renew with".to_owned()))?;
    let new_renewal = NewRenewal::try_from(payload)?;
    let row = db::create_renewal(&state.db, user.0.sub, tenant_id, new_renewal).await?;
    Ok((StatusCode::CREATED, Json(Renewal::from(row))))
}

// `GET /api/v1/renewals/{id}`
//
/// Returns a single renewal offer to one of its parties.
///
/// Readable only by the landlord or the tenant on the renewal; any other
/// authenticated caller gets `403`.
///
/// # Errors
///
/// Returns `403` when the caller is not a party, `404` when no live renewal has
/// that id.
#[utoipa::path(
    get,
    path = "/renewals/{id}",
    tag = "Renewals",
    params(
        ("id" = Uuid, Path, description = "Renewal id")
    ),
    responses(
        (status = 200, description = "Renewal detail", body = Renewal),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not a party to this renewal", body = ErrorResponse),
        (status = 404, description = "Renewal not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_renewal(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Path(renewal_id): Path<Uuid>,
) -> ApiResult<Json<Renewal>> {
    let row = db::fetch_renewal(&state.db, renewal_id).await?;
    if row.landlord_id != claims.sub && row.tenant_id != claims.sub {
        return Err(ApiError::Forbidden("not_a_renewal_party".to_owned()));
    }
    Ok(Json(Renewal::from(row)))
}

// `GET /api/v1/renewals`
//
/// Lists the caller's renewal offers, scoped by role.
///
/// `landlordId=me` returns offers the caller authored, `tenantId=me` those
/// addressed to them; with neither, both are returned. A caller never sees a
/// renewal they are not a party to.
///
/// # Errors
///
/// Returns `400` when `tenantId`/`landlordId` is set to anything but `me`, or a
/// database error.
#[utoipa::path(
    get,
    path = "/renewals",
    tag = "Renewals",
    params(RenewalListParams, Pagination),
    responses(
        (status = 200, description = "Caller's renewals (paginated)", body = PaginatedResponse<Renewal>),
        (status = 400, description = "Invalid query", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_renewals(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Query(params): Query<RenewalListParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Renewal>>> {
    let scope = params.resolve()?;
    let (rows, total) = db::list_renewals(
        &state.db,
        claims.sub,
        scope,
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    let renewals = rows.into_iter().map(Renewal::from).collect();
    Ok(Json(PaginatedResponse::new(renewals, total, &pagination)))
}
