//! Modular event system with trait-based dispatch.
//!
//! Each event type lives in its own module and implements [`IndexableEvent`].
//! The [`EventRegistry`] provides static dispatch to the appropriate handler
//! based on contract type and event name.

pub mod cep18;
pub mod ico;

use serde_json::Value;

use crate::{
    config::ContractType,
    error::{IndexerError, IndexerResult},
    event_trait::{EventContext, IndexableEvent},
};

/// Registry of event handlers for static dispatch.
///
/// Uses compile-time dispatch instead of a `HashMap` to avoid lifetime issues.
#[derive(Debug, Clone, Copy)]
pub struct EventRegistry;

impl EventRegistry {
    /// Create a new event registry with all known event handlers.
    #[must_use]
    #[inline]
    pub const fn new() -> Self {
        Self
    }

    /// Process an event by dispatching to the appropriate handler.
    ///
    /// # Errors
    ///
    /// Returns [`IndexerError::UnknownEvent`] if no handler is registered for
    /// this `(contract_type, event_name)` pair.
    #[inline]
    pub async fn process_event(
        &self,
        ctx: &EventContext<'_>,
        event_name: &str,
        event_data: Value,
    ) -> IndexerResult<()> {
        match (ctx.contract_type, event_name) {
            // ICO events
            (ContractType::Ico, "TokensPurchased") => {
                process_typed_event::<ico::TokensPurchased>(ctx, event_data).await
            }

            // CEP-18 Transfer events (BIG, tUSDC, tUSDT)
            (ContractType::Big | ContractType::Usdc | ContractType::Usdt, "Transfer") => {
                process_typed_event::<cep18::Transfer>(ctx, event_data).await
            }

            // Unknown event
            _ => {
                tracing::warn!(
                    contract = ?ctx.contract_type,
                    event = %event_name,
                    "Unknown event — storing raw data only"
                );
                Err(IndexerError::UnknownEvent {
                    contract_type: ctx.contract_type.as_str().to_owned(),
                    event_name: event_name.to_owned(),
                })
            }
        }
    }
}

impl Default for EventRegistry {
    #[inline]
    fn default() -> Self {
        Self::new()
    }
}

/// Helper to deserialize and process a typed event.
async fn process_typed_event<E>(ctx: &EventContext<'_>, event_data: Value) -> IndexerResult<()>
where
    E: IndexableEvent,
{
    let event: E = serde_json::from_value(event_data)?;
    event.process(ctx).await
}
