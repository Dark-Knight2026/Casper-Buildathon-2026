//! Handler for the `LeaseAgreementFinished` `Lease` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `Lease::finalize_lease_agreement` once the lease has ended, all
/// invoices are paid, and the security deposit is released on-chain.
///
/// Mirrors the on-chain finalisation back to the off-chain lease by moving it
/// to `terminated`. Matched by the U256 `lease_agreement_id`
/// (`leases.onchain_lease_id`) and idempotent: a lease already terminated, or
/// one that never reached `active`, is left untouched.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseAgreementFinished {
    /// Contract-assigned agreement id (U256 rendered as a decimal string).
    pub lease_agreement_id: String,
    /// Block timestamp the contract stamped on finalisation (unix, from the chain).
    pub finished_at: u64,
}

impl CesEvent for LeaseAgreementFinished {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("lease_agreement_id", FieldType::U256),
            ("finished_at", FieldType::U64),
        ],
    };
}

impl IndexableEvent for LeaseAgreementFinished {
    const EVENT_NAME: &'static str = "LeaseAgreementFinished";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::set_lease_terminated_by_onchain_id(ctx.tx, &self.lease_agreement_id).await? {
            tracing::info!(
                onchain_lease_id = %self.lease_agreement_id,
                "Terminated lease from on-chain LeaseAgreementFinished"
            );
            return Ok(());
        }

        // No active lease carries this on-chain id (already terminated, never
        // activated, or unbound). Not an error - skip rather than fail.
        tracing::warn!(
            onchain_lease_id = %self.lease_agreement_id,
            "LeaseAgreementFinished has no matching active lease; skipping"
        );
        Ok(())
    }
}
