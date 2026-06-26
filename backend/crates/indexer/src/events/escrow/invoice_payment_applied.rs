//! Handler for the `InvoicePaymentApplied` `Escrow` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `Escrow::pay_invoice` for a rent invoice when a (possibly partial)
/// payment is distributed - landlord net of protocol fee and any
/// property-manager share.
///
/// Reconciles the off-chain mirror by writing the contract's cumulative
/// `rent_paid` and moving the invoice to `partial`. Matched by
/// `onchain_invoice_id` (bound earlier by `InvoiceCreated`). `payer`, `amount`,
/// and `protocol_fee` are carried for completeness but the off-chain status is
/// driven by `rent_paid` against `amount_due`; a following `InvoicePaid` settles
/// it when the balance clears.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoicePaymentApplied {
    /// Contract-assigned invoice id (U256 rendered as a decimal string).
    pub invoice_id: String,
    /// Tenant on-chain user id that paid (U256 decimal string).
    pub payer: String,
    /// Amount applied by this payment (U256 decimal string).
    pub amount: String,
    /// Protocol fee routed to the Treasury (U256 decimal string).
    pub protocol_fee: String,
    /// Cumulative amount paid against the invoice so far (U256 decimal string).
    pub rent_paid: String,
}

impl CesEvent for InvoicePaymentApplied {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("invoice_id", FieldType::U256),
            ("payer", FieldType::U256),
            ("amount", FieldType::U256),
            ("protocol_fee", FieldType::U256),
            ("rent_paid", FieldType::U256),
        ],
    };
}

impl IndexableEvent for InvoicePaymentApplied {
    const EVENT_NAME: &'static str = "InvoicePaymentApplied";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::apply_invoice_payment_by_onchain_id(ctx.tx, &self.invoice_id, &self.rent_paid)
            .await?
        {
            tracing::info!(
                onchain_invoice_id = %self.invoice_id,
                rent_paid = %self.rent_paid,
                "Applied invoice payment from on-chain InvoicePaymentApplied"
            );
            return Ok(());
        }

        // No settleable invoice carries this on-chain id (unbound, already
        // released/refunded, or cancelled). Not an error - skip rather than fail.
        tracing::warn!(
            onchain_invoice_id = %self.invoice_id,
            "InvoicePaymentApplied has no matching pending invoice; skipping"
        );
        Ok(())
    }
}
