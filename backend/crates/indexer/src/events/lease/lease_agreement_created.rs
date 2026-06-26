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
/// This is the canonical signal that flips an off-chain lease to `active`.
/// Matching is by `ctx.deploy_hash`, which equals the `commitTxHash` the
/// landlord pushed to `/commit` before broadcasting the deploy. On match the
/// handler also stamps `onchain_lease_id` so the later `LeaseAgreementFinished`
/// handler can find the lease by on-chain id.
///
/// The tenant's frozen lease NFT `token_id` is **not** in this event - the
/// contract holds it inside `LeaseAgreement` and exposes it only via
/// `get_lease_agreement_by_id`, so this handler leaves `nft_token_id` untouched.
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
        if db::activate_lease_by_commit_tx_hash(ctx.tx, ctx.deploy_hash, &self.lease_agreement_id)
            .await?
        {
            tracing::info!(
                deploy_hash = %ctx.deploy_hash,
                onchain_lease_id = %self.lease_agreement_id,
                "Activated lease from on-chain LeaseAgreementCreated"
            );
            return Ok(());
        }

        // No pending lease with this commit_tx_hash: the event arrived before
        // the landlord's `/commit` recorded the deploy hash, or the lease is
        // already active. Not an error - skip rather than fail the whole event.
        tracing::warn!(
            deploy_hash = %ctx.deploy_hash,
            onchain_lease_id = %self.lease_agreement_id,
            "LeaseAgreementCreated has no matching pending lease; skipping"
        );
        Ok(())
    }
}
