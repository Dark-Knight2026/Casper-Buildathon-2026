//! Request/response models for the invoice endpoints.
//!
//! Money fields (`amountDue`, `rentPaid`, `landlordCharge`, `tenantRefund`) are
//! decimal strings on the wire - never floats - so USDC precision survives the
//! round-trip. `kind`/`status` wire forms are hyphenated (FE) while their DB
//! string forms are snake_case (CHECK), so serde and strum diverge by design.
//! `overdue` is a read-time projection (see [`InvoiceStatus`]) and is never
//! stored.

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use strum::{AsRefStr, Display, EnumString};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult},
    services::invoices::db::InvoiceRow,
};

/// Whether an invoice is a rent charge or a security deposit. Stored as TEXT
/// (CHECK) in the DB (`snake_case`); the wire form is hyphenated.
#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    ToSchema,
    EnumString,
    Display,
    AsRefStr,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "snake_case")]
pub enum InvoiceKind {
    /// A monthly rent charge; passes through escrow to the landlord on payment.
    Rent,
    /// A security deposit; held in escrow custody until release.
    SecurityDeposit,
}

/// Invoice lifecycle status. Stored as TEXT (CHECK) in the DB (`snake_case`);
/// the wire form is hyphenated.
///
/// `Overdue` is **never stored**: it is derived on read by
/// [`InvoiceRow::effective_status`] when a `Pending`/`Partial` invoice is past
/// its deadline. The DB column always holds the authoritative on-chain status so
/// the indexer can reconcile without working around a derived sentinel.
#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    Serialize,
    Deserialize,
    ToSchema,
    EnumString,
    Display,
    AsRefStr,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "snake_case")]
pub enum InvoiceStatus {
    /// Seeded off-chain at lease commit; not yet minted on-chain.
    Scheduled,
    /// Minted on-chain (bound by `InvoiceCreated`); awaiting payment.
    Pending,
    /// Partially paid (rent only); `rentPaid` accumulates toward `amountDue`.
    Partial,
    /// Fully paid (rent settled, or deposit now held in escrow).
    Paid,
    /// Read-only projection: a `Pending`/`Partial` invoice past its deadline.
    Overdue,
    /// Security deposit released at finalisation (landlord kept some or all).
    Released,
    /// Security deposit fully returned to the tenant.
    Refunded,
    /// Cancelled before payment.
    Cancelled,
}

/// An invoice (public wire shape).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    /// Invoice id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Escrow U256 invoice id (decimal string); null until bound on-chain.
    pub onchain_invoice_id: Option<String>,
    /// Lease this invoice belongs to.
    #[schema(value_type = Uuid)]
    pub lease_id: Uuid,
    /// Rent or security deposit.
    pub kind: InvoiceKind,
    /// Tenant (buyer) user id.
    #[schema(value_type = Uuid)]
    pub tenant_id: Uuid,
    /// Landlord (recipient) user id.
    #[schema(value_type = Uuid)]
    pub landlord_id: Uuid,
    /// Property this invoice is against (denormalised for filtering).
    #[schema(value_type = Uuid)]
    pub property_id: Uuid,
    /// Total amount due (USDC decimal string).
    pub amount_due: String,
    /// Partial-payment progress (rent only; `"0"` otherwise), USDC decimal string.
    pub rent_paid: String,
    /// Property manager receiving a rent share, if any.
    #[schema(value_type = Option<Uuid>)]
    pub property_manager_id: Option<Uuid>,
    /// Manager rent share in basis points (10000 = 100%).
    pub property_manager_bps: i32,
    /// Effective status (`overdue` derived on read).
    pub status: InvoiceStatus,
    /// Payment deadline (`YYYY-MM-DD`).
    pub deadline: NaiveDate,
    /// Amount kept by the landlord on deposit release (decimal string); null otherwise.
    pub landlord_charge: Option<String>,
    /// Amount returned to the tenant on deposit release (decimal string); null otherwise.
    pub tenant_refund: Option<String>,
    /// Settlement deploy hash; null until paid.
    pub tx_hash: Option<String>,
    /// Receipt URL; null until issued.
    pub receipt_url: Option<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl From<InvoiceRow> for Invoice {
    #[inline]
    fn from(row: InvoiceRow) -> Self {
        let status = row.effective_status();
        Self {
            id: row.id,
            onchain_invoice_id: row.onchain_invoice_id,
            lease_id: row.lease_id,
            kind: row.kind,
            tenant_id: row.tenant_id,
            landlord_id: row.landlord_id,
            property_id: row.property_id,
            amount_due: row.amount_due,
            rent_paid: row.rent_paid,
            property_manager_id: row.property_manager_id,
            property_manager_bps: row.property_manager_bps,
            status,
            deadline: row.deadline,
            landlord_charge: row.landlord_charge,
            tenant_refund: row.tenant_refund,
            tx_hash: row.tx_hash,
            receipt_url: row.receipt_url,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Landlord dashboard aggregates across the landlord's invoices. All money
/// figures are USDC decimal strings.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct LandlordSummary {
    /// Rent received this calendar month.
    pub rent_received_mtd: String,
    /// Rent still due within the current month.
    pub monthly_rent_due: String,
    /// Number of unpaid invoices past their deadline.
    pub overdue_count: i64,
    /// Outstanding balance across overdue invoices.
    pub overdue_amount: String,
    /// Security deposits currently held in escrow.
    pub deposits_held: String,
}

/// Tenant dashboard aggregates. Money figures are USDC decimal strings.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TenantSummary {
    /// The next payable invoice (soonest unpaid by deadline), if any. Boxed so
    /// the heavy `Invoice` does not unbalance the `InvoiceSummary` enum.
    pub next_due: Option<Box<Invoice>>,
    /// Outstanding balance across the tenant's unpaid invoices.
    pub balance_due: String,
    /// Total paid so far this calendar year.
    pub paid_ytd: String,
    /// Security deposit currently held in escrow.
    pub deposit_held: String,
}

/// `GET /invoices/summary` response: the landlord or tenant shape, by scope.
#[derive(Debug, Serialize, ToSchema)]
#[serde(untagged)]
pub enum InvoiceSummary {
    /// Landlord aggregates (`landlordId=me`).
    Landlord(LandlordSummary),
    /// Tenant aggregates (`tenantId=me`).
    Tenant(TenantSummary),
}

/// Which party's summary `GET /invoices/summary` should return.
#[derive(Debug, Clone, Copy)]
pub enum SummaryScope {
    /// The caller as landlord.
    Landlord,
    /// The caller as tenant.
    Tenant,
}

/// Query for `GET /invoices/summary`: exactly one of `tenantId`/`landlordId`
/// must be `me`.
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct SummaryParams {
    /// `me` for the tenant dashboard summary.
    pub tenant_id: Option<String>,
    /// `me` for the landlord dashboard summary.
    pub landlord_id: Option<String>,
}

impl SummaryParams {
    /// Resolves the scope, requiring exactly one of `tenantId`/`landlordId=me`.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when neither or both are set, or when
    /// either is set to anything but `me`.
    #[inline]
    pub fn resolve(&self) -> ApiResult<SummaryScope> {
        match (self.landlord_id.as_deref(), self.tenant_id.as_deref()) {
            (Some("me"), None) => Ok(SummaryScope::Landlord),
            (None, Some("me")) => Ok(SummaryScope::Tenant),
            (Some(_), None) | (None, Some(_)) => Err(ApiError::BadRequest(
                "tenantId/landlordId support only 'me'".to_owned(),
            )),
            _ => Err(ApiError::BadRequest(
                "exactly one of tenantId=me or landlordId=me is required".to_owned(),
            )),
        }
    }
}

/// Tenant settlement of an invoice (Option A): the tenant signed and submitted
/// `pay_invoice` via CSPR.click and reports the result here.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SettlementRequest {
    /// Amount paid by this settlement (USDC decimal string). For rent this is a
    /// partial or full instalment; for a deposit it must equal `amountDue`.
    pub amount: String,
    /// Deploy/tx hash of the on-chain `pay_invoice` call.
    pub tx_hash: String,
}

/// Receipt link for an invoice.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReceiptResponse {
    /// Receipt URL; null until a receipt is issued.
    pub receipt_url: Option<String>,
}

/// Sort key for `GET /invoices`.
#[derive(Debug, Clone, Copy, Default, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub enum InvoiceSort {
    /// By payment deadline (default; soonest first).
    #[default]
    Deadline,
    /// By amount due.
    AmountDue,
    /// By stored status.
    Status,
}

impl InvoiceSort {
    /// The `i`-aliased column this sort orders by.
    #[inline]
    #[must_use]
    pub const fn order_column(self) -> &'static str {
        match self {
            Self::Deadline => "i.deadline",
            Self::AmountDue => "i.amount_due",
            Self::Status => "i.status",
        }
    }
}

/// Query for `GET /invoices`: party scope plus optional filters. `tenantId`/
/// `landlordId` accept only `me`.
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct InvoiceListParams {
    /// `me` to include invoices where the caller is the tenant.
    pub tenant_id: Option<String>,
    /// `me` to include invoices where the caller is the landlord.
    pub landlord_id: Option<String>,
    /// Filter to a single lease.
    #[param(value_type = Option<Uuid>)]
    pub lease_id: Option<Uuid>,
    /// Filter by kind.
    pub kind: Option<InvoiceKind>,
    /// Filter by status (`overdue` matches unpaid past-deadline invoices).
    pub status: Option<InvoiceStatus>,
    /// Filter to a single property.
    #[param(value_type = Option<Uuid>)]
    pub property_id: Option<Uuid>,
    /// Only invoices with `deadline >=` this date (`YYYY-MM-DD`).
    pub due_from: Option<NaiveDate>,
    /// Only invoices with `deadline <=` this date (`YYYY-MM-DD`).
    pub due_to: Option<NaiveDate>,
    /// Sort key (default `deadline`).
    pub sort_by: Option<InvoiceSort>,
}

impl InvoiceListParams {
    /// Validates that `tenantId`/`landlordId`, when present, are `me`.
    ///
    /// The party scope is enforced unconditionally in the query (caller must be
    /// tenant or landlord); these params only document intent for the FE, so the
    /// sole rule is that they may not name another user.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when either is set to anything but `me`.
    #[inline]
    pub fn validate(&self) -> ApiResult<()> {
        for (label, value) in [
            ("tenantId", self.tenant_id.as_deref()),
            ("landlordId", self.landlord_id.as_deref()),
        ] {
            if let Some(raw) = value
                && raw != "me"
            {
                return Err(ApiError::BadRequest(format!("{label} supports only 'me'")));
            }
        }
        Ok(())
    }
}
