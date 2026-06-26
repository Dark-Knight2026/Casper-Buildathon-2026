//! Lease-agreement feature module.
//!
//! A lease is the off-chain agreement between a landlord and one or more
//! tenants over a [`super::properties`] physical asset. The backend owns the
//! off-chain layer (draft, clauses, consent signatures, documents) and records
//! the one-time off->on transition at `/commit`. This commit covers models plus
//! create-draft and detail; list, edit, signing, and commit land in later
//! commits.

/// Database operations for leases.
pub mod db;
/// HTTP request handlers for lease endpoints.
pub mod handlers;
/// Request/response models for lease endpoints.
pub mod models;
/// Router configuration for lease endpoints.
pub mod routes;
