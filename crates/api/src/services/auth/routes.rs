//! Router configuration for authentication endpoints.

use std::sync::Arc;

use axum::{
    Router,
    routing::{get, post},
};

use crate::common::AppState;
use crate::services::auth::handlers::{get_nonce, login};

/// Creates the authentication router with nonce and login endpoints.
#[inline]
pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/nonce", get(get_nonce))
        .route("/login", post(login))
}
