//! Handler for the `EquityEligibilityRevoked` `Lease` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
};

/// Emitted by `Lease::finalize_lease_agreement` when a lease-to-own agreement is
/// finalised, revoking the tenant's equity eligibility.
///
/// Log-only by design, the mirror of [`EquityEligibilityGranted`]: the event
/// keys on the on-chain `property_id` (U256) and `account` (wallet), which do
/// not map to our `UUID`s, and the eligibility state is already derivable from
/// the lease moving to `terminated`. We index it to mark it handled and leave an
/// audit trail; it always rides alongside `LeaseAgreementFinished` in the same
/// deploy.
///
/// [`EquityEligibilityGranted`]: super::EquityEligibilityGranted
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquityEligibilityRevoked {
    /// On-chain property id the tenant loses equity eligibility for (U256 string).
    pub property_id: String,
    /// Tenant account whose eligibility is revoked (Casper address as a string).
    pub account: String,
}

impl CesEvent for EquityEligibilityRevoked {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("property_id", FieldType::U256),
            ("account", FieldType::Key),
        ],
    };
}

impl IndexableEvent for EquityEligibilityRevoked {
    const EVENT_NAME: &'static str = "EquityEligibilityRevoked";

    #[inline]
    async fn process(&self, _ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        tracing::info!(
            onchain_property_id = %self.property_id,
            account = %self.account,
            "EquityEligibilityRevoked (derived off-chain from lease termination; not persisted)"
        );
        Ok(())
    }
}
