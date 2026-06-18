//! `Lease` contract events.
//!
//! `LeaseAgreementProlonged` is indexed log-only: the event carries only a
//! `prolonged_at` timestamp, not the new end date, so `leases.end_date` is not
//! reconciled here (the new term lives in `LeaseAgreement` on-chain, readable
//! only via `get_lease_agreement_by_id`). The handler marks the event handled
//! and logs it; persisting the new term waits for a chain reader.

pub mod equity_eligibility_granted;
pub mod equity_eligibility_revoked;
pub mod lease_agreement_created;
pub mod lease_agreement_finished;
pub mod lease_agreement_prolonged;

pub use equity_eligibility_granted::EquityEligibilityGranted;
pub use equity_eligibility_revoked::EquityEligibilityRevoked;
pub use lease_agreement_created::LeaseAgreementCreated;
pub use lease_agreement_finished::LeaseAgreementFinished;
pub use lease_agreement_prolonged::LeaseAgreementProlonged;

use core::str::FromStr;

use crate::{
    backfill::parser::{CesEvent, EventSchema},
    error::{IndexerError, IndexerResult},
};

/// CES binary schemas for all indexed `Lease` events.
pub static CES_SCHEMAS: &[EventSchema] = &[
    <LeaseAgreementCreated as CesEvent>::SCHEMA,
    <LeaseAgreementFinished as CesEvent>::SCHEMA,
    <LeaseAgreementProlonged as CesEvent>::SCHEMA,
    <EquityEligibilityGranted as CesEvent>::SCHEMA,
    <EquityEligibilityRevoked as CesEvent>::SCHEMA,
];

/// All indexed `Lease` contract events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LeaseEventType {
    /// Emitted when a lease agreement is created on-chain via `create_lease_agreement`.
    LeaseAgreementCreated,
    /// Emitted when a lease agreement is finalised via `finalize_lease_agreement`.
    LeaseAgreementFinished,
    /// Emitted when a lease term is extended via `prolong_lease_agreement`.
    LeaseAgreementProlonged,
    /// Emitted when a lease-to-own agreement grants the tenant equity eligibility.
    EquityEligibilityGranted,
    /// Emitted when a finalised lease-to-own agreement revokes equity eligibility.
    EquityEligibilityRevoked,
}

impl LeaseEventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::LeaseAgreementCreated => "LeaseAgreementCreated",
            Self::LeaseAgreementFinished => "LeaseAgreementFinished",
            Self::LeaseAgreementProlonged => "LeaseAgreementProlonged",
            Self::EquityEligibilityGranted => "EquityEligibilityGranted",
            Self::EquityEligibilityRevoked => "EquityEligibilityRevoked",
        }
    }
}

impl FromStr for LeaseEventType {
    type Err = IndexerError;

    #[inline]
    fn from_str(s: &str) -> IndexerResult<Self> {
        match s {
            "LeaseAgreementCreated" => Ok(Self::LeaseAgreementCreated),
            "LeaseAgreementFinished" => Ok(Self::LeaseAgreementFinished),
            "LeaseAgreementProlonged" => Ok(Self::LeaseAgreementProlonged),
            "EquityEligibilityGranted" => Ok(Self::EquityEligibilityGranted),
            "EquityEligibilityRevoked" => Ok(Self::EquityEligibilityRevoked),
            _ => Err(IndexerError::InvalidEventName(s.to_owned())),
        }
    }
}
