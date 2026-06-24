//! HTTP request handlers for invoice endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination},
    services::{
        auth::AuthUser,
        invoices::{
            db::{self, InvoiceFilter},
            models::{Invoice, InvoiceListParams},
        },
    },
};

// `GET /api/v1/invoices`
//
/// Lists the caller's invoices, scoped to them as tenant or landlord.
///
/// Any authenticated caller may read, but only ever their own party's invoices:
/// the scope is enforced in the query, so `tenantId`/`landlordId` (which accept
/// only `me`) merely document intent. Filter by `leaseId`, `kind`, `status`
/// (`overdue` matches unpaid past-deadline invoices), `propertyId`, and a
/// `dueFrom`/`dueTo` deadline range; sort by `deadline` (default), `amountDue`,
/// or `status`.
///
/// # Errors
///
/// Returns `400` when `tenantId`/`landlordId` is set to anything but `me`, or a
/// database error.
#[utoipa::path(
    get,
    path = "/invoices",
    tag = "Invoices",
    params(InvoiceListParams, Pagination),
    responses(
        (status = 200, description = "Caller's invoices (paginated)", body = PaginatedResponse<Invoice>),
        (status = 400, description = "Invalid query", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_invoices(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Query(params): Query<InvoiceListParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Invoice>>> {
    params.validate()?;
    let filter = InvoiceFilter {
        lease_id: params.lease_id,
        kind: params.kind,
        status: params.status,
        property_id: params.property_id,
        due_from: params.due_from,
        due_to: params.due_to,
        sort: params.sort_by.unwrap_or_default(),
        limit: pagination.page_size(),
        offset: pagination.offset(),
    };
    let (rows, total) = db::list_invoices(&state.db, claims.sub, &filter).await?;
    let invoices = rows.into_iter().map(Invoice::from).collect();
    Ok(Json(PaginatedResponse::new(invoices, total, &pagination)))
}

// `GET /api/v1/invoices/{id}`
//
/// Returns a single invoice to one of its parties.
///
/// Readable only by the invoice's tenant or landlord; any other caller gets a
/// `404` (the scope hides it rather than revealing its existence with a `403`).
///
/// # Errors
///
/// Returns `404` when no invoice with that id is visible to the caller.
#[utoipa::path(
    get,
    path = "/invoices/{id}",
    tag = "Invoices",
    params(
        ("id" = Uuid, Path, description = "Invoice id")
    ),
    responses(
        (status = 200, description = "Invoice detail", body = Invoice),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Invoice not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_invoice(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Path(invoice_id): Path<Uuid>,
) -> ApiResult<Json<Invoice>> {
    let row = db::fetch_invoice(&state.db, invoice_id, claims.sub)
        .await?
        .ok_or_else(|| ApiError::NotFound("invoice not found".to_owned()))?;
    Ok(Json(Invoice::from(row)))
}
