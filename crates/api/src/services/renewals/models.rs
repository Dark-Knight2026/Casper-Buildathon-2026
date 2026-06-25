//! Request/response models for the lease-renewal endpoints.
//!
//! `counterOffer` is JSONB passed through as `serde_json::Value` (populated by
//! the tenant's counter in a later commit). Status wire form is hyphenated (FE)
//! while its DB string form is snake_case (CHECK), so serde and strum diverge by
//! design - mirrors [`super::super::leases::models::LeaseStatus`].

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strum::{Display, EnumString};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult},
    services::renewals::db::{NegotiationRow, NewRenewal, RenewalRow},
};

/// Renewal-offer lifecycle status. Stored as `VARCHAR` (CHECK) in the DB
/// (`snake_case`); the wire form is hyphenated (`counter-offer` style).
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "snake_case")]
pub enum RenewalStatus {
    /// Editable draft, not yet sent.
    Draft,
    /// Sent to the tenant; awaiting a response.
    Sent,
    /// Accepted by the tenant.
    Accepted,
    /// Rejected by the tenant.
    Rejected,
    /// Countered by the tenant.
    Countered,
    /// Expired past its response deadline.
    Expired,
}

/// Create-a-renewal-offer payload. The landlord proposes new terms on a lease
/// they own; the offer is created already `sent`.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateRenewalRequest {
    /// Lease this offer renews.
    #[schema(value_type = Uuid)]
    pub lease_id: Uuid,
    /// Proposed new monthly rent.
    pub proposed_rent: f64,
    /// Proposed new term in whole months.
    pub proposed_term_months: i32,
    /// Proposed new start date (`YYYY-MM-DD`).
    pub proposed_start_date: NaiveDate,
    /// Optional reason for a rent increase.
    pub rent_increase_reason: Option<String>,
    /// Optional date by which the tenant must respond (`YYYY-MM-DD`).
    pub response_deadline: Option<NaiveDate>,
}

impl TryFrom<CreateRenewalRequest> for NewRenewal {
    type Error = ApiError;

    /// Validates the payload and maps it into a [`NewRenewal`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] on a negative rent or a non-positive
    /// term (mirrors the `valid_proposed_rent`/`valid_proposed_term` CHECKs).
    #[inline]
    fn try_from(value: CreateRenewalRequest) -> ApiResult<Self> {
        if value.proposed_rent < 0.0 {
            return Err(ApiError::BadRequest(
                "proposedRent must not be negative".to_owned(),
            ));
        }
        if value.proposed_term_months <= 0 {
            return Err(ApiError::BadRequest(
                "proposedTermMonths must be greater than 0".to_owned(),
            ));
        }
        Ok(Self {
            lease_id: value.lease_id,
            proposed_rent: value.proposed_rent,
            proposed_term_months: value.proposed_term_months,
            proposed_start_date: value.proposed_start_date,
            rent_increase_reason: value.rent_increase_reason,
            response_deadline: value.response_deadline,
        })
    }
}

/// Query for `GET /renewals`: scope to the caller as landlord and/or tenant.
/// `tenantId`/`landlordId` accept only `me`.
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct RenewalListParams {
    /// `me` to include renewals where the caller is the tenant.
    pub tenant_id: Option<String>,
    /// `me` to include renewals where the caller is the landlord.
    pub landlord_id: Option<String>,
}

impl RenewalListParams {
    /// Resolves the query into a scope marker (`landlord`/`tenant`/`both`).
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when `tenantId`/`landlordId` is set to
    /// anything other than `me`.
    #[inline]
    pub fn resolve(&self) -> ApiResult<&'static str> {
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
        Ok(
            match (self.landlord_id.is_some(), self.tenant_id.is_some()) {
                (true, false) => "landlord",
                (false, true) => "tenant",
                _ => "both",
            },
        )
    }
}

/// The tenant's decision on a renewal offer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum RenewalDecision {
    /// Accept the offer as proposed.
    Accept,
    /// Reject the offer.
    Reject,
    /// Counter with different terms.
    Counter,
}

/// Tenant counter-offer terms, stored as the `counterOffer` JSONB payload.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CounterOffer {
    /// Counter-proposed monthly rent.
    pub proposed_rent: f64,
    /// Counter-proposed term in whole months.
    pub proposed_term_months: i32,
    /// Optional free-text note.
    pub notes: Option<String>,
}

/// Respond-to-a-renewal payload. The tenant accepts, rejects, or counters.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RespondRenewalRequest {
    /// Accept, reject, or counter.
    pub decision: RenewalDecision,
    /// Counter terms; required when `decision = counter`, ignored otherwise.
    pub counter_offer: Option<CounterOffer>,
}

/// A lease-renewal offer (public wire shape).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Renewal {
    /// Renewal id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Lease this offer renews.
    #[schema(value_type = Uuid)]
    pub lease_id: Uuid,
    /// Landlord (offer author) user id.
    #[schema(value_type = Uuid)]
    pub landlord_id: Uuid,
    /// Tenant (offer recipient) user id.
    #[schema(value_type = Uuid)]
    pub tenant_id: Uuid,
    /// Proposed new monthly rent.
    pub proposed_rent: f64,
    /// Proposed new term in whole months.
    pub proposed_term_months: i32,
    /// Proposed new start date.
    pub proposed_start_date: NaiveDate,
    /// Reason for a rent increase, if given.
    pub rent_increase_reason: Option<String>,
    /// Date by which the tenant must respond, if set.
    pub response_deadline: Option<NaiveDate>,
    /// Lifecycle status.
    pub status: RenewalStatus,
    /// Tenant counter-offer (JSON object); null unless countered.
    #[schema(value_type = Option<Object>)]
    pub counter_offer: Option<Value>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl From<RenewalRow> for Renewal {
    #[inline]
    fn from(row: RenewalRow) -> Self {
        Self {
            id: row.id,
            lease_id: row.lease_id,
            landlord_id: row.landlord_id,
            tenant_id: row.tenant_id,
            proposed_rent: row.proposed_rent,
            proposed_term_months: row.proposed_term_months,
            proposed_start_date: row.proposed_start_date,
            rent_increase_reason: row.rent_increase_reason,
            response_deadline: row.response_deadline,
            status: row.status,
            counter_offer: row.counter_offer.map(|json| json.0),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Kind of negotiation entry. Stored as `VARCHAR` (CHECK) in the DB
/// (`snake_case`); the wire form is hyphenated (`counter-offer`).
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "snake_case")]
pub enum NegotiationKind {
    /// Free-text message.
    Message,
    /// Counter-offer carrying proposed terms.
    CounterOffer,
}

/// Append-to-negotiation payload. A `message` carries `body`; a `counter-offer`
/// carries `proposedTerms`.
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PostNegotiationRequest {
    /// Entry kind.
    pub kind: NegotiationKind,
    /// Free-text body; required when `kind = message`.
    pub body: Option<String>,
    /// Proposed terms; required when `kind = counter-offer`.
    pub proposed_terms: Option<CounterOffer>,
}

/// A single negotiation-thread entry (public wire shape).
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Negotiation {
    /// Entry id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Parent renewal id.
    #[schema(value_type = Uuid)]
    pub renewal_id: Uuid,
    /// Author user id.
    #[schema(value_type = Uuid)]
    pub author_id: Uuid,
    /// Entry kind.
    pub kind: NegotiationKind,
    /// Free-text body, if any.
    pub body: Option<String>,
    /// Proposed terms (JSON object), if any.
    #[schema(value_type = Option<Object>)]
    pub proposed_terms: Option<Value>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
}

impl From<NegotiationRow> for Negotiation {
    #[inline]
    fn from(row: NegotiationRow) -> Self {
        Self {
            id: row.id,
            renewal_id: row.renewal_id,
            author_id: row.author_id,
            kind: row.kind,
            body: row.body,
            proposed_terms: row.proposed_terms.map(|json| json.0),
            created_at: row.created_at,
        }
    }
}
