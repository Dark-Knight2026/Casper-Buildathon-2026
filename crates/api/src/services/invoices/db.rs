//! Database operations for invoices.
//!
//! Money columns (`amount_due`, `rent_paid`, `landlord_charge`,
//! `tenant_refund`) and the U256 `onchain_invoice_id` are cast to `TEXT` at the
//! SQL boundary so the row maps to `decimal`/`U256` strings without precision
//! loss. The TEXT `kind`/`status` columns are read into the private
//! [`InvoiceRowRaw`] and parsed into typed [`InvoiceKind`]/[`InvoiceStatus`]
//! via `TryFrom`, so a stray CHECK value fails loudly with
//! [`Error::ColumnDecode`] rather than degrading silently (mirrors the
//! `users`/`auth`/`renewals` db layers).
//!
//! The filter set is dynamic, so the list query is built with a runtime
//! `QueryBuilder` via the shared [`AppendFilters`]/[`AppendOrder`] traits; the
//! party scope (`caller` is tenant or landlord) is part of the base `WHERE` and
//! is never optional.

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::{Error, FromRow, PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::{
    common::{AppendFilters, AppendOrder, QueryBuilderExt},
    services::invoices::models::{InvoiceKind, InvoiceSort, InvoiceStatus, LandlordSummary},
};

/// An invoice row as stored, with typed `kind`/`status` and string money fields.
#[derive(Debug)]
pub struct InvoiceRow {
    /// Invoice id.
    pub id: Uuid,
    /// Escrow U256 invoice id (decimal string); null until bound on-chain.
    pub onchain_invoice_id: Option<String>,
    /// Lease this invoice belongs to.
    pub lease_id: Uuid,
    /// Rent or security deposit.
    pub kind: InvoiceKind,
    /// Tenant (buyer) user id.
    pub tenant_id: Uuid,
    /// Landlord (recipient) user id.
    pub landlord_id: Uuid,
    /// Property this invoice is against.
    pub property_id: Uuid,
    /// Total amount due (decimal string).
    pub amount_due: String,
    /// Partial-payment progress (decimal string).
    pub rent_paid: String,
    /// Property manager receiving a rent share, if any.
    pub property_manager_id: Option<Uuid>,
    /// Manager rent share in basis points.
    pub property_manager_bps: i32,
    /// Stored lifecycle status (never `Overdue`; see [`Self::effective_status`]).
    pub status: InvoiceStatus,
    /// Payment deadline.
    pub deadline: NaiveDate,
    /// Amount kept by the landlord on deposit release (decimal string).
    pub landlord_charge: Option<String>,
    /// Amount returned to the tenant on deposit release (decimal string).
    pub tenant_refund: Option<String>,
    /// Settlement deploy hash.
    pub tx_hash: Option<String>,
    /// Receipt URL.
    pub receipt_url: Option<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl InvoiceRow {
    /// The status as seen on read: `Overdue` when an unpaid invoice is past its
    /// deadline, otherwise the stored status.
    ///
    /// `Overdue` is a projection, never persisted, so the stored column stays the
    /// authoritative on-chain status that the indexer reconciles.
    #[inline]
    #[must_use]
    pub fn effective_status(&self) -> InvoiceStatus {
        if matches!(self.status, InvoiceStatus::Pending | InvoiceStatus::Partial)
            && self.deadline < Utc::now().date_naive()
        {
            InvoiceStatus::Overdue
        } else {
            self.status
        }
    }
}

/// Raw DB projection of an invoice row: `kind`/`status` are the underlying TEXT
/// values, parsed into typed enums by [`InvoiceRow`]'s `TryFrom` impl. Private to
/// the db layer; callers only ever see [`InvoiceRow`].
#[derive(Debug, FromRow)]
struct InvoiceRowRaw {
    id: Uuid,
    onchain_invoice_id: Option<String>,
    lease_id: Uuid,
    kind: String,
    tenant_id: Uuid,
    landlord_id: Uuid,
    property_id: Uuid,
    amount_due: String,
    rent_paid: String,
    property_manager_id: Option<Uuid>,
    property_manager_bps: i32,
    status: String,
    deadline: NaiveDate,
    landlord_charge: Option<String>,
    tenant_refund: Option<String>,
    tx_hash: Option<String>,
    receipt_url: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl TryFrom<InvoiceRowRaw> for InvoiceRow {
    type Error = Error;

    /// Parses the raw row, failing loudly when a TEXT `kind`/`status` is not a
    /// known enum value (a missing migration, not user input).
    #[inline]
    fn try_from(raw: InvoiceRowRaw) -> Result<Self, Self::Error> {
        let kind = InvoiceKind::from_str(&raw.kind).map_err(|err| Error::ColumnDecode {
            index: "kind".to_owned(),
            source: Box::new(err),
        })?;
        let status = InvoiceStatus::from_str(&raw.status).map_err(|err| Error::ColumnDecode {
            index: "status".to_owned(),
            source: Box::new(err),
        })?;
        Ok(Self {
            id: raw.id,
            onchain_invoice_id: raw.onchain_invoice_id,
            lease_id: raw.lease_id,
            kind,
            tenant_id: raw.tenant_id,
            landlord_id: raw.landlord_id,
            property_id: raw.property_id,
            amount_due: raw.amount_due,
            rent_paid: raw.rent_paid,
            property_manager_id: raw.property_manager_id,
            property_manager_bps: raw.property_manager_bps,
            status,
            deadline: raw.deadline,
            landlord_charge: raw.landlord_charge,
            tenant_refund: raw.tenant_refund,
            tx_hash: raw.tx_hash,
            receipt_url: raw.receipt_url,
            created_at: raw.created_at,
            updated_at: raw.updated_at,
        })
    }
}

/// Validated filter for `GET /invoices`, owning its `WHERE`/`ORDER BY` fragments.
#[derive(Debug)]
pub struct InvoiceFilter {
    /// Filter to a single lease.
    pub lease_id: Option<Uuid>,
    /// Filter by kind.
    pub kind: Option<InvoiceKind>,
    /// Filter by status (`Overdue` expands to unpaid past-deadline).
    pub status: Option<InvoiceStatus>,
    /// Filter to a single property.
    pub property_id: Option<Uuid>,
    /// Lower deadline bound (inclusive).
    pub due_from: Option<NaiveDate>,
    /// Upper deadline bound (inclusive).
    pub due_to: Option<NaiveDate>,
    /// Sort key.
    pub sort: InvoiceSort,
    /// Page size.
    pub limit: i64,
    /// Page offset.
    pub offset: i64,
}

impl AppendFilters for InvoiceFilter {
    /// Pushes the dynamic WHERE filters shared by the count and page queries.
    #[inline]
    fn append_to(&self, builder: &mut QueryBuilder<Postgres>) {
        if let Some(lease_id) = self.lease_id {
            builder.push(" AND i.lease_id = ").push_bind(lease_id);
        }
        if let Some(kind) = self.kind {
            builder.push(" AND i.kind = ").push_bind(kind.as_ref());
        }
        match self.status {
            // `Overdue` is not a stored value; expand it to its definition.
            Some(InvoiceStatus::Overdue) => {
                builder
                    .push(" AND i.status IN ('pending', 'partial') AND i.deadline < CURRENT_DATE");
            }
            Some(status) => {
                builder.push(" AND i.status = ").push_bind(status.as_ref());
            }
            None => {}
        }
        if let Some(property_id) = self.property_id {
            builder.push(" AND i.property_id = ").push_bind(property_id);
        }
        if let Some(due_from) = self.due_from {
            builder.push(" AND i.deadline >= ").push_bind(due_from);
        }
        if let Some(due_to) = self.due_to {
            builder.push(" AND i.deadline <= ").push_bind(due_to);
        }
    }
}

impl AppendOrder for InvoiceFilter {
    /// Pushes `ORDER BY <key> ASC, i.id ASC` (id tie-break for stable paging).
    #[inline]
    fn append_order(&self, builder: &mut QueryBuilder<Postgres>) {
        builder
            .push(" ORDER BY ")
            .push(self.sort.order_column())
            .push(" ASC, i.id ASC");
    }
}

/// Columns selected into an [`InvoiceRowRaw`] (aliased to `i`); money and the
/// U256 id are cast to TEXT so they decode as strings.
const INVOICE_COLUMNS: &str = r"
    i.id,
    i.onchain_invoice_id::TEXT AS onchain_invoice_id,
    i.lease_id,
    i.kind,
    i.tenant_id,
    i.landlord_id,
    i.property_id,
    i.amount_due::TEXT AS amount_due,
    i.rent_paid::TEXT AS rent_paid,
    i.property_manager_id,
    i.property_manager_bps,
    i.status,
    i.deadline,
    i.landlord_charge::TEXT AS landlord_charge,
    i.tenant_refund::TEXT AS tenant_refund,
    i.tx_hash,
    i.receipt_url,
    i.created_at,
    i.updated_at
";

/// Lists the caller's invoices (as tenant or landlord) matching `filter`, with
/// the total match count for pagination.
///
/// The party scope is unconditional: every row must have `caller` as its tenant
/// or landlord, regardless of the supplied filters.
///
/// # Errors
///
/// Returns [`Error`] on any database failure, or [`Error::ColumnDecode`] if a
/// stored `kind`/`status` is not a known enum value.
#[inline]
pub async fn list_invoices(
    pool: &PgPool,
    caller: Uuid,
    filter: &InvoiceFilter,
) -> Result<(Vec<InvoiceRow>, i64), Error> {
    let total = scoped_base("SELECT COUNT(*)", caller)
        .append(filter)
        .build_query_scalar::<i64>()
        .fetch_one(pool)
        .await?;

    let raw = scoped_base(&format!("SELECT {INVOICE_COLUMNS}"), caller)
        .append(filter)
        .order_by(filter)
        .limit_offset(filter.limit, filter.offset)
        .build_query_as::<InvoiceRowRaw>()
        .fetch_all(pool)
        .await?;

    let rows = raw
        .into_iter()
        .map(InvoiceRow::try_from)
        .collect::<Result<Vec<_>, _>>()?;
    Ok((rows, total))
}

/// Starts an `<select_clause> FROM invoices i WHERE <party scope>` query, the
/// single point that scopes a list read to the caller as tenant or landlord.
/// The count and page queries differ only in `select_clause`.
fn scoped_base(select_clause: &str, caller: Uuid) -> QueryBuilder<Postgres> {
    let mut builder = QueryBuilder::new(format!("{select_clause} FROM invoices i WHERE "));
    builder
        .push("(i.tenant_id = ")
        .push_bind(caller)
        .push(" OR i.landlord_id = ")
        .push_bind(caller)
        .push(")");
    builder
}

/// Fetches one invoice by id, scoped to the caller as a party.
///
/// Returns `None` both when the invoice does not exist and when the caller is
/// not a party - the scope hides a stranger's invoice as a `404`, never a `403`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure, or [`Error::ColumnDecode`] if a
/// stored `kind`/`status` is not a known enum value.
#[inline]
pub async fn fetch_invoice(
    pool: &PgPool,
    invoice_id: Uuid,
    caller: Uuid,
) -> Result<Option<InvoiceRow>, Error> {
    let raw = sqlx::query_as!(
        InvoiceRowRaw,
        r#"
            SELECT
                id,
                onchain_invoice_id::text AS onchain_invoice_id,
                lease_id,
                kind,
                tenant_id,
                landlord_id,
                property_id,
                amount_due::text AS "amount_due!",
                rent_paid::text AS "rent_paid!",
                property_manager_id,
                property_manager_bps,
                status,
                deadline,
                landlord_charge::text AS landlord_charge,
                tenant_refund::text AS tenant_refund,
                tx_hash,
                receipt_url,
                created_at,
                updated_at
            FROM invoices
            WHERE id = $1 AND (tenant_id = $2 OR landlord_id = $2)
        "#,
        invoice_id,
        caller,
    )
    .fetch_optional(pool)
    .await?;

    raw.map(InvoiceRow::try_from).transpose()
}

/// Records a settlement on an invoice: writes the new cumulative `rent_paid`,
/// the derived `status`, and the on-chain `tx_hash`, returning the updated row.
///
/// The `status IN ('pending', 'partial')` guard makes the write safe under a
/// concurrent double-submit (the second caller matches no row and gets
/// [`Error::RowNotFound`]); `updated_at` is bumped by the table trigger.
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when the invoice is no longer settleable, or
/// any other database error.
#[inline]
pub async fn settle_invoice(
    pool: &PgPool,
    invoice_id: Uuid,
    rent_paid: &str,
    status: InvoiceStatus,
    tx_hash: &str,
) -> Result<InvoiceRow, Error> {
    let raw = sqlx::query_as!(
        InvoiceRowRaw,
        r#"
            UPDATE invoices SET
                rent_paid = $2::text::numeric,
                status = $3,
                tx_hash = $4
            WHERE id = $1 AND status IN ('pending', 'partial')
            RETURNING
                id,
                onchain_invoice_id::text AS onchain_invoice_id,
                lease_id,
                kind,
                tenant_id,
                landlord_id,
                property_id,
                amount_due::text AS "amount_due!",
                rent_paid::text AS "rent_paid!",
                property_manager_id,
                property_manager_bps,
                status,
                deadline,
                landlord_charge::text AS landlord_charge,
                tenant_refund::text AS tenant_refund,
                tx_hash,
                receipt_url,
                created_at,
                updated_at
        "#,
        invoice_id,
        rent_paid,
        status.as_ref(),
        tx_hash,
    )
    .fetch_one(pool)
    .await?;

    InvoiceRow::try_from(raw)
}

/// The tenant-summary money aggregates (the `nextDue` invoice is loaded
/// separately by [`fetch_next_due`] and assembled in the handler).
#[derive(Debug)]
pub struct TenantMoneySummary {
    /// Outstanding balance across unpaid invoices (decimal string).
    pub balance_due: String,
    /// Total paid so far this calendar year (decimal string).
    pub paid_ytd: String,
    /// Security deposit currently held in escrow (decimal string).
    pub deposit_held: String,
}

/// Computes the landlord dashboard aggregates across the landlord's invoices.
///
/// All money figures are decimal strings; `overdue_count` is a plain count.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn landlord_summary(pool: &PgPool, landlord: Uuid) -> Result<LandlordSummary, Error> {
    sqlx::query_as!(
        LandlordSummary,
        r#"
            SELECT
                COALESCE(SUM(amount_due) FILTER (
                    WHERE kind = 'rent' AND status = 'paid'
                      AND updated_at >= date_trunc('month', NOW())
                ), 0)::text AS "rent_received_mtd!",
                COALESCE(SUM(amount_due) FILTER (
                    WHERE kind = 'rent' AND status IN ('pending', 'partial')
                      AND deadline >= date_trunc('month', NOW())::date
                      AND deadline < (date_trunc('month', NOW()) + INTERVAL '1 month')::date
                ), 0)::text AS "monthly_rent_due!",
                COUNT(*) FILTER (
                    WHERE status IN ('pending', 'partial') AND deadline < CURRENT_DATE
                ) AS "overdue_count!",
                COALESCE(SUM(amount_due - rent_paid) FILTER (
                    WHERE status IN ('pending', 'partial') AND deadline < CURRENT_DATE
                ), 0)::text AS "overdue_amount!",
                COALESCE(SUM(amount_due) FILTER (
                    WHERE kind = 'security_deposit' AND status = 'paid'
                ), 0)::text AS "deposits_held!"
            FROM invoices
            WHERE landlord_id = $1
        "#,
        landlord,
    )
    .fetch_one(pool)
    .await
}

/// Computes the tenant dashboard money aggregates across the tenant's invoices.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn tenant_money_summary(
    pool: &PgPool,
    tenant: Uuid,
) -> Result<TenantMoneySummary, Error> {
    sqlx::query_as!(
        TenantMoneySummary,
        r#"
            SELECT
                COALESCE(SUM(amount_due - rent_paid) FILTER (
                    WHERE status IN ('pending', 'partial')
                ), 0)::text AS "balance_due!",
                COALESCE(SUM(amount_due) FILTER (
                    WHERE status = 'paid' AND updated_at >= date_trunc('year', NOW())
                ), 0)::text AS "paid_ytd!",
                COALESCE(SUM(amount_due) FILTER (
                    WHERE kind = 'security_deposit' AND status = 'paid'
                ), 0)::text AS "deposit_held!"
            FROM invoices
            WHERE tenant_id = $1
        "#,
        tenant,
    )
    .fetch_one(pool)
    .await
}

/// Fetches the tenant's next payable invoice (soonest `pending`/`partial` by
/// deadline), or `None` when nothing is due.
///
/// # Errors
///
/// Returns [`Error`] on any database failure, or [`Error::ColumnDecode`] if a
/// stored `kind`/`status` is not a known enum value.
#[inline]
pub async fn fetch_next_due(pool: &PgPool, tenant: Uuid) -> Result<Option<InvoiceRow>, Error> {
    let raw = sqlx::query_as!(
        InvoiceRowRaw,
        r#"
            SELECT
                id,
                onchain_invoice_id::text AS onchain_invoice_id,
                lease_id,
                kind,
                tenant_id,
                landlord_id,
                property_id,
                amount_due::text AS "amount_due!",
                rent_paid::text AS "rent_paid!",
                property_manager_id,
                property_manager_bps,
                status,
                deadline,
                landlord_charge::text AS landlord_charge,
                tenant_refund::text AS tenant_refund,
                tx_hash,
                receipt_url,
                created_at,
                updated_at
            FROM invoices
            WHERE tenant_id = $1 AND status IN ('pending', 'partial')
            ORDER BY deadline ASC, id ASC
            LIMIT 1
        "#,
        tenant,
    )
    .fetch_optional(pool)
    .await?;

    raw.map(InvoiceRow::try_from).transpose()
}
