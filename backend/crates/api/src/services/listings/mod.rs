//! Listing feature module - the time-bound offer half of the ADR-007
//! two-entity split.
//!
//! A listing is an offer against a [`super::properties`] physical asset,
//! carrying intent, lifecycle state, polymorphic terms, media, and the
//! provenance the authority-to-list gate (D2) drives. This module covers the
//! public read surface (active search + detail); landlord create/update,
//! lifecycle, views, and stats land in later commits.

/// Database operations for listings.
pub mod db;
/// HTTP request handlers for listing endpoints.
pub mod handlers;
/// Request/response models for listing endpoints.
pub mod models;
/// Router configuration for listing endpoints.
pub mod routes;
