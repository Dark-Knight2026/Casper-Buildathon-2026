//! Request/response models for the lease-agreement endpoints.
//!
//! `clauses`, `signatureProgress`, and `consentSignatures` are JSONB passed
//! through as `serde_json::Value` (the consent shapes are off-chain proof, see
//! reference §6). Status/type wire forms are hyphenated (FE) while their DB
//! string forms are snake_case (CHECK), so serde and strum diverge by design.

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strum::{Display, EnumString};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult},
    services::leases::db::{LeaseEdit, LeaseRow, NewLease},
};

/// Lease agreement type. Stored as TEXT (CHECK) in the DB (`snake_case`); the
/// wire form is hyphenated.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "snake_case")]
pub enum LeaseType {
    /// Fixed-term lease.
    FixedTerm,
    /// Month-to-month lease.
    MonthToMonth,
    /// Sublease.
    Sublease,
    /// Commercial lease.
    Commercial,
}

/// Lease lifecycle status. Stored as TEXT (CHECK) in the DB (`snake_case`); the
/// wire form is hyphenated (`pending-signatures`, `expiring-soon`, ...).
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "snake_case")]
pub enum LeaseStatus {
    /// Editable draft, nothing on-chain yet.
    Draft,
    /// Sent for signing; awaiting both parties' consent.
    PendingSignatures,
    /// Under review.
    UnderReview,
    /// Awaiting approval.
    PendingApproval,
    /// Committed on-chain and live.
    Active,
    /// Nearing its end date.
    ExpiringSoon,
    /// Past its end date.
    Expired,
    /// Terminated / finalized.
    Terminated,
    /// Renewed (prolonged on-chain).
    Renewed,
}

/// A single agreement clause.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Clause {
    /// Clause title.
    pub title: String,
    /// Clause body text.
    pub content: String,
    /// Clause category (e.g. `rent-payment`).
    pub category: String,
}

/// Links to the generated and signed lease documents.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct DocumentLinks {
    /// Generated (unsigned) PDF URL, if rendered.
    #[serde(rename = "generatedPDF")]
    pub generated_pdf: Option<String>,
    /// Signed PDF URL, if uploaded.
    #[serde(rename = "signedPDF")]
    pub signed_pdf: Option<String>,
}

/// Create-a-lease payload (always a `draft`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateLeaseRequest {
    /// Physical property this lease is against.
    #[schema(value_type = Uuid)]
    pub property_id: Uuid,
    /// Tenant's user id.
    #[schema(value_type = Uuid)]
    pub tenant_id: Uuid,
    /// Lease type.
    #[serde(rename = "type")]
    pub lease_type: LeaseType,
    /// Start date (`YYYY-MM-DD`).
    pub start_date: NaiveDate,
    /// End date (`YYYY-MM-DD`); duration must be a whole number of 30-day months.
    pub end_date: NaiveDate,
    /// Monthly rent (off-chain amount).
    pub monthly_rent: f64,
    /// Security deposit (off-chain amount).
    pub security_deposit: f64,
    /// Settlement currency (`cUSD`, `CSPR`, `USDT`, `USDC`, `USD`).
    pub currency: String,
    /// Optional property manager receiving a rent share.
    #[schema(value_type = Option<Uuid>)]
    pub property_manager_id: Option<Uuid>,
    /// Manager rent share in basis points (10000 = 100%); 0 if no manager.
    pub property_manager_bps: Option<i32>,
    /// Lease-to-own equity-eligible property, if any.
    #[schema(value_type = Option<Uuid>)]
    pub equity_property_id: Option<Uuid>,
    /// Agreement clauses.
    pub clauses: Option<Vec<Clause>>,
}

impl TryFrom<CreateLeaseRequest> for NewLease {
    type Error = ApiError;

    /// Validates the payload and maps it into a [`NewLease`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] on invalid dates/duration, non-positive
    /// rent, an unsupported currency, or an inconsistent manager rent split.
    #[inline]
    fn try_from(value: CreateLeaseRequest) -> ApiResult<Self> {
        if value.end_date <= value.start_date {
            return Err(ApiError::BadRequest(
                "endDate must be after startDate".to_owned(),
            ));
        }
        // Duration must be a whole number of 30-day months (mirrors the on-chain
        // `(end - start) % 2_592_000 == 0` rule, expressed in days here).
        if (value.end_date - value.start_date).num_days() % 30 != 0 {
            return Err(ApiError::BadRequest(
                "lease duration must be a whole number of 30-day months".to_owned(),
            ));
        }
        if value.monthly_rent <= 0.0 {
            return Err(ApiError::BadRequest(
                "monthlyRent must be greater than 0".to_owned(),
            ));
        }
        if value.security_deposit < 0.0 {
            return Err(ApiError::BadRequest(
                "securityDeposit must not be negative".to_owned(),
            ));
        }
        // Keep this set in sync with the `lease_currency_allowed` DB CHECK.
        if !["cUSD", "CSPR", "USD", "USDT", "USDC"].contains(&value.currency.as_str()) {
            return Err(ApiError::BadRequest("unsupported currency".to_owned()));
        }
        let bps = value.property_manager_bps.unwrap_or(0);
        if !(0..=10000).contains(&bps) {
            return Err(ApiError::BadRequest(
                "propertyManagerBps must be between 0 and 10000".to_owned(),
            ));
        }
        if value.property_manager_id.is_none() && bps != 0 {
            return Err(ApiError::BadRequest(
                "propertyManagerBps must be 0 without a property manager".to_owned(),
            ));
        }
        let clauses = serde_json::to_value(value.clauses.unwrap_or_default())
            .unwrap_or_else(|_| Value::Array(Vec::new()));
        Ok(Self {
            property_id: value.property_id,
            primary_tenant_id: value.tenant_id,
            lease_type: value.lease_type.to_string(),
            start_date: value.start_date,
            end_date: value.end_date,
            monthly_rent: value.monthly_rent,
            security_deposit: value.security_deposit,
            currency: value.currency,
            property_manager_id: value.property_manager_id,
            property_manager_bps: bps,
            equity_property_id: value.equity_property_id,
            clauses,
        })
    }
}

/// Edit-a-draft-lease payload. Every field is optional; omitted fields keep
/// their current value (merged against the stored row before validation).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLeaseRequest {
    /// Lease type.
    #[serde(rename = "type")]
    pub lease_type: Option<LeaseType>,
    /// Start date (`YYYY-MM-DD`).
    pub start_date: Option<NaiveDate>,
    /// End date (`YYYY-MM-DD`).
    pub end_date: Option<NaiveDate>,
    /// Monthly rent (off-chain amount).
    pub monthly_rent: Option<f64>,
    /// Security deposit (off-chain amount).
    pub security_deposit: Option<f64>,
    /// Settlement currency.
    pub currency: Option<String>,
    /// Agreement clauses (replaces the existing array when present).
    pub clauses: Option<Vec<Clause>>,
}

impl UpdateLeaseRequest {
    /// Merges the patch onto the current row and validates the result.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when the merged terms are invalid
    /// (duration not a whole number of 30-day months, non-positive rent,
    /// negative deposit, or an unsupported currency).
    #[inline]
    pub fn into_validated(self, current: &LeaseRow) -> ApiResult<LeaseEdit> {
        let start_date = self.start_date.unwrap_or(current.start_date);
        let end_date = self.end_date.unwrap_or(current.end_date);
        if end_date <= start_date {
            return Err(ApiError::BadRequest(
                "endDate must be after startDate".to_owned(),
            ));
        }
        if (end_date - start_date).num_days() % 30 != 0 {
            return Err(ApiError::BadRequest(
                "lease duration must be a whole number of 30-day months".to_owned(),
            ));
        }
        let monthly_rent = self.monthly_rent.unwrap_or(current.monthly_rent);
        if monthly_rent <= 0.0 {
            return Err(ApiError::BadRequest(
                "monthlyRent must be greater than 0".to_owned(),
            ));
        }
        let security_deposit = self.security_deposit.unwrap_or(current.security_deposit);
        if security_deposit < 0.0 {
            return Err(ApiError::BadRequest(
                "securityDeposit must not be negative".to_owned(),
            ));
        }
        let currency = self.currency.or_else(|| current.currency.clone());
        if let Some(code) = &currency {
            // Keep this set in sync with the `lease_currency_allowed` DB CHECK.
            if !["cUSD", "CSPR", "USD", "USDT", "USDC"].contains(&code.as_str()) {
                return Err(ApiError::BadRequest("unsupported currency".to_owned()));
            }
        }
        let clauses = match self.clauses {
            Some(list) => serde_json::to_value(list).unwrap_or_else(|_| Value::Array(Vec::new())),
            None => current.clauses.0.clone(),
        };
        let lease_type = self
            .lease_type
            .map_or_else(|| current.lease_type.clone(), |kind| kind.to_string());
        Ok(LeaseEdit {
            lease_type,
            start_date,
            end_date,
            monthly_rent,
            security_deposit,
            currency,
            clauses,
        })
    }
}

/// The party signing a lease's consent. Its `Display` form (`landlord`/
/// `tenant`) is the JSON key used in the progress/consent objects.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Display)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
pub enum SignerRole {
    /// The landlord.
    Landlord,
    /// A tenant.
    Tenant,
}

/// Off-chain consent submission (reference §6). The wallet signs the canonical
/// lease-consent message; the backend verifies it against the signer's active
/// wallet and stores it as proof of consent.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SignLeaseRequest {
    /// Which party is signing.
    pub role: SignerRole,
    /// Casper-message signature (hex) of the lease-consent message.
    pub signature: String,
    /// Public key/address of the signer; must match the caller's active wallet.
    pub signer_wallet: String,
}

/// Query for `GET /leases`: scope to the caller as landlord and/or tenant,
/// plus an optional status filter. `tenantId`/`landlordId` accept only `me`.
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct LeaseListParams {
    /// `me` to include leases where the caller is a tenant.
    pub tenant_id: Option<String>,
    /// `me` to include leases where the caller is the landlord.
    pub landlord_id: Option<String>,
    /// Optional lifecycle status filter.
    pub status: Option<LeaseStatus>,
}

impl LeaseListParams {
    /// Resolves the query into a scope marker (`landlord`/`tenant`/`both`) and a
    /// DB status string.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when `tenantId`/`landlordId` is set to
    /// anything other than `me`.
    #[inline]
    pub fn resolve(&self) -> ApiResult<(&'static str, Option<String>)> {
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
        let scope = match (self.landlord_id.is_some(), self.tenant_id.is_some()) {
            (true, false) => "landlord",
            (false, true) => "tenant",
            _ => "both",
        };
        Ok((scope, self.status.map(|status| status.to_string())))
    }
}

/// A lease agreement (public wire shape).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Lease {
    /// Lease id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Physical property id.
    #[schema(value_type = Uuid)]
    pub property_id: Uuid,
    /// Landlord user id.
    #[schema(value_type = Uuid)]
    pub landlord_id: Uuid,
    /// Tenant user ids.
    #[schema(value_type = Vec<Uuid>)]
    pub tenant_ids: Vec<Uuid>,
    /// Lease type.
    #[serde(rename = "type")]
    pub lease_type: LeaseType,
    /// Lifecycle status.
    pub status: LeaseStatus,
    /// Start date.
    pub start_date: NaiveDate,
    /// End date.
    pub end_date: NaiveDate,
    /// Monthly rent (off-chain amount).
    pub monthly_rent: f64,
    /// Security deposit (off-chain amount).
    pub security_deposit: f64,
    /// Settlement currency.
    pub currency: Option<String>,
    /// Property manager receiving a rent share, if any.
    #[schema(value_type = Option<Uuid>)]
    pub property_manager_id: Option<Uuid>,
    /// Manager rent share in basis points.
    pub property_manager_bps: i32,
    /// Lease-to-own equity-eligible property, if any.
    #[schema(value_type = Option<Uuid>)]
    pub equity_property_id: Option<Uuid>,
    /// Agreement clauses (JSON array).
    #[schema(value_type = Object)]
    pub clauses: Value,
    /// Signature progress (JSON object: per-party signed flag + timestamp).
    #[schema(value_type = Object)]
    pub signature_progress: Value,
    /// Off-chain consent signatures (JSON object: per-party signature + signedAt).
    #[schema(value_type = Object)]
    pub consent_signatures: Value,
    /// Generated/signed document links.
    pub document_links: DocumentLinks,
    /// SHA-256 of the rendered document; null until generated.
    pub document_hash: Option<String>,
    /// IPFS CID; Phase 0 stub, null for now.
    pub ipfs_cid: Option<String>,
    /// U256 on-chain agreement id (string); null until committed.
    pub onchain_lease_id: Option<String>,
    /// Tenant frozen lease NFT token id; null until committed.
    pub nft_token_id: Option<String>,
    /// Commit tx hash; null until committed.
    pub commit_tx_hash: Option<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl From<LeaseRow> for Lease {
    #[inline]
    fn from(row: LeaseRow) -> Self {
        Self {
            id: row.id,
            property_id: row.property_id,
            landlord_id: row.landlord_id,
            tenant_ids: row.tenant_ids,
            lease_type: LeaseType::from_str(&row.lease_type).unwrap_or(LeaseType::FixedTerm),
            status: LeaseStatus::from_str(&row.status).unwrap_or(LeaseStatus::Draft),
            start_date: row.start_date,
            end_date: row.end_date,
            monthly_rent: row.monthly_rent,
            security_deposit: row.security_deposit,
            currency: row.currency,
            property_manager_id: row.property_manager_id,
            property_manager_bps: row.property_manager_bps,
            equity_property_id: row.equity_property_id,
            clauses: row.clauses.0,
            signature_progress: row.signature_progress.0,
            consent_signatures: row.consent_signatures.0,
            document_links: DocumentLinks {
                generated_pdf: row.lease_document_url,
                signed_pdf: row.signed_document_url,
            },
            document_hash: row.document_hash,
            ipfs_cid: row.ipfs_cid,
            onchain_lease_id: row.onchain_lease_id,
            nft_token_id: row.nft_token_id,
            commit_tx_hash: row.commit_tx_hash,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}
