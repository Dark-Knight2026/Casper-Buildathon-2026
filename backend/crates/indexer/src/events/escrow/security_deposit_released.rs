//! Handler for the `SecurityDepositReleased` `Escrow` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `Escrow::release_security_deposit` at lease finalisation, when the
/// held deposit is split between the landlord's charge and the tenant's refund.
///
/// Reconciles the off-chain mirror by writing the split and moving the deposit
/// to its terminal state - `refunded` on a full tenant refund, otherwise
/// `released`. Matched by `onchain_invoice_id`. `landlord` and `tenant` are
/// carried for completeness; the off-chain row already knows both parties.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityDepositReleased {
    /// Contract-assigned invoice id (U256 rendered as a decimal string).
    pub invoice_id: String,
    /// Landlord on-chain user id (U256 decimal string).
    pub landlord: String,
    /// Tenant on-chain user id (U256 decimal string).
    pub tenant: String,
    /// Amount kept by the landlord (U256 decimal string).
    pub landlord_charge: String,
    /// Amount returned to the tenant (U256 decimal string).
    pub tenant_refund: String,
}

impl CesEvent for SecurityDepositReleased {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("invoice_id", FieldType::U256),
            ("landlord", FieldType::U256),
            ("tenant", FieldType::U256),
            ("landlord_charge", FieldType::U256),
            ("tenant_refund", FieldType::U256),
        ],
    };
}

impl IndexableEvent for SecurityDepositReleased {
    const EVENT_NAME: &'static str = "SecurityDepositReleased";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::release_security_deposit_by_onchain_id(
            ctx.tx,
            &self.invoice_id,
            &self.landlord_charge,
            &self.tenant_refund,
        )
        .await?
        {
            tracing::info!(
                onchain_invoice_id = %self.invoice_id,
                landlord_charge = %self.landlord_charge,
                tenant_refund = %self.tenant_refund,
                "Released security deposit from on-chain SecurityDepositReleased"
            );
            return Ok(());
        }

        // No held deposit carries this on-chain id (unbound, already released, or
        // never paid). Not an error - skip rather than fail the whole event.
        tracing::warn!(
            onchain_invoice_id = %self.invoice_id,
            "SecurityDepositReleased has no matching held deposit; skipping"
        );
        Ok(())
    }
}
