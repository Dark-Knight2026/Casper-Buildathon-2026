//! Handler for the `InvoicePaid` `Escrow` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `Escrow::pay_invoice` once an invoice's balance is fully cleared -
/// a rent invoice settled in full, or a security deposit now held in escrow
/// custody.
///
/// Settles the off-chain mirror to `paid`, matched by `onchain_invoice_id`. For
/// a deposit this is the held state; its terminal `released`/`refunded` outcome
/// arrives later via `SecurityDepositReleased`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoicePaid {
    /// Contract-assigned invoice id (U256 rendered as a decimal string).
    pub invoice_id: String,
}

impl CesEvent for InvoicePaid {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[("invoice_id", FieldType::U256)],
    };
}

impl IndexableEvent for InvoicePaid {
    const EVENT_NAME: &'static str = "InvoicePaid";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::mark_invoice_paid_by_onchain_id(ctx.tx, &self.invoice_id).await? {
            tracing::info!(
                onchain_invoice_id = %self.invoice_id,
                "Settled invoice from on-chain InvoicePaid"
            );
            return Ok(());
        }

        // No settleable invoice carries this on-chain id (unbound, already paid,
        // or in a terminal state). Not an error - skip rather than fail.
        tracing::warn!(
            onchain_invoice_id = %self.invoice_id,
            "InvoicePaid has no matching pending invoice; skipping"
        );
        Ok(())
    }
}
