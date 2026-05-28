//! Integration tests for the `VerifiedUser<V>` extractor.
//!
//! The extractor reads the user's `verification_level` straight off the JWT
//! claim, so these tests sign minted access tokens with each level (plus the
//! legacy "no level" variant) and exercise `from_request_parts` directly.
//! With no `VerifiedUser`-gated HTTP route mounted yet (the pilot wiring is
//! deferred until the frontend can render the 403 + verify CTA), the
//! extractor is the contract under test.

#![cfg(feature = "integration")]

mod common;

use axum::{
    extract::FromRequestParts,
    http::{Method, Request, header::COOKIE, request::Parts},
};
use sqlx::PgPool;

use api::{
    UserRole,
    common::VerificationLevel,
    services::auth::{AuthError, AuthGateError, EmailVerified, VerifiedUser},
};
use common::{TestEnv, login_and_extract, mint_access_token_with_level, setup_test_server};

/// Build request `Parts` with (or without) an `access_token` cookie. The
/// extractor only inspects headers + state, so a `()`-bodied request is
/// enough to drive `from_request_parts` end-to-end.
fn parts_with_access_cookie(cookie: Option<&str>) -> Parts {
    let mut builder = Request::builder().method(Method::GET).uri("/");
    if let Some(value) = cookie {
        builder = builder.header(COOKIE, format!("access_token={value}"));
    }
    let req = builder.body(()).expect("build request");
    let (parts, ()) = req.into_parts();
    parts
}

/// Invokes `VerifiedUser::<EmailVerified>::from_request_parts` against the
/// supplied (or absent) cookie. Returns the raw `Result` so each test can
/// pattern-match on the rejection variant rather than a serialised body.
async fn run_email_gate(
    env: &TestEnv,
    access_cookie: Option<&str>,
) -> Result<VerifiedUser<EmailVerified>, AuthGateError> {
    let mut parts = parts_with_access_cookie(access_cookie);
    VerifiedUser::<EmailVerified>::from_request_parts(&mut parts, &env.state).await
}

/// `verification_level = 'none'` is below `email`: the extractor rejects with
/// the verification-required variant carrying the required threshold so the
/// client can render the right CTA.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn email_gate_blocks_unverified(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;

    let token = mint_access_token_with_level(
        session.user_id,
        UserRole::Tenant,
        &env.jwt_secret,
        Some(VerificationLevel::None),
    );

    match run_email_gate(&env, Some(&token)).await {
        Err(AuthGateError::VerificationRequired { required }) => {
            assert_eq!(required, VerificationLevel::Email);
        }
        other => panic!("expected VerificationRequired, got {other:?}"),
    }
}

/// `verification_level = 'email'` exactly meets the gate.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn email_gate_allows_email_level(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;

    let token = mint_access_token_with_level(
        session.user_id,
        UserRole::Tenant,
        &env.jwt_secret,
        Some(VerificationLevel::Email),
    );
    assert!(
        run_email_gate(&env, Some(&token)).await.is_ok(),
        "email level must pass the email gate",
    );
}

/// `verification_level = 'identity'` is monotonically above the gate, so a
/// higher level still satisfies a lower requirement.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn email_gate_allows_higher_identity_level(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;

    let token = mint_access_token_with_level(
        session.user_id,
        UserRole::Tenant,
        &env.jwt_secret,
        Some(VerificationLevel::Identity),
    );
    assert!(
        run_email_gate(&env, Some(&token)).await.is_ok(),
        "identity satisfies the lower email gate",
    );
}

/// A token issued before the `verification_level` claim shipped (the
/// `Option::None` variant) is rejected rather than silently treated as
/// `none` - the user re-logs in and picks up a level-bearing token instead
/// of us hitting the DB on every gated request.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn email_gate_rejects_token_missing_level_claim(pool: PgPool) {
    let env = setup_test_server(pool, true).await;
    let session = login_and_extract(&env).await;

    let token =
        mint_access_token_with_level(session.user_id, UserRole::Tenant, &env.jwt_secret, None);
    match run_email_gate(&env, Some(&token)).await {
        Err(AuthGateError::VerificationRequired { required }) => {
            assert_eq!(required, VerificationLevel::Email);
        }
        other => panic!("expected VerificationRequired for legacy token, got {other:?}"),
    }
}

/// Without an access cookie the extractor surfaces the auth-layer error, not
/// a 403. `AuthUser` runs first, so unauthenticated requests look identical
/// with or without gating - the gate variants are reserved for callers who
/// authenticated but failed the threshold.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn email_gate_returns_auth_error_without_cookie(pool: PgPool) {
    let env = setup_test_server(pool, true).await;

    match run_email_gate(&env, None).await {
        Err(AuthGateError::Auth(AuthError::MissingAccessToken)) => {}
        other => panic!("expected Auth(MissingAccessToken), got {other:?}"),
    }
}
