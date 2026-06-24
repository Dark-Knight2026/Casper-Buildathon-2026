//! `Escrow` contract events.
//!
//! The escrow holds rent and security-deposit invoices minted by the `Lease`
//! contract. `InvoiceCreated` binds each contract-assigned invoice id to the
//! off-chain mirror seeded at `/commit`; payment and release events reconcile
//! the mirror against on-chain settlement.

pub mod invoice_created;

pub use invoice_created::InvoiceCreated;

use core::str::FromStr;

use crate::{
    backfill::parser::{CesEvent, EventSchema},
    error::{IndexerError, IndexerResult},
};

/// CES binary schemas for all indexed `Escrow` events.
pub static CES_SCHEMAS: &[EventSchema] = &[<InvoiceCreated as CesEvent>::SCHEMA];

/// All indexed `Escrow` contract events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EscrowEventType {
    /// Emitted when the `Lease` contract mints an invoice via `Escrow::create_invoice`.
    InvoiceCreated,
}

impl EscrowEventType {
    /// Returns the CES event name for this variant.
    #[inline]
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::InvoiceCreated => "InvoiceCreated",
        }
    }
}

impl FromStr for EscrowEventType {
    type Err = IndexerError;

    #[inline]
    fn from_str(s: &str) -> IndexerResult<Self> {
        match s {
            "InvoiceCreated" => Ok(Self::InvoiceCreated),
            _ => Err(IndexerError::InvalidEventName(s.to_owned())),
        }
    }
}
