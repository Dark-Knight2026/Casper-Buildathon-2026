//! Viewings feature module - in-person viewing bookings (ADR-007 downstream).
//!
//! A tenant books a viewing against a [`super::listings`] offer; the landlord
//! confirms or rejects it (`pending -> confirmed/cancelled`), and the tenant may
//! cancel its own booking outright. The booking's `landlord_id` is denormalized
//! from the listing at booking time. `GET /viewings` nests the full listing
//! (which itself nests its property).

/// Database operations for viewings.
pub mod db;
/// HTTP request handlers for viewing endpoints.
pub mod handlers;
/// Request/response models for viewing endpoints.
pub mod models;
/// Router configuration for viewing endpoints.
pub mod routes;
