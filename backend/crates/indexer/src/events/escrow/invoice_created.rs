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
/// invoice mirror of its lease. The lease is found directly by
/// `onchain_lease_id = lease_id` (carried in the event), so binding no longer
/// depends on the deploy hash and works identically for streamed and backfilled
/// events. Within the lease the next still-unbound `scheduled` invoice is taken
/// in the contract's creation order (deposit first, then rent by ascending
/// deadline) - the event carries no kind or amount, those live on the off-chain
/// mirror.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceCreated {
    /// Contract-assigned invoice id (U256 rendered as a decimal string).
    pub invoice_id: String,
    /// Block timestamp the contract stamped on creation (unix, from the chain).
    pub created_at: u64,
    /// On-chain id of the lease this invoice belongs to (U256 as a decimal
    /// string). Equals `LeaseAgreementCreated.lease_agreement_id` and the
    /// off-chain `leases.onchain_lease_id`.
    pub lease_id: String,
}

impl CesEvent for InvoiceCreated {
    // Field order must match the contract's `InvoiceCreated` declaration: the
    // CES backfill parser reads the raw blob positionally. The contract emits
    // `lease_id` last, after `created_at`.
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("invoice_id", FieldType::U256),
            ("created_at", FieldType::U64),
            ("lease_id", FieldType::U256),
        ],
    };
}

impl IndexableEvent for InvoiceCreated {
    const EVENT_NAME: &'static str = "InvoiceCreated";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::bind_invoice_onchain_id_by_lease_id(ctx.tx, &self.lease_id, &self.invoice_id).await?
        {
            tracing::info!(
                onchain_lease_id = %self.lease_id,
                onchain_invoice_id = %self.invoice_id,
                "Bound invoice from on-chain InvoiceCreated"
            );
            return Ok(());
        }

        // No unbound scheduled invoice for this lease: the event arrived before
        // `/commit` seeded the mirror (reconciled there instead), or every invoice
        // of the lease is already bound. Not an error - skip rather than fail.
        tracing::warn!(
            onchain_lease_id = %self.lease_id,
            onchain_invoice_id = %self.invoice_id,
            "InvoiceCreated has no matching unbound invoice; skipping"
        );
        Ok(())
    }
}
