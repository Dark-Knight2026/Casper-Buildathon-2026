//! Common test utilities.
//!
//! ## Database strategy
//!
//! - **`PostgreSQL`**: Single container via docker-compose, isolated DBs via `#[sqlx::test]`
//! - **Redis**: Testcontainers per test (needs full isolation for nonce storage)
//!
//! Alternatives considered:
//! - Testcontainers for both — slower (~10s per test for PG startup)
//! - Shared Redis — breaks parallel test isolation

#![allow(dead_code)]
#![allow(clippy::missing_panics_doc)]
#![allow(clippy::must_use_candidate)]

use std::sync::Arc;

use axum::http::{Method, StatusCode};
use axum_test::{
    TestResponse, TestServer, TestServerConfig, Transport, http::header::AUTHORIZATION,
};
use chrono::{Duration, Utc};
use core::net::SocketAddr;
use jsonwebtoken::{EncodingKey, Header, encode};
use secrecy::SecretString;
use serde::de::DeserializeOwned;
use serde_json::Value;
use sqlx::PgPool;
use testcontainers::{
    ContainerAsync, GenericImage,
    core::{IntoContainerPort, WaitFor},
    runners::AsyncRunner,
};

use api::{AppState, Claims, Config, UserId, UserRole, common::RedisStore, server};

/// Test database URL for docker-compose `PostgreSQL`.
pub const TEST_DATABASE_URL: &str = "postgres://postgres:postgres@127.0.0.1:5433/postgres";

/// CORS origin used in test server configuration.
pub const TEST_CORS_ORIGIN: &str = "http://localhost:8080";

/// Holds a running Redis container and client.
/// Container stays alive as long as this struct exists.
pub struct RedisTestEnv {
    /// Redis client for test connections.
    pub client: redis::Client,
    /// Redis connection URL.
    pub url: String,
    _container: ContainerAsync<GenericImage>,
}

impl core::fmt::Debug for RedisTestEnv {
    #[inline]
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.debug_struct("RedisTestEnv")
            .field("client", &"redis::Client")
            .field("url", &self.url)
            .finish_non_exhaustive()
    }
}

impl RedisTestEnv {
    /// Starts a Redis container and returns the environment.
    #[inline]
    pub async fn start() -> Self {
        let image = GenericImage::new("redis", "7-alpine")
            .with_exposed_port(6379.tcp())
            .with_wait_for(WaitFor::message_on_stdout("Ready to accept connections"));

        let container = image.start().await.expect("Failed to start Redis");
        let port = container
            .get_host_port_ipv4(6379)
            .await
            .expect("Failed to get Redis port");

        let url = format!("redis://127.0.0.1:{port}");
        let client = redis::Client::open(url.clone()).expect("Invalid Redis URL");

        Self {
            client,
            url,
            _container: container,
        }
    }
}

/// Test environment with server and JWT secret.
#[derive(Debug)]
pub struct TestEnv {
    /// Test server instance.
    pub server: TestServer,
    /// JWT secret used for token generation.
    pub jwt_secret: String,
    _redis: Option<RedisTestEnv>,
}

/// Creates a test server using a pool from `#[sqlx::test]`.
///
/// - `PostgreSQL` pool comes from `#[sqlx::test]` (isolated per test).
/// - Redis is optional: when `with_redis = true`, creates a dedicated container.
#[inline]
pub async fn setup_test_server(pool: PgPool, with_redis: bool) -> TestEnv {
    let (redis_url, redis_client, redis_env) = if with_redis {
        let env = RedisTestEnv::start().await;
        (env.url.clone(), env.client.clone(), Some(env))
    } else {
        // Fake Redis URL - will fail if actually used
        let url = "redis://127.0.0.1:6379".to_owned();
        let client = redis::Client::open(url.clone()).expect("Invalid Redis URL");
        (url, client, None)
    };

    let jwt_secret = "test_jwt_secret_for_integration_tests".to_owned();
    let config = Config {
        database_url: SecretString::from(TEST_DATABASE_URL),
        redis_url,
        jwt_secret: SecretString::from(jwt_secret.clone()),
        port: 0,
        cors_origin: TEST_CORS_ORIGIN.to_owned(),
    };
    let state = Arc::new(AppState {
        db: pool,
        redis: RedisStore::new(redis_client),
        config,
    });

    // Use real HTTP transport so ConnectInfo works for rate limiting (GovernorLayer).
    // create_app applies production middleware (CORS, tracing, body limit).
    let app = server::create_app(state)
        .expect("Failed to build app")
        .into_make_service_with_connect_info::<SocketAddr>();
    let config = TestServerConfig {
        transport: Some(Transport::HttpRandomPort),
        ..TestServerConfig::default()
    };

    TestEnv {
        server: TestServer::new_with_config(app, config).expect("Failed to create test server"),
        jwt_secret,
        _redis: redis_env,
    }
}

/// Creates a test JWT token.
#[inline]
pub fn create_test_jwt(user_id: UserId, role: UserRole, secret: &str) -> String {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("Valid timestamp")
        .timestamp();
    let exp = usize::try_from(expiration.max(0)).expect("Valid expiration timestamp");
    let claims = Claims {
        sub: user_id,
        role,
        exp,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to create test JWT")
}

/// Makes an authenticated request.
#[inline]
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
