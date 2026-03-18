//! `LeaseFi` Backend API
//!
//! This crate provides the backend API for the `LeaseFi` platform,
//! including authentication, business logic handlers, and health checks.
//!
//! # Module Structure
//!
//! - [`services`] - Business logic: auth, tax, analytics, health
//! - [`onchain`] - On-chain data: ICO, staking, transactions, vesting
//! - [`common`] - Shared utilities (config, errors, crypto, models)
//! - [`openapi`] - `OpenAPI` documentation configuration
//! - [`server`] - Server startup logic

/// Common utilities shared across all feature modules.
pub mod common;
/// On-chain data modules.
pub mod onchain;
/// OpenAPI documentation configuration.
pub mod openapi;
/// Server implementation and startup logic.
pub mod server;
/// Business logic services.
pub mod services;

// Re-exports
pub use common::{
    AppState, Claims, IcoFallback, Pageable, PaginatedResponse, Pagination, PropertyId, RedisStore,
    ServerConfig, ServerError, UserId, UserRole,
};
pub use openapi::ApiDoc;
pub use services::auth::AuthUser;
