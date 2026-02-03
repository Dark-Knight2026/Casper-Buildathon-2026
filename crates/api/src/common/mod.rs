//! Common utilities shared across all feature modules.

/// Application configuration and state management.
pub mod config;
/// Cryptographic utilities for signature verification.
pub mod crypto;
/// Error types for the application.
pub mod errors;
/// Shared data models and type definitions.
pub mod models;

pub use config::{AppState, Config};
pub use crypto::{CryptoError, verify_casper_signature};
pub use errors::ServerError;
pub use models::{Claims, PropertyId, UserId, UserRole};
