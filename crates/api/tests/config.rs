//! Unit tests for `Config::from_env()` validation logic.
//!
//! All tests are `#[serial]` because `Config::from_env()` reads process-global env vars.
//! The `unsafe` blocks are sound: `serial_test` guarantees no concurrent access.

#![allow(unsafe_code)]

use secrecy::ExposeSecret;
use serial_test::serial;

use api::ServerConfig;

/// Env var keys used by `Config::from_env()`. Drives the clear-all phase
/// of [`set_env_vars`] so individual tests do not need to enumerate which
/// keys to scrub.
const CONFIG_ENV_VARS: [&str; 12] = [
    "DATABASE_URL",
    "REDIS_URL",
    "SUPABASE_JWT_SECRET",
    "PORT",
    "CORS_ORIGIN",
    "REQUEST_BODY_LIMIT_MB",
    "S3_BUCKET",
    "S3_REGION",
    "S3_ENDPOINT",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "S3_PUBLIC_URL_BASE",
];

/// Canonical "everything required by `from_env`" set. Reused as the base
/// group by every test that just needs a happy starting point and then
/// overrides one knob.
const REQUIRED_ENV: &[(&str, &str)] = &[
    ("DATABASE_URL", "postgres://localhost/test"),
    ("REDIS_URL", "redis://127.0.0.1:6379"),
    (
        "SUPABASE_JWT_SECRET",
        "test-secret-that-is-at-least-sixty-four-bytes-long-for-HS256-security!",
    ),
];

/// Canonical full S3 block. Composed with [`REQUIRED_ENV`] for tests that
/// exercise S3 happy paths or the `validate()` scheme guard.
const FULL_S3_ENV: &[(&str, &str)] = &[
    ("S3_BUCKET", "test-bucket"),
    ("S3_REGION", "us-east-1"),
    ("S3_ENDPOINT", "http://localhost:9000"),
    ("S3_ACCESS_KEY", "minioadmin"),
    ("S3_SECRET_KEY", "minioadmin"),
];

/// Clears every key in [`CONFIG_ENV_VARS`], then applies each `(key, value)`
/// pair from the supplied groups in order. Groups are concatenated, which
/// lets a test compose a base set with overrides without an intermediate
/// `.concat()` allocation at the call site.
///
/// The single `unsafe` block lives here so test bodies stay plain `fn`:
/// the safety contract (no concurrent reads of process env) is enforced
/// by `#[serial]` on each `#[test]`.
fn set_env_vars(groups: &[&[(&str, &str)]]) {
    // SAFETY: every `#[test]` is also `#[serial]`, so the
    // `serial_test` lock guarantees that no other thread observes
    // these env vars while we are mutating them.
    unsafe {
        for key in CONFIG_ENV_VARS {
            std::env::remove_var(key);
        }
        for group in groups {
            for &(key, value) in *group {
                std::env::set_var(key, value);
            }
        }
    }
}

#[test]
#[serial]
fn from_env_succeeds_with_all_required_vars() {
    set_env_vars(&[REQUIRED_ENV]);

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
    set_env_vars(&[&[
        ("REDIS_URL", "redis://127.0.0.1:6379"),
        (
            "SUPABASE_JWT_SECRET",
            "test-secret-that-is-at-least-sixty-four-bytes-long-for-HS256-security!",
        ),
    ]]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("database_url"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_without_redis_url() {
    set_env_vars(&[&[
        ("DATABASE_URL", "postgres://localhost/test"),
        (
            "SUPABASE_JWT_SECRET",
            "test-secret-that-is-at-least-sixty-four-bytes-long-for-HS256-security!",
        ),
    ]]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("redis_url"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_fails_with_invalid_redis_url_scheme() {
    set_env_vars(&[REQUIRED_ENV, &[("REDIS_URL", "http://127.0.0.1:6379")]]);

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
    set_env_vars(&[REQUIRED_ENV, &[("CORS_ORIGIN", "ftp://invalid.com")]]);

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
    set_env_vars(&[REQUIRED_ENV, &[("PORT", "0")]]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("PORT cannot be 0"),
        "Unexpected error: {err}"
    );
}

#[test]
#[serial]
fn from_env_rejects_short_jwt_secret() {
    set_env_vars(&[REQUIRED_ENV, &[("SUPABASE_JWT_SECRET", "too-short")]]);

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
    set_env_vars(&[REQUIRED_ENV, &[("PORT", "not_a_number")]]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(err.to_string().contains("port"), "Unexpected error: {err}");
}

/// Regression guard for the `REQUEST_BODY_LIMIT_MB` validation floor.
///
/// The outer body cap must leave ~3 MiB of multipart headroom above the
/// largest per-handler cap (`MAX_AVATAR_BYTES` = 5 MiB), so the minimum safe
/// value is 8 MiB. A value of 1-7 passes the old `== 0` guard but causes
/// `RequestBodyLimitLayer` to cut the multipart stream mid-parse, surfacing as
/// `IncompleteFieldData -> 400` instead of the documented `413`.
///
/// Expected to FAIL on the pre-fix code: the `== 0` guard accepts 4 and 7.
#[test]
#[serial]
fn from_env_rejects_body_limit_below_floor() {
    for too_small in ["1", "4", "7"] {
        set_env_vars(&[REQUIRED_ENV, &[("REQUEST_BODY_LIMIT_MB", too_small)]]);
        let err = ServerConfig::from_env().unwrap_err();
        assert!(
            err.to_string().contains("REQUEST_BODY_LIMIT_MB"),
            "{too_small} MiB must be rejected (below the 8 MiB floor), got: {err}",
        );
    }

    set_env_vars(&[REQUIRED_ENV, &[("REQUEST_BODY_LIMIT_MB", "8")]]);
    ServerConfig::from_env().expect("8 MiB is the minimum valid body limit");
}

#[test]
#[serial]
fn from_env_defaults_body_limit_to_8_when_unset() {
    set_env_vars(&[REQUIRED_ENV]);

    let config = ServerConfig::from_env().expect("Should succeed with default body limit");
    assert_eq!(
        config.request_body_limit_mb, 8,
        "REQUEST_BODY_LIMIT_MB must default to 8 when unset",
    );
}

#[test]
#[serial]
fn from_env_rejects_body_limit_zero() {
    set_env_vars(&[REQUIRED_ENV, &[("REQUEST_BODY_LIMIT_MB", "0")]]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("REQUEST_BODY_LIMIT_MB"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_rejects_non_integer_body_limit() {
    set_env_vars(&[REQUIRED_ENV, &[("REQUEST_BODY_LIMIT_MB", "abc")]]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("request_body_limit_mb"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_accepts_valid_body_limit_override() {
    set_env_vars(&[REQUIRED_ENV, &[("REQUEST_BODY_LIMIT_MB", "16")]]);

    let config = ServerConfig::from_env().expect("16 MiB is a valid body limit");
    assert_eq!(config.request_body_limit_mb, 16);
}

#[test]
#[serial]
fn from_env_leaves_s3_unset_when_bucket_missing() {
    set_env_vars(&[REQUIRED_ENV]);

    let config = ServerConfig::from_env().expect("Should succeed without any S3 vars");
    assert!(
        config.s3.is_none(),
        "config.s3 must be None when S3_BUCKET is unset",
    );
}

/// `S3_BUCKET` is the gate that opens the whole S3 block. With it unset, the
/// other `S3_*` vars (region, endpoint, credentials, public URL base) MUST be
/// inert - `from_env` neither reads them for validation nor populates
/// `config.s3` from them. This pins that "all-or-nothing" semantic so a future
/// refactor cannot silently start partial-loading S3 from leftover env vars
/// after an operator removes `S3_BUCKET` to roll back to stub storage.
#[test]
#[serial]
fn from_env_ignores_s3_vars_when_bucket_unset() {
    set_env_vars(&[
        REQUIRED_ENV,
        &[
            ("S3_REGION", "us-east-1"),
            ("S3_ENDPOINT", "http://localhost:9000"),
            ("S3_ACCESS_KEY", "minioadmin"),
            ("S3_SECRET_KEY", "minioadmin"),
            ("S3_PUBLIC_URL_BASE", "https://cdn.example.com/media"),
        ],
    ]);

    let config = ServerConfig::from_env()
        .expect("Partial S3 block without S3_BUCKET must NOT fail validation");
    assert!(
        config.s3.is_none(),
        "config.s3 must remain None when S3_BUCKET is unset, even if other S3_* vars are present",
    );
}

#[test]
#[serial]
fn from_env_populates_s3_when_full_block_present() {
    set_env_vars(&[REQUIRED_ENV, FULL_S3_ENV]);

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
    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_PUBLIC_URL_BASE", "https://cdn.example.com/media")],
    ]);

    let s3 = ServerConfig::from_env()
        .expect("Should succeed")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(s3.public_url_base, "https://cdn.example.com/media");
}

/// Regression guard for the trailing-slash bug in the EXPLICIT
/// `S3_PUBLIC_URL_BASE` branch.
///
/// `from_env_normalizes_trailing_slash_in_default_public_url_base` above only
/// covers the auto-derived `unwrap_or_else` branch, which already trims via
/// `endpoint.trim_end_matches('/')`. The other branch - operator sets
/// `S3_PUBLIC_URL_BASE` explicitly - stored the value verbatim, so a value like
/// `http://localhost:9000/leasefi-media/` propagated all the way through
/// `S3MediaStorage::put`, which builds `format!("{public_url_base}/{key}")` and
/// produced `http://.../leasefi-media//avatars/<file>` (double slash).
///
/// The fix normalizes both branches identically. This test pins that the
/// explicit value loses its trailing slash, while a value without one is
/// unchanged.
///
/// Expected to FAIL on the pre-fix code at the first assertion.
#[test]
#[serial]
fn from_env_normalizes_trailing_slash_in_explicit_public_url_base() {
    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_PUBLIC_URL_BASE", "http://localhost:9000/leasefi-media/")],
    ]);
    let s3 = ServerConfig::from_env()
        .expect("trailing-slash explicit public_url_base must still be accepted")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(
        s3.public_url_base, "http://localhost:9000/leasefi-media",
        "trailing slash in S3_PUBLIC_URL_BASE must be trimmed to prevent double-slash object URLs",
    );

    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_PUBLIC_URL_BASE", "https://cdn.example.com/media")],
    ]);
    let s3 = ServerConfig::from_env()
        .expect("no-trailing-slash explicit public_url_base must be accepted")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(
        s3.public_url_base, "https://cdn.example.com/media",
        "without a trailing slash, explicit public_url_base must remain byte-identical",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_region() {
    set_env_vars(&[
        REQUIRED_ENV,
        &[
            ("S3_BUCKET", "test-bucket"),
            ("S3_ENDPOINT", "http://localhost:9000"),
            ("S3_ACCESS_KEY", "minioadmin"),
            ("S3_SECRET_KEY", "minioadmin"),
        ],
    ]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_REGION missing"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_endpoint() {
    set_env_vars(&[
        REQUIRED_ENV,
        &[
            ("S3_BUCKET", "test-bucket"),
            ("S3_REGION", "us-east-1"),
            ("S3_ACCESS_KEY", "minioadmin"),
            ("S3_SECRET_KEY", "minioadmin"),
        ],
    ]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_ENDPOINT missing"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_access_key() {
    set_env_vars(&[
        REQUIRED_ENV,
        &[
            ("S3_BUCKET", "test-bucket"),
            ("S3_REGION", "us-east-1"),
            ("S3_ENDPOINT", "http://localhost:9000"),
            ("S3_SECRET_KEY", "minioadmin"),
        ],
    ]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_ACCESS_KEY missing"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_bucket_set_without_secret_key() {
    set_env_vars(&[
        REQUIRED_ENV,
        &[
            ("S3_BUCKET", "test-bucket"),
            ("S3_REGION", "us-east-1"),
            ("S3_ENDPOINT", "http://localhost:9000"),
            ("S3_ACCESS_KEY", "minioadmin"),
        ],
    ]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string().contains("S3_SECRET_KEY missing"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_fails_when_s3_endpoint_has_no_scheme() {
    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_ENDPOINT", "s3.amazonaws.com")],
    ]);

    let err = ServerConfig::from_env().unwrap_err();
    assert!(
        err.to_string()
            .contains("S3_ENDPOINT must start with http:// or https://"),
        "Unexpected error: {err}",
    );
}

#[test]
#[serial]
fn from_env_accepts_https_s3_endpoint() {
    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_ENDPOINT", "https://s3.us-east-1.amazonaws.com")],
    ]);

    let s3 = ServerConfig::from_env()
        .expect("https endpoint must be accepted")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(s3.endpoint, "https://s3.us-east-1.amazonaws.com");
}

#[test]
#[serial]
fn from_env_accepts_http_localhost_s3_endpoint() {
    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_ENDPOINT", "http://localhost:9000")],
    ]);

    let s3 = ServerConfig::from_env()
        .expect("http://localhost must be accepted")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(s3.endpoint, "http://localhost:9000");
}

/// Regression guard for the `//bucket` double-slash bug in the default
/// `public_url_base`.
///
/// Loading with `S3_ENDPOINT=http://localhost:9000/` (note the trailing slash)
/// used to build the default as `format!("{endpoint}/{bucket}")` literally,
/// producing `http://localhost:9000//test-bucket`. Both `MinIO` and AWS
/// path-style endpoints normalize that on the wire (the object can still be
/// PUT), but the returned `avatar_url` carries the double slash all the way to
/// the frontend, where some CDNs (Cloudflare, Fastly) and some browser caches
/// treat `//key` as a different resource from `/key`, breaking cache hits
/// across upload sessions.
///
/// The fix normalizes by stripping the trailing slash. This test covers BOTH
/// variants:
/// 1. trailing slash in `S3_ENDPOINT` -> default must NOT double-slash.
/// 2. no trailing slash -> default stays correct (regression guard against an
///    over-eager trimmer that strips real path segments).
///
/// Expected to FAIL on the pre-fix code at variant 1.
#[test]
#[serial]
fn from_env_normalizes_trailing_slash_in_default_public_url_base() {
    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_ENDPOINT", "http://localhost:9000/")],
    ]);
    let s3 = ServerConfig::from_env()
        .expect("trailing-slash endpoint must still be accepted")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(
        s3.public_url_base, "http://localhost:9000/test-bucket",
        "trailing slash in S3_ENDPOINT must NOT produce a double slash in the default public_url_base",
    );

    set_env_vars(&[
        REQUIRED_ENV,
        FULL_S3_ENV,
        &[("S3_ENDPOINT", "http://localhost:9000")],
    ]);
    let s3 = ServerConfig::from_env()
        .expect("no-trailing-slash endpoint must be accepted")
        .s3
        .expect("config.s3 must be populated");
    assert_eq!(
        s3.public_url_base, "http://localhost:9000/test-bucket",
        "without a trailing slash, default public_url_base must remain unchanged",
    );
}
