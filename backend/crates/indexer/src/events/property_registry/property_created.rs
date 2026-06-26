//! Handler for the `PropertyCreated` `PropertyRegistry` contract event.

use serde::{Deserialize, Serialize};

use crate::{
    backfill::parser::{CesEvent, EventSchema, FieldType},
    error::IndexerResult,
    event_trait::{EventContext, IndexableEvent},
    events::db,
};

/// Emitted by `PropertyRegistry::create_property` when a property is registered
/// on-chain.
///
/// Reconciles the new on-chain record back to the backend `properties` row it
/// belongs to and marks it tokenized. Matching is by `metadata_uri`: the
/// backend pins the property metadata to `ipfs://{cid}`, the frontend passes
/// that exact string into `create_property`, and the contract echoes it on the
/// event - the one key shared by both sides (the event carries no backend id).
///
/// The contract-assigned `property_id` is stored as `properties.nft_token_id`.
/// The event's `issuer` (on-chain `user_id`) and `total_supply` are deliberately
/// left out of this struct: `issuer` only identifies the landlord, not the
/// specific property, and `total_supply` is a `U256` that need not fit the
/// `BIGINT` column. They remain in [`Self::SCHEMA`] regardless, because the CES
/// binary parser reads fields in order and must step over them to reach
/// `metadata_uri`; `serde` then ignores them on the JSON path.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropertyCreated {
    /// Contract-assigned property id (U256 rendered as a decimal string).
    pub property_id: String,
    /// Metadata pointer (`ipfs://{cid}`) the backend pinned; the match key.
    pub metadata_uri: String,
}

impl CesEvent for PropertyCreated {
    const SCHEMA: EventSchema = EventSchema {
        name: Self::EVENT_NAME,
        fields: &[
            ("property_id", FieldType::U256),
            ("issuer", FieldType::U256),
            ("total_supply", FieldType::U256),
            ("metadata_uri", FieldType::String),
        ],
    };
}

impl IndexableEvent for PropertyCreated {
    const EVENT_NAME: &'static str = "PropertyCreated";

    #[inline]
    async fn process(&self, ctx: &mut EventContext<'_>) -> IndexerResult<()> {
        if db::set_property_tokenized(ctx.tx, &self.metadata_uri, &self.property_id).await? {
            tracing::info!(
                onchain_property_id = %self.property_id,
                metadata_uri = %self.metadata_uri,
                "Linked on-chain property to backend row"
            );
            return Ok(());
        }

        // Not an error: the backend row may not exist yet (the event arrived
        // before its metadata was pinned) or it was already reconciled. The
        // backend state simply has not caught up, so skip rather than fail.
        tracing::warn!(
            onchain_property_id = %self.property_id,
            metadata_uri = %self.metadata_uri,
            "PropertyCreated has no matching untokenized property; skipping"
        );
        Ok(())
    }
}
