//! `PropertyRegistry` contract events.

pub mod property_created;

pub use property_created::PropertyCreated;

use core::str::FromStr;

use crate::{
    backfill::parser::{CesEvent, EventSchema},
    error::{IndexerError, IndexerResult},
};

/// CES binary schemas for all indexed `PropertyRegistry` events.
pub static CES_SCHEMAS: &[EventSchema] = &[<PropertyCreated as CesEvent>::SCHEMA];

/// All possible `PropertyRegistry` contract events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PropertyRegistryEventType {
    /// Emitted when a property is registered on-chain via `create_property`.
    PropertyCreated,
}

impl PropertyRegistryEventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PropertyCreated => "PropertyCreated",
        }
    }
}

impl FromStr for PropertyRegistryEventType {
    type Err = IndexerError;

    #[inline]
    fn from_str(s: &str) -> IndexerResult<Self> {
        match s {
            "PropertyCreated" => Ok(Self::PropertyCreated),
            _ => Err(IndexerError::InvalidEventName(s.to_owned())),
        }
    }
}
