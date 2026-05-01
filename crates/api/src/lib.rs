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

#![cfg_attr(not(feature = "enabled"), allow(unused))]

/// Common utilities shared across all feature modules.
#[cfg(feature = "enabled")]
pub mod common;
/// On-chain data modules.
#[cfg(feature = "enabled")]
pub mod onchain;
/// OpenAPI documentation configuration.
#[cfg(feature = "enabled")]
pub mod openapi;
/// Server implementation and startup logic.
#[cfg(feature = "enabled")]
pub mod server;
/// Business logic services.
#[cfg(feature = "enabled")]
pub mod services;

// Re-exports
#[cfg(feature = "enabled")]
pub use common::{
    AppState, Claims, EmailError, EmailMessage, EmailSender, IcoFallback, LoggingEmailSender,
    Pageable, PaginatedResponse, Pagination, PropertyId, RedisStore, ServerConfig, ServerError,
    UserId, UserRole,
};
#[cfg(feature = "enabled")]
pub use openapi::ApiDoc;
#[cfg(feature = "enabled")]
pub use services::auth::AuthUser;
