//! One-shot bootstrap for the platform admin account.
//!
//! Runs once at deploy time, after `sqlx migrate`, before the API server
//! starts. Reads `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_FIRST_NAME`,
//! `BOOTSTRAP_ADMIN_LAST_NAME` from the environment and idempotently
//! inserts/upgrades a row in `users` with `role = 'admin'`.
//!
//! If `BOOTSTRAP_ADMIN_EMAIL` is missing, the binary logs a message and
//! exits successfully - so dev environments without a bootstrap admin work
//! without extra configuration.
//!
//! `password_hash`, `wallet_address`, and `auth_id` stay NULL: the admin
//! sets a password via `POST /users/me/password/set` after the first login,
//! and may later connect a wallet. A first-login exchange flow (token
//! handoff for the very first session) is intentionally out of scope here
//! and will land in a follow-up PR alongside its `POST /auth/bootstrap`
//! exchange endpoint.

use core::error::Error;
use core::str::FromStr;
use core::time::Duration;
use std::{env, process::ExitCode};

use secrecy::ExposeSecret;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use uuid::Uuid;

use api::ServerConfig;

/// Default first name when `BOOTSTRAP_ADMIN_FIRST_NAME` is not set.
const DEFAULT_FIRST_NAME: &str = "Platform";

/// Default last name when `BOOTSTRAP_ADMIN_LAST_NAME` is not set.
const DEFAULT_LAST_NAME: &str = "Admin";

type BootstrapError = Box<dyn Error + Send + Sync>;

#[tokio::main]
async fn main() -> ExitCode {
    tracing_subscriber::fmt::init();
    dotenv::dotenv().ok();

    match run().await {
        Ok(RunOutcome::Completed | RunOutcome::Skipped) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("bootstrap_admin failed: {e:?}");
            ExitCode::FAILURE
        }
    }
}

enum RunOutcome {
    Completed,
    Skipped,
}

async fn run() -> Result<RunOutcome, BootstrapError> {
    let Some(email) = env::var("BOOTSTRAP_ADMIN_EMAIL")
        .ok()
        .filter(|s| !s.trim().is_empty())
    else {
        tracing::info!("BOOTSTRAP_ADMIN_EMAIL not set - bootstrap skipped");
        return Ok(RunOutcome::Skipped);
    };
    let first_name =
        env::var("BOOTSTRAP_ADMIN_FIRST_NAME").unwrap_or_else(|_| DEFAULT_FIRST_NAME.to_owned());
    let last_name =
        env::var("BOOTSTRAP_ADMIN_LAST_NAME").unwrap_or_else(|_| DEFAULT_LAST_NAME.to_owned());

    let config = ServerConfig::from_env()?;

    let db_options = PgConnectOptions::from_str(config.database_url.expose_secret())?;
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .acquire_timeout(Duration::from_secs(3))
        .connect_with(db_options)
        .await?;

    let user_id = upsert_admin(&pool, &email, &first_name, &last_name).await?;

    tracing::info!(
        event = "bootstrap_admin_provisioned",
        user_id = %user_id,
        email = %email,
        "Bootstrap admin provisioned"
    );

    Ok(RunOutcome::Completed)
}

async fn upsert_admin(
    pool: &sqlx::PgPool,
    email: &str,
    first_name: &str,
    last_name: &str,
) -> Result<Uuid, sqlx::Error> {
    let record = sqlx::query!(
        r"
            INSERT INTO users ( email, role, first_name, last_name, status, email_verified, verification_level, primary_auth_method, password_hash, wallet_address, auth_id )
            VALUES ($1, 'admin', $2, $3, 'active', true, 'email', 'password', NULL, NULL, NULL)
            ON CONFLICT (email) WHERE email IS NOT NULL AND deleted_at IS NULL
            DO UPDATE SET
                role = 'admin',
                email_verified = true,
                verification_level = 'email',
                primary_auth_method = 'password',
                updated_at = NOW()
            RETURNING id
        ",
        email,
        first_name,
        last_name,
    )
    .fetch_one(pool)
    .await?;
    Ok(record.id)
}
