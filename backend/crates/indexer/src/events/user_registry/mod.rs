//! `UserRegistry` contract events.

pub mod user_created;

pub use user_created::UserCreated;

use core::str::FromStr;

use crate::{
    backfill::parser::{CesEvent, EventSchema},
    error::{IndexerError, IndexerResult},
};

/// CES binary schemas for all indexed `UserRegistry` events.
pub static CES_SCHEMAS: &[EventSchema] = &[<UserCreated as CesEvent>::SCHEMA];

/// All possible `UserRegistry` contract events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UserRegistryEventType {
    /// Emitted when a user is registered on-chain via `create_user`.
    UserCreated,
}

impl UserRegistryEventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::UserCreated => "UserCreated",
        }
    }
}

impl FromStr for UserRegistryEventType {
    type Err = IndexerError;

    #[inline]
    fn from_str(s: &str) -> IndexerResult<Self> {
        match s {
            "UserCreated" => Ok(Self::UserCreated),
            _ => Err(IndexerError::InvalidEventName(s.to_owned())),
        }
    }
}
