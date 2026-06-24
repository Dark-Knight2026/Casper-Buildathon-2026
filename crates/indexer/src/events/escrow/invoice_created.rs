//! Handler for the `InvoiceCreated` `Escrow` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `Escrow::create_invoice` each time the `Lease` contract mints an
/// invoice inside `create_lease_agreement` (one security deposit, then one per
/// rent month).
///
/// Binds the contract-assigned `invoice_id` to the next unmatched off-chain
/// invoice mirror of the lease behind this deploy. The lease is found by
/// `commit_tx_hash = ctx.deploy_hash` - the same deploy carries
/// `LeaseAgreementCreated` - so the indexer never reads the chain to learn the
/// id. The event payload carries no lease reference, no kind, and no amount: the
/// off-chain mirror seeded at `/commit` holds those, and binding is positional
/// in arrival order (deposit first, then rent by ascending deadline).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceCreated {
    /// Contract-assigned invoice id (U256 rendered as a decimal string).
    pub invoice_id: String,
    /// Block timestamp the contract stamped on creation (unix, from the chain).
    pub created_at: u64,
}

impl CesEvent for InvoiceCreated {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("invoice_id", FieldType::U256),
            ("created_at", FieldType::U64),
        ],
    };
}

impl IndexableEvent for InvoiceCreated {
    const EVENT_NAME: &'static str = "InvoiceCreated";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::bind_invoice_onchain_id_by_commit_tx_hash(ctx.tx, ctx.deploy_hash, &self.invoice_id)
            .await?
        {
            tracing::info!(
                deploy_hash = %ctx.deploy_hash,
                onchain_invoice_id = %self.invoice_id,
                "Bound invoice from on-chain InvoiceCreated"
            );
            return Ok(());
        }

        // No unbound scheduled invoice for this deploy: the event arrived before
        // the landlord's `/commit` seeded the mirrors, or every invoice of the
        // lease is already bound. Not an error - skip rather than fail the event.
        tracing::warn!(
            deploy_hash = %ctx.deploy_hash,
            onchain_invoice_id = %self.invoice_id,
            "InvoiceCreated has no matching unbound invoice; skipping"
        );
        Ok(())
    }
}
