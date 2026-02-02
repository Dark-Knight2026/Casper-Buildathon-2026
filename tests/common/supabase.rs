//! Supabase-compatible PostgreSQL test infrastructure.
//!
//! Provides an isolated PostgreSQL instance via testcontainers.
//! Each test gets its own container for full isolation.

use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use std::time::Duration;
use testcontainers::core::{IntoContainerPort, WaitFor};
use testcontainers::runners::AsyncRunner;
use testcontainers::{ContainerAsync, GenericImage, ImageExt};

/// Holds a running `PostgreSQL` container and connection pool.
/// Container stays alive as long as this struct exists.
pub struct SupabaseTestEnv {
    pub pool: PgPool,
    pub database_url: String,
    _container: ContainerAsync<GenericImage>,
}

impl SupabaseTestEnv {
    /// Starts a PostgreSQL container with Supabase mocks and migrations.
    pub async fn start() -> Self {
        let image = GenericImage::new("postgis/postgis", "16-3.4")
            .with_exposed_port(5432.tcp())
            .with_wait_for(WaitFor::message_on_stderr(
                "database system is ready to accept connections",
            ))
            .with_env_var("POSTGRES_USER", "postgres")
            .with_env_var("POSTGRES_PASSWORD", "postgres")
            .with_env_var("POSTGRES_DB", "postgres");

        let container = image.start().await.expect("Failed to start PostgreSQL");
        let port = container
            .get_host_port_ipv4(5432)
            .await
            .expect("Failed to get PostgreSQL port");

        let database_url = format!("postgres://postgres:postgres@127.0.0.1:{port}/postgres");
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(Duration::from_secs(30))
            .connect(&database_url)
            .await
            .expect("Failed to connect to test database");

        // Apply Supabase mocks before migrations
        apply_supabase_mocks(&pool).await;

        // Run project migrations
        sqlx::migrate!("./supabase/migrations")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        Self {
            pool,
            database_url,
            _container: container,
        }
    }
}

async fn apply_supabase_mocks(pool: &PgPool) {
    // Extensions
    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "pgcrypto""#)
        .execute(pool)
        .await
        .expect("Failed to enable pgcrypto");

    sqlx::query(r#"CREATE EXTENSION IF NOT EXISTS "uuid-ossp""#)
        .execute(pool)
        .await
        .expect("Failed to enable uuid-ossp");

    // Schemas
    sqlx::query("CREATE SCHEMA IF NOT EXISTS auth")
        .execute(pool)
        .await
        .expect("Failed to create auth schema");

    sqlx::query("CREATE SCHEMA IF NOT EXISTS storage")
        .execute(pool)
        .await
        .expect("Failed to create storage schema");

    // Auth users table (Supabase schema)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instance_id UUID,
            aud VARCHAR(255),
            role VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            encrypted_password VARCHAR(255),
            email_confirmed_at TIMESTAMPTZ,
            invited_at TIMESTAMPTZ,
            confirmation_token VARCHAR(255),
            confirmation_sent_at TIMESTAMPTZ,
            recovery_token VARCHAR(255),
            recovery_sent_at TIMESTAMPTZ,
            email_change_token_new VARCHAR(255),
            email_change VARCHAR(255),
            email_change_sent_at TIMESTAMPTZ,
            last_sign_in_at TIMESTAMPTZ,
            raw_app_meta_data JSONB,
            raw_user_meta_data JSONB,
            is_super_admin BOOLEAN,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            phone VARCHAR(255),
            phone_confirmed_at TIMESTAMPTZ,
            phone_change VARCHAR(255),
            phone_change_token VARCHAR(255),
            phone_change_sent_at TIMESTAMPTZ,
            confirmed_at TIMESTAMPTZ,
            email_change_token_current VARCHAR(255),
            email_change_confirm_status SMALLINT,
            banned_until TIMESTAMPTZ,
            reauthentication_token VARCHAR(255),
            reauthentication_sent_at TIMESTAMPTZ,
            is_sso_user BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMPTZ
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to create auth.users");

    // Storage tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS storage.buckets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            owner UUID REFERENCES auth.users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            public BOOLEAN DEFAULT FALSE,
            avif_autodetection BOOLEAN DEFAULT FALSE,
            file_size_limit BIGINT,
            allowed_mime_types TEXT[]
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to create storage.buckets");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS storage.objects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bucket_id TEXT REFERENCES storage.buckets(id),
            name TEXT,
            owner UUID REFERENCES auth.users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
            metadata JSONB,
            version TEXT
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to create storage.objects");

    // Roles
    sqlx::raw_sql(
        r#"
        DO $$ BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
                CREATE ROLE authenticated;
            END IF;
        END $$;
        DO $$ BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
                CREATE ROLE anon;
            END IF;
        END $$;
        DO $$ BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
                CREATE ROLE service_role;
            END IF;
        END $$;
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to create roles");

    // Auth functions
    sqlx::raw_sql(
        r#"
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
            SELECT NULL::UUID;
        $$ LANGUAGE SQL STABLE;

        CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
            SELECT NULL::TEXT;
        $$ LANGUAGE SQL STABLE;

        CREATE OR REPLACE FUNCTION auth.email() RETURNS TEXT AS $$
            SELECT NULL::TEXT;
        $$ LANGUAGE SQL STABLE;
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to create auth functions");

    // Storage functions
    sqlx::raw_sql(
        r#"
        CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] AS $$
            SELECT string_to_array(name, '/');
        $$ LANGUAGE SQL IMMUTABLE;

        CREATE OR REPLACE FUNCTION storage.filename(name TEXT) RETURNS TEXT AS $$
            SELECT split_part(name, '/', -1);
        $$ LANGUAGE SQL IMMUTABLE;

        CREATE OR REPLACE FUNCTION storage.extension(name TEXT) RETURNS TEXT AS $$
            SELECT split_part(name, '.', -1);
        $$ LANGUAGE SQL IMMUTABLE;
        "#,
    )
    .execute(pool)
    .await
    .expect("Failed to create storage functions");
}
