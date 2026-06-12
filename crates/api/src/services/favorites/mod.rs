//! Favorites feature module - a tenant's saved listings (ADR-007 downstream).
//!
//! A favorite targets a [`super::listings`] offer, not the bare physical
//! property; `GET /favorites` nests the full listing (which itself nests its
//! property and approved media). Tenant-scoped throughout: every handler
//! self-gates via `RoleUser<TenantRole>` and every query is scoped by the
//! caller's user id.

/// Database operations for favorites.
pub mod db;
/// HTTP request handlers for favorite endpoints.
pub mod handlers;
/// Request/response models for favorite endpoints.
pub mod models;
/// Router configuration for favorite endpoints.
pub mod routes;
