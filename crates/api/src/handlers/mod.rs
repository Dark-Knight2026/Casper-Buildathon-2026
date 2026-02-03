//! HTTP request handlers for the API.

/// Authentication endpoints (nonce generation, login).
pub mod auth;
/// Business logic endpoints (tax calculation, analytics).
pub mod business;
/// Health check endpoint.
pub mod health;
