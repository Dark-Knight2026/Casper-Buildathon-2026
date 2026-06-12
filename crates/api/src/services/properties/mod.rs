//! Property feature module - the physical-asset half of the ADR-007
//! two-entity split.
//!
//! A property is a deduplicated real-world asset; the time-bound offers
//! against it live in the listings module. Endpoints here cover dedup-aware
//! creation, public detail, and the per-property listing history.

/// Database operations for properties.
pub mod db;
/// HTTP request handlers for property endpoints.
pub mod handlers;
/// Request/response models for property endpoints.
pub mod models;
/// Router configuration for property endpoints.
pub mod routes;
