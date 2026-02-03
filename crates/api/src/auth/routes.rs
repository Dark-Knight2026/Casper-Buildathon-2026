//! Router configuration for authentication endpoints.

use crate::auth::handlers::{get_nonce, login};
use crate::common::AppState;
use axum::{
    Router,
    routing::{get, post},
};
use std::sync::Arc;

/// Creates the authentication router with nonce and login endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/nonce", get(get_nonce))
        .route("/login", post(login))
}
