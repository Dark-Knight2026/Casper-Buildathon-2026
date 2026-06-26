//! Handler for the `LeaseAgreementProlonged` `Lease` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
};

/// Emitted by `Lease::prolong_lease_agreement` when a lease term is extended.
///
/// Log-only for now: the event carries only `prolonged_at`, not the new end
/// date, so `leases.end_date` cannot be reconciled from the event alone - the
/// new term lives in `LeaseAgreement` on-chain and is readable only via
/// `get_lease_agreement_by_id` (RPC). We index it to mark it handled and leave
/// an audit trail; persisting the new end date waits for a chain reader.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseAgreementProlonged {
    /// Contract-assigned agreement id (U256 rendered as a decimal string).
    pub lease_agreement_id: String,
    /// Block timestamp the contract stamped on prolongation (unix, from the chain).
    pub prolonged_at: u64,
}

impl CesEvent for LeaseAgreementProlonged {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("lease_agreement_id", FieldType::U256),
            ("prolonged_at", FieldType::U64),
        ],
    };
}

impl IndexableEvent for LeaseAgreementProlonged {
    const EVENT_NAME: &'static str = "LeaseAgreementProlonged";

    #[inline]
    async fn process(&self, _ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        tracing::info!(
            onchain_lease_id = %self.lease_agreement_id,
            "LeaseAgreementProlonged (end_date not reconciled - needs get_lease_agreement_by_id RPC)"
        );
        Ok(())
    }
}
