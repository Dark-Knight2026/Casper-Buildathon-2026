//! Common test utilities.
#![allow(dead_code)]

pub mod redis;
pub mod supabase;

use axum::http::{Method, StatusCode};
use axum_test::http::header::AUTHORIZATION;
use axum_test::{TestResponse, TestServer};
use chrono::{Duration, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use rust_service::config::AppState;
use rust_service::models::{Claims, UserId, UserRole};
use secrecy::SecretString;
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::sync::Arc;

use redis::RedisTestEnv;
use supabase::SupabaseTestEnv;

/// Test environment with server and JWT secret.
pub struct TestEnv {
    pub server: TestServer,
    pub jwt_secret: String,
    _supabase: SupabaseTestEnv,
    _redis: Option<RedisTestEnv>,
}

/// Sets up a test server with isolated databases.
///
/// - PostgreSQL uses a shared container with per-test databases.
/// - Redis is optional: when `with_redis = true`, creates a dedicated container per test.
///
/// Use `with_redis = false` for tests that don't need Redis (faster execution).
/// Use `with_redis = true` for tests that use Redis (health check, nonce, etc.).
pub async fn setup_test_server(with_redis: bool) -> TestEnv {
    let supabase = SupabaseTestEnv::start().await;
    let jwt_secret = "test_jwt_secret_for_integration_tests".to_string();

    let (redis_url, redis_client, redis_env) = if with_redis {
        let env = RedisTestEnv::start().await;
        (env.url.clone(), env.client.clone(), Some(env))
    } else {
        // Fake Redis URL - will fail if actually used
        let url = "redis://127.0.0.1:6379".to_string();
        let client = ::redis::Client::open(url.clone()).expect("Invalid Redis URL");
        (url, client, None)
    };

    let config = rust_service::config::Config {
        database_url: SecretString::from(supabase.database_url.clone()),
        redis_url,
        jwt_secret: SecretString::from(jwt_secret.clone()),
        port: 0,
        cors_origin: "http://localhost:3000".to_string(),
    };

    let state = Arc::new(AppState {
        db: supabase.pool.clone(),
        redis: redis_client,
        config,
    });

    let app = rust_service::handlers::health::router()
        .merge(rust_service::handlers::auth::router())
        .nest("/api/v1", rust_service::handlers::business::router())
        .with_state(state);

    TestEnv {
        server: TestServer::new(app).expect("Failed to create test server"),
        jwt_secret,
        _supabase: supabase,
        _redis: redis_env,
    }
}

/// Creates a test JWT token.
pub fn create_test_jwt(user_id: UserId, role: UserRole, secret: &str) -> String {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("Valid timestamp")
        .timestamp();

    let claims = Claims {
        sub: user_id,
        role,
        exp: expiration as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to create test JWT")
}

/// Makes an authenticated request.
pub async fn authed_request<T: DeserializeOwned>(
    server: &TestServer,
    method: &Method,
    uri: &str,
    token: &str,
    body: &Value,
) -> (StatusCode, Option<T>) {
    let response: TestResponse = match *method {
        Method::GET => {
            server
                .get(uri)
                .add_header(AUTHORIZATION, format!("Bearer {token}"))
                .await
        }
        Method::POST => {
            server
                .post(uri)
                .add_header(AUTHORIZATION, format!("Bearer {token}"))
                .json(&body)
                .await
        }
        Method::PUT => {
            server
                .put(uri)
                .add_header(AUTHORIZATION, format!("Bearer {token}"))
                .json(&body)
                .await
        }
        Method::DELETE => {
            server
                .delete(uri)
                .add_header(AUTHORIZATION, format!("Bearer {token}"))
                .await
        }
        _ => panic!("Unsupported HTTP method: {method}"),
    };

    let status = response.status_code();
    let body_result: Result<T, _> = serde_json::from_slice(response.as_bytes());

    (status, body_result.ok())
}
