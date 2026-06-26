//! Lease-renewal feature module.
//!
//! A renewal is a landlord-authored offer to extend an existing
//! [`super::leases`] agreement on new terms; the tenant accepts, rejects, or
//! counters. The backend owns the off-chain negotiation; on acceptance the
//! landlord runs `prolong_lease_agreement` on-chain and the indexer reflects the
//! new end date. This commit covers models plus create, list, and detail;
//! respond and negotiation history land in later commits.

/// Database operations for renewals.
pub mod db;
/// HTTP request handlers for renewal endpoints.
pub mod handlers;
/// Request/response models for renewal endpoints.
pub mod models;
/// Router configuration for renewal endpoints.
pub mod routes;
