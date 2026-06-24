//! HTTP request handlers for invoice endpoints.

use core::str::FromStr;
use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
};
use rust_decimal::Decimal;
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination},
    services::{
        auth::{AuthUser, RoleUser, TenantRole},
        invoices::{
            db::{self, InvoiceFilter, InvoiceRow},
            models::{
                Invoice, InvoiceKind, InvoiceListParams, InvoiceStatus, ReceiptResponse,
                SettlementRequest,
            },
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

// `POST /api/v1/invoices/{id}/settlement`
//
/// Records the on-chain settlement of an invoice the caller is the tenant of.
///
/// Tenant-only, party-scoped: after the tenant signs and submits `pay_invoice`
/// via CSPR.click, they post `{ amount, txHash }` here. The backend updates
/// optimistically (`rentPaid`, `txHash`, derived status); the indexer later
/// reconciles the authoritative on-chain state. For rent, `amount` is a partial
/// or full instalment that may not exceed the remaining balance; for a deposit
/// it must equal `amountDue` (the contract takes deposits in full).
///
/// # Errors
///
/// Returns `400` on a non-positive `amount`, an overpayment, or a part-paid
/// deposit; `403` when the caller is not the tenant; `404` when the invoice is
/// not visible; `409` when the invoice is past its deadline or not awaiting
/// payment.
#[utoipa::path(
    post,
    path = "/invoices/{id}/settlement",
    tag = "Invoices",
    params(
        ("id" = Uuid, Path, description = "Invoice id")
    ),
    request_body = SettlementRequest,
    responses(
        (status = 200, description = "Invoice settled (optimistic)", body = Invoice),
        (status = 400, description = "Invalid amount", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the invoice tenant", body = ErrorResponse),
        (status = 404, description = "Invoice not found", body = ErrorResponse),
        (status = 409, description = "Invoice not payable", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn settle_invoice(
    State(state): State<Arc<AppState>>,
    user: RoleUser<TenantRole>,
    Path(invoice_id): Path<Uuid>,
    Json(payload): Json<SettlementRequest>,
) -> ApiResult<Json<Invoice>> {
    let row = db::fetch_invoice(&state.db, invoice_id, user.0.sub)
        .await?
        .ok_or_else(|| ApiError::NotFound("invoice not found".to_owned()))?;
    // Only the buyer settles; the scope also admits the landlord, so reject them.
    if row.tenant_id != user.0.sub {
        return Err(ApiError::Forbidden("not_invoice_tenant".to_owned()));
    }
    // Payable only while pending/partial and not past its deadline.
    match row.effective_status() {
        InvoiceStatus::Pending | InvoiceStatus::Partial => {}
        InvoiceStatus::Overdue => {
            return Err(ApiError::Conflict("invoice is past its deadline".to_owned()));
        }
        _ => return Err(ApiError::Conflict("invoice is not awaiting payment".to_owned())),
    }

    let (new_rent_paid, new_status) = settle_amount(&row, &payload.amount)?;
    let updated = db::settle_invoice(
        &state.db,
        invoice_id,
        &new_rent_paid,
        new_status,
        &payload.tx_hash,
    )
    .await?;
    Ok(Json(Invoice::from(updated)))
}

/// Validates `amount` against the invoice and returns the new cumulative
/// `rent_paid` (decimal string) and derived status.
///
/// Rent accumulates toward `amountDue` (`partial` until cleared, then `paid`);
/// a deposit must be paid in full (`paid`), leaving its `rentPaid` untouched.
fn settle_amount(row: &InvoiceRow, amount: &str) -> ApiResult<(String, InvoiceStatus)> {
    let parse = |value: &str| Decimal::from_str(value).ok();
    let amount = parse(amount)
        .filter(|value| value.is_sign_positive() && !value.is_zero())
        .ok_or_else(|| ApiError::BadRequest("amount must be a positive decimal".to_owned()))?;
    // amountDue/rentPaid come from the DB (NUMERIC), so they always parse.
    let amount_due = parse(&row.amount_due)
        .ok_or_else(|| ApiError::Internal("stored amountDue is not a decimal".to_owned()))?;

    match row.kind {
        InvoiceKind::Rent => {
            let rent_paid = parse(&row.rent_paid)
                .ok_or_else(|| ApiError::Internal("stored rentPaid is not a decimal".to_owned()))?;
            let total = rent_paid + amount;
            if total > amount_due {
                return Err(ApiError::BadRequest(
                    "amount exceeds the invoice balance".to_owned(),
                ));
            }
            let status = if total >= amount_due {
                InvoiceStatus::Paid
            } else {
                InvoiceStatus::Partial
            };
            Ok((total.to_string(), status))
        }
        InvoiceKind::SecurityDeposit => {
            if amount != amount_due {
                return Err(ApiError::BadRequest(
                    "a security deposit must be paid in full".to_owned(),
                ));
            }
            // A deposit has no partial-payment progress; leave rentPaid as stored.
            Ok((row.rent_paid.clone(), InvoiceStatus::Paid))
        }
    }
}

// `GET /api/v1/invoices/{id}/receipt`
//
/// Returns the receipt link for an invoice the caller is a party to.
///
/// Readable by the invoice's tenant or landlord; any other caller gets a `404`.
/// The URL is null until a receipt is issued (Phase 0 has no PDF pipeline).
///
/// # Errors
///
/// Returns `404` when no invoice with that id is visible to the caller.
#[utoipa::path(
    get,
    path = "/invoices/{id}/receipt",
    tag = "Invoices",
    params(
        ("id" = Uuid, Path, description = "Invoice id")
    ),
    responses(
        (status = 200, description = "Receipt link", body = ReceiptResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Invoice not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_receipt(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Path(invoice_id): Path<Uuid>,
) -> ApiResult<Json<ReceiptResponse>> {
    let row = db::fetch_invoice(&state.db, invoice_id, claims.sub)
        .await?
        .ok_or_else(|| ApiError::NotFound("invoice not found".to_owned()))?;
    Ok(Json(ReceiptResponse {
        receipt_url: row.receipt_url,
    }))
}
