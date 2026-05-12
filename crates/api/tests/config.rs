//! Unit tests for `Config::from_env()` validation logic.
//!
//! All tests are `#[serial]` because `Config::from_env()` reads process-global env vars.
//! The `unsafe` blocks are sound: `serial_test` guarantees no concurrent access.

#![allow(unsafe_code)]

use secrecy::ExposeSecret;
use serial_test::serial;

use api::ServerConfig;

/// Env var keys used by `Config::from_env()`.
const CONFIG_ENV_VARS: [&str; 11] = [
    "DATABASE_URL",
    "REDIS_URL",
    "SUPABASE_JWT_SECRET",
    "PORT",
    "CORS_ORIGIN",
    "S3_BUCKET",
    "S3_REGION",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "S3_PUBLIC_URL_BASE",
];

/// Default test values for every `S3_*` variable. Sets the full block
/// so individual tests can `remove_var` only the field they want to
/// assert on. Reused across the S3 fail-fast cases.
///
/// # Safety
///
/// Must only be called when no other threads read these env vars
/// (ensured by `#[serial]`).
unsafe fn set_all_s3_env_vars() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        std::env::set_var("S3_BUCKET", "test-bucket");
        std::env::set_var("S3_REGION", "us-east-1");
        std::env::set_var("S3_ENDPOINT", "http://localhost:9000");
        std::env::set_var("S3_ACCESS_KEY", "minioadmin");
        std::env::set_var("S3_SECRET_KEY", "minioadmin");
    }
}

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
            "test-secret-that-is-at-least-sixty-four-bytes-long-for-HS256-security!",
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
            "test-secret-that-is-at-least-sixty-four-bytes-long-for-HS256-security!",
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
            "test-secret-that-is-at-least-sixty-four-bytes-long-for-HS256-security!",
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
            .contains("SUPABASE_JWT_SECRET must be at least 64 bytes"),
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

#[test]
#[serial]
fn from_env_leaves_s3_unset_when_bucket_missing() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
    }

    let config = ServerConfig::from_env().expect("Should succeed without any S3 vars");
    assert!(
        config.s3.is_none(),
        "config.s3 must be None when S3_BUCKET is unset",
    );
}

#[test]
#[serial]
fn from_env_populates_s3_when_full_block_present() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        set_all_s3_env_vars();
    }

    let config = ServerConfig::from_env().expect("Should succeed with full S3 block");
    let s3 = config.s3.expect("config.s3 must be populated");
    assert_eq!(s3.bucket, "test-bucket");
    assert_eq!(s3.region, "us-east-1");
    assert_eq!(s3.endpoint, "http://localhost:9000");
    assert_eq!(s3.access_key.expose_secret(), "minioadmin");
    assert_eq!(s3.secret_key.expose_secret(), "minioadmin");
    assert_eq!(
        s3.public_url_base, "http://localhost:9000/test-bucket",
        "public_url_base must default to {{endpoint}}/{{bucket}}",
    );
}

#[test]
#[serial]
fn from_env_uses_explicit_public_url_base_when_set() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        set_all_s3_env_vars();
        std::env::set_var("S3_PUBLIC_URL_BASE", "https://cdn.example.com/media");
    }

    let s3 = ServerConfig::from_env()
        .expect("Should succeed")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(s3.public_url_base, "https://cdn.example.com/media");
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_region() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        set_all_s3_env_vars();
        std::env::remove_var("S3_REGION");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_REGION missing"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_endpoint() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        set_all_s3_env_vars();
        std::env::remove_var("S3_ENDPOINT");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_ENDPOINT missing"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_access_key() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        set_all_s3_env_vars();
        std::env::remove_var("S3_ACCESS_KEY");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_ACCESS_KEY missing"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_secret_key() {
    // SAFETY: #[serial] ensures no concurrent env var access.
    unsafe {
        clear_all_config_env_vars();
        set_required_env_vars();
        set_all_s3_env_vars();
        std::env::remove_var("S3_SECRET_KEY");
    }

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_SECRET_KEY missing"),
        "Unexpected error: {err}",
    );
}
