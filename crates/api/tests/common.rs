//! Common test utilities.
//!
//! ## Backend strategy
//!
//! - **`PostgreSQL`**: Single container via docker-compose, isolated DBs via `#[sqlx::test]`
//! - **`MinIO`**: Single container via docker-compose, isolated buckets via UUID suffix
//! - **`Redis`**: Testcontainers per test (no per-test namespace primitive - separate
//!   keyspace would require ubiquitous per-test prefixes on every key)
//!
//! Alternatives considered:
//! - Testcontainers for everything - slower (~10s PG, ~3-5s `MinIO` startup per test)
//! - Shared Redis - breaks parallel test isolation

#![allow(dead_code, clippy::missing_panics_doc, clippy::must_use_candidate)]

use core::fmt::{Debug, Formatter, Result as FmtResult};
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use axum::http::{Method, StatusCode};
use axum_test::{TestServer, TestServerConfig, Transport, http::header::COOKIE};
use casper_types::{AsymmetricType, PublicKey, SecretKey, crypto};
use chrono::{Duration, Utc};
use core::net::SocketAddr;
use jsonwebtoken::{EncodingKey, Header, encode};
use rand::Rng;
use s3::{Bucket, BucketConfiguration, Region, creds::Credentials};
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
    AppState, Claims, IcoFallback, LoggingEmailSender, S3Config, ServerConfig, UserId, UserRole,
    common::{
        CASPER_MESSAGE_PREFIX, JWT_AUDIENCE, JWT_ISSUER, RedisStore, TOTAL_SUPPLY, TokenType,
        VerificationLevel, tokens,
    },
    providers::{
        EmailError, EmailMessage, EmailSender, FakeKycProvider, FakePinner, KycOutcome,
        KycProvider, KycResult, NoopMetadataStripper, SharedMediaStorage, StubFairHousingScreen,
        StubMediaStorage,
    },
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
    /// `EmailError::Transient` so the rest of the handler can be observed
    /// without wiring up a real SMTP relay.
    pub mailer: Option<Arc<dyn EmailSender>>,
    /// Custom media storage for the test (defaults to `StubMediaStorage`).
    ///
    /// The avatar upload tests use this to swap in fakes that return
    /// `StorageError::Transport` so the handler's 500-mapping path can
    /// be observed without wiring up a real S3 backend.
    pub media_storage: Option<SharedMediaStorage>,
    /// Override for the per-user email-change attempt cap. `None` keeps the
    /// production default (3). The rate-limit test sets this so it can drive
    /// the limiter to its boundary in fewer requests than the wall-clock
    /// window would otherwise force.
    pub email_change_max_attempts: Option<u64>,
    /// Outer request-body cap in MiB (defaults to 8, matching production).
    ///
    /// Lowered by the layer-level 413 test so a payload above this cap but
    /// below a real multi-MiB threshold is rejected by `RequestBodyLimitLayer`
    /// before the handler runs, exercising the layer-level path distinct from
    /// the handler's own `MAX_AVATAR_BYTES` guard.
    pub request_body_limit_mb: Option<u32>,
    /// Custom KYC provider for the test (defaults to `FakeKycProvider`, which
    /// always reports verified).
    ///
    /// The authority-gate tests install a [`FailingKycProvider`] here to drive
    /// the `-> active` gate's identity branch to its rejection - the default
    /// fake can never fail it.
    pub kyc: Option<Arc<dyn KycProvider>>,
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
            .field("email_change_max_attempts", &self.email_change_max_attempts)
            .field("request_body_limit_mb", &self.request_body_limit_mb)
            .field("kyc", &self.kyc.as_ref().map(|_| "KycProvider"))
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
        frontend_url: "http://localhost:3000".to_owned(),
        request_body_limit_mb: overrides.request_body_limit_mb.unwrap_or(8),
        cookie_secure: false,
        contract_big: overrides.contract_big,
        ico_fallback: overrides.ico_fallback,
        total_supply: TOTAL_SUPPLY,
        s3: None,
        postmark: None,
        email_change_max_attempts: overrides.email_change_max_attempts.unwrap_or(3),
    };
    let mailer = overrides
        .mailer
        .unwrap_or_else(|| Arc::new(LoggingEmailSender) as Arc<dyn EmailSender>);
    let media_storage = overrides
        .media_storage
        .unwrap_or_else(|| Arc::new(StubMediaStorage::new()) as SharedMediaStorage);
    let state = Arc::new(AppState {
        db: pool,
        redis: RedisStore::new(redis_client, config.email_change_max_attempts)
            .await
            .expect("Failed to connect to Redis"),
        mailer,
        media_storage,
        kyc: overrides
            .kyc
            .unwrap_or_else(|| Arc::new(FakeKycProvider::new()) as Arc<dyn KycProvider>),
        fair_housing: Arc::new(StubFairHousingScreen::new()),
        content_pinner: Arc::new(FakePinner::new()),
        metadata_stripper: Arc::new(NoopMetadataStripper::new()),
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

/// Fake mailer whose `send` always fails transiently.
///
/// Drives the queue-for-retry branch: the handler still answers `200`, the
/// message lands in `email_send_retries`, and the rate-limit counter is NOT
/// compensated (the mail will still be delivered by the worker).
#[derive(Debug, Default)]
pub struct TransientMailer;

#[async_trait]
impl EmailSender for TransientMailer {
    #[inline]
    async fn send(&self, _message: EmailMessage) -> Result<(), EmailError> {
        Err(EmailError::Transient(
            "transient mailer (test fixture)".to_owned(),
        ))
    }
}

/// Fake mailer whose `send` always fails permanently.
///
/// Drives the rollback branch: the token slot is cleared, the rate-limit
/// counter is decremented, and the handler answers `500` so a dead send never
/// blocks the user from retrying.
#[derive(Debug, Default)]
pub struct PermanentMailer;

#[async_trait]
impl EmailSender for PermanentMailer {
    #[inline]
    async fn send(&self, _message: EmailMessage) -> Result<(), EmailError> {
        Err(EmailError::Permanent(
            "permanent mailer (test fixture)".to_owned(),
        ))
    }
}

/// KYC provider whose check always completes as NOT verified.
///
/// The default `FakeKycProvider` always reports verified, so the identity half
/// of the authority gate can never fail under it. Tests that must drive the
/// `-> active` gate's identity branch to its rejection install this via
/// [`TestOverrides::kyc`]. A `verified = false` outcome is a completed check,
/// not a transport error, so the handler sees a clean gate failure (`409`),
/// never a `500`.
#[derive(Debug, Default)]
pub struct FailingKycProvider;

#[async_trait]
impl KycProvider for FailingKycProvider {
    #[inline]
    async fn verify_identity(&self, _user_id: Uuid) -> KycResult<KycOutcome> {
        Ok(KycOutcome {
            verified: false,
            reference: None,
        })
    }
}

/// Mailer that records every successfully-sent message in memory.
///
/// Used wherever a test needs the plaintext payload that travels only inside
/// the outbound message: confirmation tokens never land in Redis (Redis stores
/// only their SHA-256 hash) and are not echoed in the HTTP response under a
/// real Postmark config, so the only path to that plaintext from a test
/// harness is intercepting the message body before it would reach an SMTP
/// relay. Clone the `sent` handle before moving the mailer into
/// `Arc<dyn EmailSender>` to retain read-back access.
///
/// `std::sync::Mutex` (not `tokio::sync::Mutex`) is correct here because
/// the `send` impl pushes-and-returns without crossing an `.await`; the
/// lock is released before the future yields.
#[derive(Debug, Default, Clone)]
pub struct CapturingMailer {
    /// Append-only log of every message accepted by `send`. Wrapped in `Arc`
    /// so a test can clone a read-back handle before moving the mailer into
    /// the `Arc<dyn EmailSender>` slot on `AppState`.
    pub sent: Arc<Mutex<Vec<EmailMessage>>>,
}

#[async_trait]
impl EmailSender for CapturingMailer {
    #[inline]
    async fn send(&self, message: EmailMessage) -> Result<(), EmailError> {
        self.sent
            .lock()
            .expect("CapturingMailer mutex poisoned")
            .push(message);
        Ok(())
    }
}

/// Wires a `CapturingMailer` into the test server and returns a shared handle
/// to its message log alongside the environment.
///
/// `CapturingMailer` is `Clone` over its inner `Arc`, so the returned mailer
/// reads the same `Vec<EmailMessage>` that the one moved into
/// `Arc<dyn EmailSender>` writes to. Use the returned handle with
/// [`extract_verify_token`] to recover plaintext that travels only inside the
/// outbound email body.
#[inline]
pub async fn setup_test_server_capturing(
    pool: PgPool,
    with_redis: bool,
) -> (TestEnv, CapturingMailer) {
    let mailer = CapturingMailer::default();
    let handle = mailer.clone();
    let env = setup_test_server_with(
        pool,
        with_redis,
        TestOverrides {
            mailer: Some(Arc::new(mailer) as Arc<dyn EmailSender>),
            ..TestOverrides::default()
        },
    )
    .await;
    (env, handle)
}

/// Builds a test server whose KYC provider always reports NOT verified (see
/// [`FailingKycProvider`]). Used by the authority-gate identity-branch tests;
/// keeps the `Arc<dyn KycProvider>` coercion in one place.
#[inline]
pub async fn setup_test_server_failing_kyc(pool: PgPool) -> TestEnv {
    setup_test_server_with(
        pool,
        false,
        TestOverrides {
            kyc: Some(Arc::new(FailingKycProvider) as Arc<dyn KycProvider>),
            ..TestOverrides::default()
        },
    )
    .await
}

/// Sets a unique email on the user and clears `email_verified`, so the next
/// verify-send clears the `email IS NULL` guard and the next confirm runs the
/// genuine UPDATE branch. A wallet-only login synthesises a placeholder email;
/// this overwrites it with a known fixture value the assertions can read back.
/// Returns the email it set.
#[inline]
pub async fn seed_email(pool: &PgPool, user_id: Uuid) -> String {
    let email = format!("verify-{user_id}@example.com");
    sqlx::query(
        r"
            UPDATE users
            SET email = $1, email_verified = FALSE
            WHERE id = $2
        ",
    )
    .bind(&email)
    .bind(user_id)
    .execute(pool)
    .await
    .expect("seed email");
    email
}

/// Plaintext verification token parsed from the most recent message captured
/// by a `CapturingMailer`.
///
/// The verify-email body is built by `verification_email` as a single link
/// `{frontend_url}/verify-email?token={token}` terminated by `\n`, so the
/// `?token=` substring isolates the plaintext. Panics if no message has been
/// captured yet, the body carries no token query parameter, or it carries more
/// than one - a second `?token=` would let the parser silently pick one, which
/// always signals a miswired test rather than a contract change.
#[inline]
pub fn extract_verify_token(mailer: &CapturingMailer) -> String {
    let messages = mailer.sent.lock().expect("CapturingMailer mutex poisoned");
    let body = &messages
        .last()
        .expect("no captured verification message yet")
        .body;
    let mut after_marker = body.split("?token=");
    after_marker.next();
    let token = after_marker
        .next()
        .expect("verification email body must carry a `?token=...` link");
    assert!(
        after_marker.next().is_none(),
        "verification email body carried more than one `?token=` link; \
         extract_verify_token cannot disambiguate which is current",
    );
    let token = token.trim_end().to_owned();
    assert_eq!(
        token.len(),
        tokens::TOKEN_STR_LEN,
        "verify-email token must be exactly TOKEN_STR_LEN={} chars; got {}",
        tokens::TOKEN_STR_LEN,
        token.len(),
    );
    token
}

/// 8-byte PNG signature followed by zero padding to 1 KB.
///
/// The avatar handler's magic-byte sniff inspects only the first 8
/// bytes, so any payload that starts with the canonical PNG magic is
/// accepted regardless of what follows. 1 KB is enough headroom for
/// size-related assertions without bloating the binary.
#[inline]
pub fn fake_png_bytes() -> Vec<u8> {
    let mut bytes = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    bytes.extend(core::iter::repeat_n(0u8, 1024 - bytes.len()));
    bytes
}

/// 3-byte JPEG SOI marker (`FF D8 FF`) followed by zero padding to 1 KB.
/// Matches the sniff contract: the handler only looks at the first few
/// bytes, so any tail is acceptable.
#[inline]
pub fn fake_jpg_bytes() -> Vec<u8> {
    let mut bytes = vec![0xFF, 0xD8, 0xFF];
    bytes.extend(core::iter::repeat_n(0u8, 1024 - bytes.len()));
    bytes
}

/// 12-byte WebP RIFF container (`RIFF` + 4-byte length + `WEBP`) followed by
/// zero padding to 1 KB. The handler's sniff inspects bytes 0..4 and
/// 8..12 (per `services/users/handlers.rs:167`); the intervening 4-byte length
///   field is opaque to that check, so we fill it with the minimum valid 4-byte
///   payload size and move on.
#[inline]
pub fn fake_webp_bytes() -> Vec<u8> {
    let mut bytes = Vec::with_capacity(1024);
    bytes.extend_from_slice(b"RIFF");
    bytes.extend_from_slice(&1024_u32.to_le_bytes());
    bytes.extend_from_slice(b"WEBP");
    bytes.extend(core::iter::repeat_n(0u8, 1024 - bytes.len()));
    bytes
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

/// Mints an access JWT with a caller-supplied `verification_level` claim,
/// including the `None` (legacy pre-claim token) variant.
///
/// The `VerifiedUser<V>` extractor reads the level from the JWT, not from
/// the user row, so this helper drives gating tests without having to
/// mutate `users.verification_level` (which is in any case read-only - it
/// is recomputed by `trg_users_sync_verification_level` from the flag
/// columns).
#[inline]
pub fn mint_access_token_with_level(
    user_id: UserId,
    role: UserRole,
    secret: &str,
    verification_level: Option<VerificationLevel>,
) -> String {
    let now = Utc::now();
    let exp = now
        .checked_add_signed(Duration::hours(24))
        .expect("Valid expiration")
        .timestamp();
    let exp_usize = usize::try_from(exp.max(0)).expect("Valid expiration timestamp");
    let iat_usize = usize::try_from(now.timestamp().max(0)).expect("Valid iat");

    let claims = Claims {
        sub: user_id,
        role,
        exp: exp_usize,
        iss: JWT_ISSUER.to_owned(),
        aud: JWT_AUDIENCE.to_owned(),
        token_type: Some(TokenType::Access),
        verification_level,
        jti: Uuid::new_v4(),
        iat: iat_usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to mint JWT with custom level")
}

/// Inserts a `pending` row into `email_send_retries` with the DDL default
/// `next_retry_at = NOW()` (immediately due) and returns its id.
///
/// Used by both the worker tests and the db-layer tests as the canonical
/// seed for "there is a fresh transient delivery waiting for a tick". The
/// payload columns are placeholders - the worker re-sends them verbatim, so
/// the strings only have to be non-NULL.
#[inline]
pub async fn seed_pending_retry(pool: &PgPool, to: &str) -> Uuid {
    sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO email_send_retries (to_address, subject, body)
            VALUES ($1, 'subj', 'body')
            RETURNING id
        ",
    )
    .bind(to)
    .fetch_one(pool)
    .await
    .expect("seed insert")
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
    let property_id = sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO properties (
                landlord_id, property_type, address_line1, city, state, zip_code
            )
            VALUES ($1, 'single_family', '1 Test St', 'Testville', 'CA', '00000')
            RETURNING id
        ",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .expect("seed property");

    sqlx::query(
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
    )
    .bind(user_id)
    .bind(property_id)
    .execute(pool)
    .await
    .expect("seed lease");
}

/// Inserts a minimal `active` `users` row with `role` and returns its id.
///
/// Marketplace endpoints gate on `RoleUser<R>` (a JWT role claim, never a DB
/// read) but FK their writes to `users.id` (`listed_by`, the tenant `user_id`,
/// the denormalized `landlord_id`). A bare `create_test_jwt(UserId::default(),
/// ...)` clears the claim yet dangles that FK, so any domain that persists a
/// row needs a real user first. The email is UUID-suffixed so a single test can
/// seed several users of the same role without colliding on the unique index.
#[inline]
pub async fn seed_user(pool: &PgPool, role: UserRole) -> Uuid {
    let role_name = role.to_string();
    let email = format!("{role_name}-{}@example.com", Uuid::new_v4());
    sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO users (email, primary_auth_method, role, first_name, last_name, status)
            VALUES ($1, 'wallet', $2, 'Test', 'User', 'active')
            RETURNING id
        ",
    )
    .bind(email)
    .bind(role_name)
    .fetch_one(pool)
    .await
    .expect("seed user")
}

/// Seeds a user (see [`seed_user`]) and mints a matching access JWT, returning
/// both. The token's `role` claim equals `role` so it clears `RoleUser<R>` for
/// the same marker, and its `sub` is the freshly-inserted row so FK-bearing
/// writes resolve against a live user.
#[inline]
pub async fn seed_authed_user(env: &TestEnv, pool: &PgPool, role: UserRole) -> (Uuid, String) {
    let user_id = seed_user(pool, role.clone()).await;
    let token = create_test_jwt(user_id, role, &env.jwt_secret);
    (user_id, token)
}

/// Seeds a minimal property owned by `landlord_id` at the given coordinates and
/// returns its id. `address_line1` is UUID-unique so repeated seeds never
/// collapse onto one row via the address fingerprint; the coordinates feed the
/// generated `geog` point so geo filters have something to match.
#[inline]
pub async fn seed_property_at(pool: &PgPool, landlord_id: Uuid, lat: f64, lng: f64) -> Uuid {
    let address_line1 = format!("{} Test St", Uuid::new_v4());
    sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO properties (
                landlord_id, property_type, address_line1, city, state, zip_code,
                latitude, longitude, bedrooms
            )
            VALUES ($1, 'single_family', $2, 'Denver', 'CO', '80202', $3, $4, 2)
            RETURNING id
        ",
    )
    .bind(landlord_id)
    .bind(address_line1)
    .bind(lat)
    .bind(lng)
    .fetch_one(pool)
    .await
    .expect("seed property")
}

/// Seeds a minimal property at a default Denver coordinate. See
/// [`seed_property_at`] for the geo-specific variant.
#[inline]
pub async fn seed_property(pool: &PgPool, landlord_id: Uuid) -> Uuid {
    seed_property_at(pool, landlord_id, 39.7392, -104.9903).await
}

/// Sets a property's `bathrooms` and `square_feet`, which the minimal seed
/// leaves NULL, so attribute-range filters (`minBathrooms`/`minLivingArea`)
/// have something to match.
#[inline]
pub async fn set_property_metrics(
    pool: &PgPool,
    property_id: Uuid,
    bathrooms: f64,
    square_feet: i32,
) {
    sqlx::query(
        r"
            UPDATE properties
            SET bathrooms = $2, square_feet = $3
            WHERE id = $1
        ",
    )
    .bind(property_id)
    .bind(bathrooms)
    .bind(square_feet)
    .execute(pool)
    .await
    .expect("set property metrics");
}

/// Posts a minimal valid `rent_ltr` draft listing against `property_id` (as the
/// landlord holding `token`) and returns its id. Setup for tests that need an
/// existing listing without re-asserting the create path itself.
#[inline]
pub async fn create_draft_listing(env: &TestEnv, token: &str, property_id: Uuid) -> Uuid {
    let response = env
        .server
        .post("/api/v1/listings")
        .add_header(COOKIE, format!("access_token={token}"))
        .json(&serde_json::json!({
            "propertyId": property_id,
            "title": "Test Listing",
            "description": "A comfortable place to live",
            "terms": {
                "rentMonthly": 2000.0,
                "securityDeposit": 2000.0,
                "leaseTermsOffered": ["1 Year"],
                "furnished": false,
            },
        }))
        .await;
    assert_eq!(
        response.status_code(),
        StatusCode::CREATED,
        "create draft listing setup must succeed",
    );
    Uuid::parse_str(response.json::<Value>()["id"].as_str().unwrap()).expect("listing id is a UUID")
}

/// Forces a listing to `active` directly in the DB, with a 90-day expiry, so
/// list/search/view tests can target the active-only surface without driving
/// the full submit -> authority-gate -> activate flow (covered on its own).
#[inline]
pub async fn activate_listing(pool: &PgPool, listing_id: Uuid) {
    sqlx::query(
        r"
            UPDATE listings
            SET state = 'active', expires_at = now() + INTERVAL '90 days'
            WHERE id = $1
        ",
    )
    .bind(listing_id)
    .execute(pool)
    .await
    .expect("activate listing");
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
    let body_result = serde_json::from_slice::<T>(response.as_bytes());

    (status, body_result.ok())
}

/// Signs a message using the Casper Wallet "Casper Message:\n" prefix,
/// matching the byte sequence the browser extension produces. Every
/// integration test that needs a wallet-login round-trip flows the
/// nonce-message through this helper before posting it to
/// `/api/v1/auth/login/wallet`; consolidating the prefix-handling here keeps
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
        .post("/api/v1/auth/login/wallet")
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

/// Default `MinIO` root credentials used for ephemeral test buckets.
/// `MinIO` requires `MINIO_ROOT_PASSWORD` to be at least 8 chars; the
/// test fixture uses the documented `MinIO` defaults that match the
/// `minio-test` service in `docker-compose.test.yml`.
const MINIO_TEST_ACCESS_KEY: &str = "minioadmin";
const MINIO_TEST_SECRET_KEY: &str = "minioadmin";
const MINIO_TEST_REGION: &str = "us-east-1";
/// Host endpoint of the shared `MinIO` container from
/// `docker-compose.test.yml`. Port 9100 (not 9000) so the test stack
/// can run alongside the dev stack without colliding.
const MINIO_TEST_ENDPOINT: &str = "http://127.0.0.1:9100";
/// Per-test bucket name is `{prefix}-{uuid}` so parallel `nextest`
/// workers stay isolated on the shared `MinIO`.
const MINIO_TEST_BUCKET_PREFIX: &str = "leasefi-test";

/// Holds a freshly-created bucket on the shared `MinIO` container
/// (`minio-test` in `docker-compose.test.yml`) and an [`S3Config`]
/// bound to it. The bucket name is suffixed with a UUID per test, so
/// parallel workers do not collide on object keys; the bucket itself
/// is not torn down at end-of-test - the entire `MinIO /data` mount
/// is `tmpfs`, so accumulated buckets disappear on `make env-down`.
///
/// The bucket policy is left at the `MinIO` default (private). Tests
/// that need to verify the public-fetch behaviour of the production
/// stack use the returned `bucket` handle directly (`bucket.get_object`)
/// instead of `reqwest::get(public_url)` - `MinIO` obeys `x-amz-acl:
/// public-read` only when the bucket policy is `download`, and the
/// extra wiring would just retest `MinIO`, not our code.
pub struct MinioTestEnv {
    /// S3 configuration ready to inject into [`ServerConfig`]'s `s3`
    /// field or to pass to `S3MediaStorage::new(...)`.
    pub config: S3Config,
    /// Direct bucket handle for read-back assertions in tests
    /// (`bucket.get_object(key)` after a put through the handler).
    pub bucket: Box<Bucket>,
}

impl Debug for MinioTestEnv {
    #[inline]
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        f.debug_struct("MinioTestEnv")
            .field("endpoint", &self.config.endpoint)
            .field("bucket", &self.config.bucket)
            .finish_non_exhaustive()
    }
}

impl MinioTestEnv {
    /// Creates a fresh per-test bucket on the shared `MinIO` container
    /// and returns the populated environment.
    ///
    /// Assumes `minio-test` is up (started by `make test` via
    /// `docker-compose.test.yml`). Bucket creation is ~50ms per test,
    /// vs ~3-5s for a per-test container startup.
    #[inline]
    pub async fn start() -> Self {
        let bucket_name = format!("{MINIO_TEST_BUCKET_PREFIX}-{}", Uuid::new_v4());
        let region = Region::Custom {
            region: MINIO_TEST_REGION.to_owned(),
            endpoint: MINIO_TEST_ENDPOINT.to_owned(),
        };
        let credentials = Credentials::new(
            Some(MINIO_TEST_ACCESS_KEY),
            Some(MINIO_TEST_SECRET_KEY),
            None,
            None,
            None,
        )
        .expect("MinIO credentials init");

        // Path-style is mandatory for MinIO. `create_with_path_style`
        // both creates the bucket via the path-style PUT and returns a
        // ready-to-use `Bucket` handle - one round-trip, no second
        // `Bucket::new(...).with_path_style()` dance.
        Bucket::create_with_path_style(
            &bucket_name,
            region.clone(),
            credentials.clone(),
            BucketConfiguration::default(),
        )
        .await
        .expect("MinIO create bucket");

        let bucket = Bucket::new(&bucket_name, region, credentials)
            .expect("MinIO bucket handle")
            .with_path_style();

        let config = S3Config {
            bucket: bucket_name.clone(),
            region: MINIO_TEST_REGION.to_owned(),
            endpoint: MINIO_TEST_ENDPOINT.to_owned(),
            access_key: SecretString::from(MINIO_TEST_ACCESS_KEY),
            secret_key: SecretString::from(MINIO_TEST_SECRET_KEY),
            public_url_base: format!("{MINIO_TEST_ENDPOINT}/{bucket_name}"),
        };

        Self { config, bucket }
    }
}
