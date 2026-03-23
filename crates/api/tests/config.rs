//! Unit tests for `Config::from_env()` validation logic.
//!
//! All tests are `#[serial]` because `Config::from_env()` reads process-global env vars.
//! The `unsafe` blocks are sound: `serial_test` guarantees no concurrent access.

#![allow(unsafe_code)]

use secrecy::ExposeSecret;
use serial_test::serial;

use api::ServerConfig;

/// Env var keys used by `Config::from_env()`.
const CONFIG_ENV_VARS: [&str; 5] = [
    "DATABASE_URL",
    "REDIS_URL",
    "SUPABASE_JWT_SECRET",
    "PORT",
    "CORS_ORIGIN",
];

/// Removes all config-related env vars to ensure test isolation.
///
/// # Safety
///
/// Must only be called when no other threads read these env vars (ensured by `#[serial]`).
unsafe fn clear_all_config_env_vars() {
    for key in CONFIG_ENV_VARS {
        // SAFETY: #[serial] ensures no concurrent env var access.
        unsafe { std::env::remove_var(key) };
    }
}

/// Sets the three required env vars with valid values.
///
/// # Safety
///
/// Must only be called when no other threads read these env vars (ensured by `#[serial]`).
unsafe fn set_required_env_vars() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");
        std::env::set_var("REDIS_URL", "redis://127.0.0.1:6379");
        std::env::set_var(
            "SUPABASE_JWT_SECRET",
            "test-secret-that-is-at-least-32-bytes!",
        );
    }
}

#[test]
#[serial]
fn from_env_succeeds_with_all_required_vars() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
    }

    let config = ServerConfig::from_env().expect("Should succeed with all required vars");

    assert_eq!(
        config.database_url.expose_secret(),
        "postgres://localhost/test"
    );
    assert_eq!(config.redis_url.expose_secret(), "redis://127.0.0.1:6379");
    assert_eq!(config.port, 8080, "Default port should be 8080");
    assert_eq!(
        config.cors_origin, "http://localhost:8080",
        "Default CORS origin"
    );
}

#[test]
#[serial]
fn from_env_fails_without_database_url() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        std::env::set_var("REDIS_URL", "redis://127.0.0.1:6379");
        std::env::set_var(
            "SUPABASE_JWT_SECRET",
            "test-secret-that-is-at-least-32-bytes!",
        );
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("database_url"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_without_redis_url() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        std::env::set_var("DATABASE_URL", "postgres://localhost/test");
        std::env::set_var(
            "SUPABASE_JWT_SECRET",
            "test-secret-that-is-at-least-32-bytes!",
        );
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("redis_url"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_with_invalid_redis_url_scheme() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        std::env::set_var("REDIS_URL", "http://127.0.0.1:6379");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("REDIS_URL must start with redis://"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_validates_cors_origin_scheme() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        std::env::set_var("CORS_ORIGIN", "ftp://invalid.com");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("CORS_ORIGIN must start with http://"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_rejects_port_zero() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        std::env::set_var("PORT", "0");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("PORT cannot be 0"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_rejects_short_jwt_secret() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        std::env::set_var("SUPABASE_JWT_SECRET", "too-short");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("SUPABASE_JWT_SECRET must be at least 32 bytes"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_rejects_invalid_port() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        std::env::set_var("PORT", "not_a_number");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(err.to_string().contains("port"), "Unexpected error: {err}");
}
