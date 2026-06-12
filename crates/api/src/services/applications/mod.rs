//! Rental-applications feature module (ADR-007 downstream).
//!
//! A tenant submits an application against a [`super::listings`] offer; the
//! landlord reviews it (`pending -> approved/rejected`). The application's
//! `landlord_id` is denormalized from the listing at submit time, so a review
//! authorizes on a local predicate rather than a join back to the listing.
//! `GET /applications` nests the full listing (which itself nests its property).

/// Database operations for rental applications.
pub mod db;
/// HTTP request handlers for rental-application endpoints.
pub mod handlers;
/// Request/response models for rental-application endpoints.
pub mod models;
/// Router configuration for rental-application endpoints.
pub mod routes;
