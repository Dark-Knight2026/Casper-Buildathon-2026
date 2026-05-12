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

use core::fmt::{Debug, Formatter, Result as FmtResult};
use std::sync::Arc;

use axum::http::{Method, StatusCode};
use axum_test::{TestServer, TestServerConfig, Transport, http::header::COOKIE};
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use chrono::{Duration, Utc};
use core::net::SocketAddr;
use jsonwebtoken::{EncodingKey, Header, encode};
use rand::Rng;
use secrecy::SecretString;
use serde::de::DeserializeOwned;
use serde_json::Value;
use sqlx::{PgPool, migrate::Migrator};
use testcontainers::{
    ContainerAsync, GenericImage,
    core::{IntoContainerPort, WaitFor},
    runners::AsyncRunner,
};
use uuid::Uuid;

use api::{
    AppState, Claims, IcoFallback, LoggingEmailSender, ServerConfig, UserId, UserRole,
    common::{
        CASPER_MESSAGE_PREFIX, JWT_AUDIENCE, JWT_ISSUER, RedisStore, TOTAL_SUPPLY, TokenType,
        VerificationLevel,
    },
    providers::{EmailSender, MediaStorage, StubMediaStorage},
    server,
};

/// Embedded migrations for `#[sqlx::test(migrator = "common::MIGRATIONS")]`.
pub static MIGRATIONS: Migrator = sqlx::migrate!("../../supabase/migrations");

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
    /// Keeps the container alive for the duration of the test.
    _container: ContainerAsync<GenericImage>,
}

impl Debug for RedisTestEnv {
    #[inline]
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
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
    /// Redis environment (keeps container alive, provides client for assertions).
    pub redis: Option<RedisTestEnv>,
    /// Shared application state. Exposed for tests that need to call
    /// extractors (e.g. `AuthUser::from_request_parts`) directly rather
    /// than through the HTTP surface.
    pub state: Arc<AppState>,
}

/// Optional overrides for test server configuration.
#[derive(Default)]
pub struct TestOverrides {
    /// BIG token contract hash (enables `/transactions/token/big`).
    pub contract_big: Option<String>,
    /// ICO fallback config (used when `ico_schedules` table is empty).
    pub ico_fallback: Option<IcoFallback>,
    /// Custom mailer for the test (defaults to `LoggingEmailSender`).
    ///
    /// Tests that exercise `mailer.send` failure paths (e.g. the
    /// email-change rollback) supply a fake here that returns
    /// `EmailError::Transport` so the rest of the handler can be observed
    /// without wiring up a real SMTP relay.
    pub mailer: Option<Arc<dyn EmailSender>>,
    /// Custom media storage for the test (defaults to `StubMediaStorage`).
    ///
    /// The avatar upload tests use this to swap in fakes that return
    /// `StorageError::Transport` so the handler's 500-mapping path can
    /// be observed without wiring up a real S3 backend.
    pub media_storage: Option<Arc<dyn MediaStorage>>,
}

impl Debug for TestOverrides {
    #[inline]
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        f.debug_struct("TestOverrides")
            .field("contract_big", &self.contract_big)
            .field("ico_fallback", &self.ico_fallback)
            .field("mailer", &self.mailer.as_ref().map(|_| "EmailSender"))
            .field(
                "media_storage",
                &self.media_storage.as_ref().map(|_| "MediaStorage"),
            )
            .finish()
    }
}

/// Creates a test server using a pool from `#[sqlx::test]`.
///
/// - `PostgreSQL` pool comes from `#[sqlx::test]` (isolated per test).
/// - Redis is optional: when `with_redis = true`, creates a dedicated container.
#[inline]
pub async fn setup_test_server(pool: PgPool, with_redis: bool) -> TestEnv {
    setup_test_server_with(pool, with_redis, TestOverrides::default()).await
}

/// Creates a test server with custom config overrides.
#[inline]
pub async fn setup_test_server_with(
    pool: PgPool,
    with_redis: bool,
    overrides: TestOverrides,
) -> TestEnv {
    let (redis_url, redis_client, redis_env) = if with_redis {
        let env = RedisTestEnv::start().await;
        (
            SecretString::from(env.url.clone()),
            env.client.clone(),
            Some(env),
        )
    } else {
        // Fake Redis URL - will fail if actually used
        let url = "redis://127.0.0.1:6379";
        let client = redis::Client::open(url).expect("Invalid Redis URL");
        (SecretString::from(url), client, None)
    };

    let jwt_secret = "test_jwt_secret_for_integration_tests_at_least_sixty_four_bytes!".to_owned();
    let config = ServerConfig {
        database_url: SecretString::from(TEST_DATABASE_URL),
        redis_url,
        jwt_secret: SecretString::from(jwt_secret.clone()),
        port: 0,
        cors_origin: TEST_CORS_ORIGIN.to_owned(),
        cookie_secure: false,
        contract_big: overrides.contract_big,
        ico_fallback: overrides.ico_fallback,
        total_supply: TOTAL_SUPPLY,
        media_stub_base_url: None,
    };
    let mailer = overrides
        .mailer
        .unwrap_or_else(|| Arc::new(LoggingEmailSender) as Arc<dyn EmailSender>);
    let media_storage = overrides
        .media_storage
        .unwrap_or_else(|| Arc::new(StubMediaStorage::new(None)) as Arc<dyn MediaStorage>);
    let state = Arc::new(AppState {
        db: pool,
        redis: RedisStore::new(redis_client)
            .await
            .expect("Failed to connect to Redis"),
        mailer,
        media_storage,
        config,
    });

    // Use real HTTP transport so ConnectInfo works for rate limiting (GovernorLayer).
    // create_app applies production middleware (CORS, tracing, body limit).
    let app = server::create_app(Arc::clone(&state))
        .expect("Failed to build app")
        .into_make_service_with_connect_info::<SocketAddr>();
    let config = TestServerConfig {
        transport: Some(Transport::HttpRandomPort),
        ..TestServerConfig::default()
    };

    TestEnv {
        server: TestServer::new_with_config(app, config),
        jwt_secret,
        redis: redis_env,
        state,
    }
}

/// Creates a test JWT access token populated with the full typed-claim schema.
#[inline]
pub fn create_test_jwt(user_id: UserId, role: UserRole, secret: &str) -> String {
    let now = Utc::now();
    let expiration = now
        .checked_add_signed(Duration::hours(24))
        .expect("Valid timestamp")
        .timestamp();
    let exp = usize::try_from(expiration.max(0)).expect("Valid expiration timestamp");
    let iat = usize::try_from(now.timestamp().max(0)).expect("Valid issued-at timestamp");
    let claims = Claims {
        sub: user_id,
        role,
        exp,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: Some(TokenType::Access),
        verification_level: Some(VerificationLevel::None),
        jti: Uuid::new_v4(),
        iat,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to create test JWT")
}

/// Mints an access JWT with a custom `iat` offset (in seconds) into the past.
///
/// Used by recent-auth gate tests (role-change, account-delete) that need
/// to drive `iat <= NOW() - window` deterministically without sleeping for
/// the full window in CI. The token is otherwise indistinguishable from
/// one produced by `create_test_jwt`.
#[inline]
pub fn mint_access_token_with_backdated_iat(
    user_id: Uuid,
    role: UserRole,
    secret: &str,
    iat_offset_secs: i64,
) -> String {
    let now = Utc::now();
    let exp = now
        .checked_add_signed(Duration::hours(24))
        .expect("Valid expiration")
        .timestamp();
    let exp_usize = usize::try_from(exp.max(0)).expect("Valid expiration timestamp");

    let backdated = now.timestamp() - iat_offset_secs;
    let iat_usize = usize::try_from(backdated.max(0)).expect("Valid iat");

    let claims = Claims {
        sub: user_id,
        role,
        exp: exp_usize,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: Some(TokenType::Access),
        verification_level: Some(VerificationLevel::None),
        jti: Uuid::new_v4(),
        iat: iat_usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to mint backdated JWT")
}

/// Seeds an `active` lease where `landlord_id = user_id`.
///
/// Inserts the minimal `properties` row required as a foreign key
/// (NOT NULL columns: `landlord_id`, `property_type`, `address_line1`,
/// `city`, `state`, `zip_code`) and the minimal `leases` row (NOT NULL
/// columns: `landlord_id`, `property_id`, `tenant_ids[]`,
/// `primary_tenant_id`, `type`, `start_date`, `end_date`,
/// `monthly_rent`, `security_deposit`, `created_by`).
///
/// `primary_tenant_id` and `tenant_ids[0]` are intentionally set to
/// `landlord_id` because the `users` table only has one row in this
/// scenario - the FK constraints accept self-references and the
/// callers assert on the `landlord_id` branch of the EXISTS predicate,
/// not the `primary_tenant_id` branch.
#[inline]
pub async fn seed_active_lease_as_landlord(pool: &PgPool, user_id: Uuid) {
    let property_id = sqlx::query!(
        r"
            INSERT INTO properties (
                landlord_id, property_type, address_line1, city, state, zip_code
            )
            VALUES ($1, 'single_family', '1 Test St', 'Testville', 'CA', '00000')
            RETURNING id
        ",
        user_id,
    )
    .fetch_one(pool)
    .await
    .expect("seed property")
    .id;

    sqlx::query!(
        r"
            INSERT INTO leases (
                landlord_id, property_id, agent_id, tenant_ids, primary_tenant_id,
                type, status, start_date, end_date, monthly_rent, security_deposit,
                created_by
            )
            VALUES (
                $1, $2, NULL, ARRAY[$1]::uuid[], $1,
                'fixed_term', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year',
                1000.00, 1000.00, $1
            )
        ",
        user_id,
        property_id,
    )
    .execute(pool)
    .await
    .expect("seed lease");
}

/// Makes an authenticated request by attaching the JWT as the
/// `access_token` cookie (the transport the middleware now expects).
#[inline]
pub async fn authed_request<T: DeserializeOwned>(
    server: &TestServer,
    method: &Method,
    uri: &str,
    token: &str,
    body: &Value,
) -> (StatusCode, Option<T>) {
    let cookie_header = format!("access_token={token}");
    let response = match *method {
        Method::GET => server.get(uri).add_header(COOKIE, &cookie_header).await,
        Method::POST => {
            server
                .post(uri)
                .add_header(COOKIE, &cookie_header)
                .json(&body)
                .await
        }
        Method::PUT => {
            server
                .put(uri)
                .add_header(COOKIE, &cookie_header)
                .json(&body)
                .await
        }
        Method::DELETE => server.delete(uri).add_header(COOKIE, &cookie_header).await,
        _ => panic!("Unsupported HTTP method: {method}"),
    };

    let status = response.status_code();
    let body_result: Result<T, _> = serde_json::from_slice(response.as_bytes());

    (status, body_result.ok())
}

/// Signs a message using the Casper Wallet "Casper Message:\n" prefix,
/// matching the byte sequence the browser extension produces. Every
/// integration test that needs a wallet-login round-trip flows the
/// nonce-message through this helper before posting it to
/// `/api/v1/auth/login`; consolidating the prefix-handling here keeps
/// the contract anchored in one place if Casper ever reshapes the
/// signing envelope.
#[inline]
pub fn sign_with_prefix(message: &str, secret_key: &SecretKey, public_key: &PublicKey) -> String {
    let prefixed = format!("{CASPER_MESSAGE_PREFIX}{message}");
    crypto::sign(prefixed.as_bytes(), secret_key, public_key).to_hex()
}

/// Generates a fresh random ed25519 keypair, used by tests that need
/// an isolated wallet (and therefore an isolated `users` row) per
/// invocation. `#[sqlx::test]` already gives us an isolated schema, so
/// random bytes are sufficient - we do not need a deterministic seed
/// to keep tests reproducible.
#[inline]
pub fn generate_random_ed25519() -> (SecretKey, PublicKey) {
    let mut rng = rand::rng();
    let mut bytes = [0u8; 32];
    rng.fill_bytes(&mut bytes);
    let secret_key = SecretKey::ed25519_from_bytes(bytes).unwrap();
    let public_key = PublicKey::from(&secret_key);
    (secret_key, public_key)
}

/// Bundle returned by [`login_and_extract`].
///
/// Holds every artifact a test might need after a wallet login: the
/// resolved `user_id`, both auth cookies' plaintext values, AND the
/// keypair used to sign the nonce. The keypair is included so flows
/// that need to re-login under the same wallet (the `relogin_with_keypair`
/// pattern in `users_role.rs`, which exists because the role-change
/// handler stamps `jwt_invalidate_before` and kills the original cookie)
/// can do so without regenerating a fresh wallet that would create a
/// different `users` row.
///
/// Tests that do not consume every field simply drop the unused ones -
/// the file-level `#![allow(dead_code)]` covers the unused-field warnings.
#[derive(Debug)]
pub struct LoggedSession {
    /// Primary key of the `users` row that owns the new session.
    pub user_id: Uuid,
    /// Plaintext of the `access_token` cookie. Pass back via the
    /// `Cookie` request header to authenticate subsequent calls.
    pub access_token: String,
    /// Plaintext of the `refresh_token` cookie. Needed by the sessions
    /// list test (for the `is_current` flag) and any test that exercises
    /// `/auth/refresh`.
    pub refresh_token: String,
    /// ed25519 secret used to sign the original nonce. Tests that
    /// re-login under the same wallet keep this around so the second
    /// call resolves to the same `user_id`.
    pub secret_key: SecretKey,
    /// Matching public key (derivable from `secret_key` but cached here
    /// to avoid repeating the `PublicKey::from(&secret_key)` boilerplate
    /// at every call site that builds the wallet address).
    pub public_key: PublicKey,
}

/// Performs a full nonce -> sign -> login round-trip and pulls every
/// artifact a test might need out of the response.
///
/// Centralizes the boilerplate that previously lived (with three
/// slightly different return types) in `auth_invalidate_before.rs`,
/// `auth_sessions.rs`, and `users_role.rs`: each call site now takes
/// only the fields it cares about and lets the rest fall on the floor.
/// The helper deliberately does NOT cover seed-based logins
/// (`auth.rs:login_with_seed`, `users_avatar.rs:login_and_get_access_token`)
/// because those tests pin a deterministic wallet for cross-test
/// collision tests and would lose meaning under random keys.
///
/// # Panics
///
/// Panics if any step of the login flow fails (nonce JSON malformed,
/// login returns non-200, or the response cookies/body are missing the
/// expected fields). Tests want a hard fail at the helper rather than a
/// confusing assertion failure 30 lines downstream.
#[inline]
pub async fn login_and_extract(env: &TestEnv) -> LoggedSession {
    let (secret_key, public_key) = generate_random_ed25519();
    let wallet_address = public_key.to_hex();

    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let message = nonce_body["message"].as_str().unwrap();
    let signature_hex = sign_with_prefix(message, &secret_key, &public_key);

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);

    let login_body = login_response.json::<Value>();
    let user_id =
        Uuid::parse_str(login_body["user"]["id"].as_str().unwrap()).expect("user id is a UUID");
    let access_token = login_response.cookie("access_token").value().to_owned();
    let refresh_token = login_response.cookie("refresh_token").value().to_owned();

    LoggedSession {
        user_id,
        access_token,
        refresh_token,
        secret_key,
        public_key,
    }
}
