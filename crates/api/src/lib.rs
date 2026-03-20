//! `LeaseFi` Backend API
//!
//! This crate provides the backend API for the `LeaseFi` platform,
//! including authentication, business logic handlers, and health checks.
//!
//! # Module Structure
//!
//! The crate is organized using a feature-based architecture:
//!
//! - [`auth`] - Authentication (nonce generation, login, JWT middleware)
//! - [`tax`] - Tax calculation endpoints
//! - [`analytics`] - Property performance analytics
//! - [`health`] - Health check endpoint
//! - [`common`] - Shared utilities (config, errors, crypto, models)
//! - [`openapi`] - `OpenAPI` documentation configuration
//! - [`server`] - Server startup logic

#![cfg_attr(not(feature = "enabled"), allow(unused))]

/// Property analytics feature module.
#[cfg(feature = "enabled")]
pub mod analytics;
/// Authentication feature module.
#[cfg(feature = "enabled")]
pub mod auth;
/// Common utilities shared across all feature modules.
#[cfg(feature = "enabled")]
pub mod common;
/// Health check feature module.
#[cfg(feature = "enabled")]
pub mod health;
/// ICO (Initial Coin Offering) feature module.
#[cfg(feature = "enabled")]
pub mod ico;
/// OpenAPI documentation configuration.
#[cfg(feature = "enabled")]
pub mod openapi;
/// Server implementation and startup logic.
#[cfg(feature = "enabled")]
pub mod server;
/// Tax calculation feature module.
#[cfg(feature = "enabled")]
pub mod tax;
/// Transaction history feature module.
#[cfg(feature = "enabled")]
pub mod transactions;

// Re-exports
#[cfg(feature = "enabled")]
pub use auth::AuthUser;
#[cfg(feature = "enabled")]
pub use common::{
    AppState, Claims, IcoFallback, Pageable, PaginatedResponse, Pagination, PropertyId, RedisStore,
    ServerConfig, ServerError, UserId, UserRole,
};
#[cfg(feature = "enabled")]
pub use openapi::ApiDoc;
