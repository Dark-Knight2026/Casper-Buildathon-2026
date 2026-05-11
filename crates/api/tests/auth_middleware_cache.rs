//! Regression tests for the `require_auth` -> handler extractor cache
//! contract.
//!
//! The module-level comment in `services/auth/middleware.rs` documents
//! the auth hot path as "one DB read per protected request". To uphold
//! that contract, `require_auth` must stash the validated `AuthUser`
//! into request extensions, and `AuthUser::from_request_parts` must
//! pick the cached entry up instead of re-running the full token
//! validation + DB lookup on every handler that takes `AuthUser`.

mod common;

use axum::{
    extract::FromRequestParts,
    http::{Request, header::COOKIE},
};
use sqlx::PgPool;

use api::AuthUser;

/// `AuthUser::from_request_parts` must short-circuit on a cached
/// `AuthUser` previously inserted into `parts.extensions` by
/// `require_auth`.
///
/// Probe: run the extractor once on a fresh `Parts` (DB is touched,
/// cutoff is NULL, returns Ok), then simulate `require_auth`'s cache
/// insert, then stamp `users.jwt_invalidate_before` to a value in the
/// future, then run the extractor a second time on the same `Parts`.
///
/// - **Pre-fix** (no cache check): the second call re-reads
///   `jwt_invalidate_before`, sees the future cutoff, observes
///   `claims.iat <= cutoff_ts`, and returns
///   `AuthError::TokenInvalidated`.
/// - **Post-fix**: the second call finds `AuthUser` in `parts.extensions`
///   and returns it without any DB I/O - the freshly-stamped cutoff is
///   ignored, which is exactly the semantics handlers downstream of
///   `require_auth` are entitled to.
///
/// The mutated cutoff is the discriminator: without the fix it travels
/// from DB into the extractor and flips Ok -> Err; with the fix the
/// extractor never reads it.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn from_request_parts_uses_cached_authuser_from_extensions(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    let state = env.state.clone();

    let request = Request::builder()
        .uri("/")
        .header(COOKIE, format!("access_token={}", session.access_token))
        .body(())
        .expect("build request");
    let (mut parts, _body) = request.into_parts();

    // First call - cutoff is NULL on a freshly-logged-in user, so the
    // extractor returns Ok after one DB lookup.
    let user1 = AuthUser::from_request_parts(&mut parts, &state)
        .await
        .expect("first extractor call must succeed with NULL cutoff");

    // Simulate what the fix in `require_auth` does: insert the
    // validated user into extensions BEFORE handlers run.
    parts.extensions.insert(AuthUser(user1.0.clone()));

    // Stamp a cutoff well past the token's `iat`. Any extractor call
    // that goes back to the DB after this point would see
    // `claims.iat <= cutoff_ts` and return `TokenInvalidated`.
    sqlx::query!(
        r"
            UPDATE users
            SET jwt_invalidate_before = NOW() + INTERVAL '1 hour'
            WHERE id = $1
        ",
        session.user_id,
    )
    .execute(&pool)
    .await
    .expect("stamp jwt_invalidate_before");

    // Second call - must observe the cached AuthUser, not the
    // freshly-stamped cutoff.
    let result = AuthUser::from_request_parts(&mut parts, &state).await;
    assert!(
        result.is_ok(),
        "extensions-cached AuthUser must short-circuit the DB lookup; got {result:?}",
    );
}
