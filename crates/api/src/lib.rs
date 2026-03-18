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
//! - [`vesting`] - Vesting schedule endpoints
//! - [`common`] - Shared utilities (config, errors, crypto, models)
//! - [`openapi`] - `OpenAPI` documentation configuration
//! - [`server`] - Server startup logic

/// Property analytics feature module.
pub mod analytics;
/// Authentication feature module.
pub mod auth;
/// Common utilities shared across all feature modules.
pub mod common;
/// Health check feature module.
pub mod health;
/// ICO (Initial Coin Offering) feature module.
pub mod ico;
/// OpenAPI documentation configuration.
pub mod openapi;
/// Server implementation and startup logic.
pub mod server;
/// Tax calculation feature module.
pub mod tax;
/// Transaction history feature module.
pub mod transactions;
/// Vesting schedule feature module.
pub mod vesting;

// Re-exports
pub use auth::AuthUser;
pub use common::{
    AppState, Claims, IcoFallback, Pageable, PaginatedResponse, Pagination, PropertyId, RedisStore,
    ServerConfig, ServerError, UserId, UserRole,
};
pub use openapi::ApiDoc;
