//! Invoice feature module.
//!
//! An invoice is the unit of settlement on a [`super::leases`] lease - one rent
//! charge or one security deposit - mirroring the on-chain `Escrow::Invoice`.
//! The lease flow seeds the off-chain rows at `/commit` and the indexer
//! reconciles them against on-chain settlement; this layer is read + settle
//! only. This commit covers models, list, and detail; settlement and summaries
//! land in later commits.

/// Database operations for invoices.
pub mod db;
/// HTTP request handlers for invoice endpoints.
pub mod handlers;
/// Request/response models for invoice endpoints.
pub mod models;
/// Router configuration for invoice endpoints.
pub mod routes;
