//! Handler for the `EquityEligibilityGranted` `Lease` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
};

/// Emitted by `Lease::create_lease_agreement` when the agreement carries a
/// lease-to-own `equity_option`, granting the tenant equity eligibility.
///
/// Log-only by design: the event keys on the on-chain `property_id` (U256) and
/// `account` (wallet), neither of which maps to our `UUID`s without a separate
/// registry lookup. The eligibility state is already derivable off-chain - a
/// tenant is eligible exactly when an `active` lease has `equity_property_id`
/// set - so persisting it here would duplicate a fact we already hold. We index
/// the event (vs. letting it fall through as unknown) only to mark it handled
/// and leave an audit trail; it always rides alongside `LeaseAgreementCreated`
/// in the same deploy.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquityEligibilityGranted {
    /// On-chain property id the tenant becomes equity-eligible for (U256 string).
    pub property_id: String,
    /// Tenant account granted eligibility (Casper address as a formatted string).
    pub account: String,
}

impl CesEvent for EquityEligibilityGranted {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("property_id", FieldType::U256),
            ("account", FieldType::Key),
        ],
    };
}

impl IndexableEvent for EquityEligibilityGranted {
    const EVENT_NAME: &'static str = "EquityEligibilityGranted";

    #[inline]
    async fn process(&self, _ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        tracing::info!(
            onchain_property_id = %self.property_id,
            account = %self.account,
            "EquityEligibilityGranted (derived off-chain from equity_property_id; not persisted)"
        );
        Ok(())
    }
}
