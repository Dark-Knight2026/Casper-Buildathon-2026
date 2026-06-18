//! Handler for the `LeaseAgreementCreated` `Lease` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `Lease::create_lease_agreement` when the landlord records the
/// agreement on-chain.
///
/// This is the canonical signal that flips an off-chain lease to `active`:
/// the backend never sets `active` on its own. Matching is by the U256
/// `lease_agreement_id` the landlord recorded at `/commit` (stored as
/// `leases.onchain_lease_id`), so it races safely with that push path - both
/// are idempotent and the first to arrive wins, with the same result.
///
/// The tenant's frozen lease NFT `token_id` is **not** in this event - the
/// contract holds it inside `LeaseAgreement` and exposes it only via
/// `get_lease_agreement_by_id` (read through `LeaseChainReader` at `/commit`),
/// so this handler leaves `nft_token_id` untouched.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaseAgreementCreated {
    /// Contract-assigned agreement id (U256 rendered as a decimal string).
    pub lease_agreement_id: String,
    /// Block timestamp the contract stamped on creation (unix, from the chain).
    pub created_at: u64,
}

impl CesEvent for LeaseAgreementCreated {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("lease_agreement_id", FieldType::U256),
            ("created_at", FieldType::U64),
        ],
    };
}

impl IndexableEvent for LeaseAgreementCreated {
    const EVENT_NAME: &'static str = "LeaseAgreementCreated";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::set_lease_active_by_onchain_id(ctx.tx, &self.lease_agreement_id).await? {
            tracing::info!(
                onchain_lease_id = %self.lease_agreement_id,
                "Activated lease from on-chain LeaseAgreementCreated"
            );
            return Ok(());
        }

        // No pending lease carries this on-chain id yet: the event reached us
        // before the landlord's `/commit` recorded the binding, or the lease is
        // already active. Not an error - the backend state simply has not caught
        // up, so we skip rather than fail the whole event.
        tracing::warn!(
            onchain_lease_id = %self.lease_agreement_id,
            "LeaseAgreementCreated has no matching pending lease; skipping"
        );
        Ok(())
    }
}
