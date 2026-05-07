//! Integration tests for `DELETE /api/v1/users/me`.
//!
//! Pin the gate ordering documented at the handler:
//! confirmation-string -> recent-auth -> active-leases. A regression that
//! re-orders any of these surfaces here as a different status code for
//! the same input.
//!
//! The destructive happy-path test also locks down every side effect of
//! [`api::services::users::soft_delete_user`] (`wallet_connections` wiped,
//! cached `users.wallet_address` zeroed by trigger, email rewritten to
//! the placeholder, refresh tokens revoked, audit row written) so a
//! regression in any one statement is caught with a single failed
//! assertion rather than a tangle of downstream symptoms.

mod common;

use core::time::Duration as CoreDuration;

use axum::http::StatusCode;
use axum_test::http::header::COOKIE;
use casper_types::AsymmetricType;
use chrono::{Duration as ChronoDuration, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use api::{
    Claims, UserRole,
    common::{JWT_AUDIENCE, JWT_ISSUER, TokenType, VerificationLevel},
};
use common::{LoggedSession, TestEnv};

/// Re-logs in for the same wallet, returning a fresh access token.
///
/// Mirrors the helper in `users_role.rs`. Lifted verbatim because the
/// fact that two destructive flows need the same "re-login under the
/// same keypair" pattern does NOT mean they should share one helper -
/// the two test files need to evolve independently (they exercise
/// different gates), and pinning the helper here makes each file
/// readable on its own.
async fn relogin_with_keypair(env: &TestEnv, session: &LoggedSession) -> String {
    tokio::time::sleep(CoreDuration::from_secs(1)).await;

    let wallet_address = session.public_key.to_hex();
    let nonce_body = env
        .server
        .get("/api/v1/auth/nonce")
        .add_query_param("wallet_address", &wallet_address)
        .await
        .json::<Value>();
    let signature_hex = common::sign_with_prefix(
        nonce_body["message"].as_str().unwrap(),
        &session.secret_key,
        &session.public_key,
    );

    let login_response = env
        .server
        .post("/api/v1/auth/login")
        .json(&serde_json::json!({
            "wallet_address": wallet_address,
            "signature": signature_hex,
        }))
        .await;
    assert_eq!(login_response.status_code(), StatusCode::OK);
    login_response.cookie("access_token").value().to_owned()
}

/// Mints a JWT with a custom `iat` offset (in seconds) into the past.
///
/// Identical to the helper in `users_role.rs` for the same reason: the
/// 403 test must drive `iat <= NOW() - 6 minutes` without a 5-minute
/// CI sleep, and minting the token directly with the test JWT secret
/// is the only way to exercise the gate deterministically.
fn mint_access_token_with_backdated_iat(
    user_id: Uuid,
    role: UserRole,
    secret: &str,
    iat_offset_secs: i64,
) -> String {
    let now = Utc::now();
    let exp = now
        .checked_add_signed(ChronoDuration::hours(24))
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

/// Seeds an `active` lease where `landlord_id = user_id`, returning
/// nothing - the test only asserts on the EXISTS gate by status code.
///
/// Lifted verbatim from `users_role.rs::seed_active_lease_as_landlord`
/// for the same reason as the re-login helper: the two destructive
/// flows need to evolve independently, and copy here keeps each test
/// file readable on its own.
async fn seed_active_lease_as_landlord(pool: &PgPool, user_id: Uuid) {
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

/// Happy path: 204, every documented side effect lands, and the access
/// cookie that just authenticated the request is rejected on the very
/// next call. Combines the per-effect assertions into a single test
/// because they are all coupled to "`soft_delete_user` committed
/// successfully" - splitting them would force each variant to repeat
/// the login-and-delete preamble.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_me_happy_path_revokes_session_and_clears_state(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    let response = env
        .server
        .delete("/api/v1/users/me")
        .add_header(
            COOKIE,
            format!(
                "access_token={}; refresh_token={}",
                session.access_token, session.refresh_token,
            ),
        )
        .json(&serde_json::json!({ "confirm": "delete-my-account" }))
        .await;

    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);

    // Both auth cookies cleared - browser drops them on receipt.
    let cleared_access = response.cookie("access_token");
    let cleared_refresh = response.cookie("refresh_token");
    assert_eq!(
        cleared_access.value(),
        "",
        "delete must clear access_token cookie",
    );
    assert_eq!(
        cleared_refresh.value(),
        "",
        "delete must clear refresh_token cookie",
    );

    // users row: deleted_at stamped, jwt_invalidate_before stamped,
    // wallet_address NULL (via wallet_connections trigger), email
    // rewritten to the per-user placeholder.
    let row = sqlx::query!(
        r"
            SELECT deleted_at, jwt_invalidate_before, wallet_address, email
            FROM users
            WHERE id = $1
        ",
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        row.deleted_at.is_some(),
        "deleted_at must be stamped on success",
    );
    assert!(
        row.jwt_invalidate_before.is_some(),
        "jwt_invalidate_before must be stamped to kill outstanding access tokens",
    );
    assert!(
        row.wallet_address.is_none(),
        "users.wallet_address must be zeroed by the wallet_connections trigger",
    );
    let email = row.email.expect("placeholder email must be set");
    assert!(
        email.starts_with("deleted-") && email.ends_with("@deleted.local"),
        "email must be rewritten to deleted-{{uuid}}@deleted.local, got {email:?}",
    );
    assert!(
        email.contains(&session.user_id.to_string()),
        "placeholder email must embed the user uuid for audit traceability, got {email:?}",
    );

    // wallet_connections: every row for the user is gone.
    let wallet_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "n!" FROM wallet_connections WHERE user_id = $1"#,
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        wallet_count, 0,
        "wallet_connections must be wiped for the deleted user",
    );

    // refresh_tokens: every row that existed for the user is now revoked.
    let active_refresh: i64 = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "n!" FROM refresh_tokens
            WHERE user_id = $1 AND revoked_at IS NULL
        "#,
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        active_refresh, 0,
        "every active refresh row must be revoked after self-delete",
    );

    // Old access token is now rejected on the next call. The exact
    // status is 404 (not 401) by design: `fetch_jwt_invalidate_before`
    // filters on `deleted_at IS NULL`, so for a soft-deleted user the
    // middleware sees `Ok(None)` ("no cutoff") and lets the JWT through
    // - the rejection happens one step later, when `fetch_user_profile`
    // (also `WHERE deleted_at IS NULL`) returns RowNotFound. The
    // middleware comment in `auth/db.rs::fetch_jwt_invalidate_before`
    // calls this out explicitly, framing the deleted-user case as
    // "delegated to the handler's profile load."
    let me = env
        .server
        .get("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .await;
    assert_eq!(
        me.status_code(),
        StatusCode::NOT_FOUND,
        "deleted user's access cookie must yield 404 on the next protected call",
    );
}

/// Audit log: a successful deletion writes one `audit_logs` row whose
/// action is `self_delete_user`. Pin separately from the happy path so
/// a future regression that swaps the action literal (or accidentally
/// drops the INSERT from the transaction) lands here, not in
/// production audit-trail review.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_me_writes_audit_log(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    let response = env
        .server
        .delete("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&serde_json::json!({ "confirm": "delete-my-account" }))
        .await;
    assert_eq!(response.status_code(), StatusCode::NO_CONTENT);

    let row = sqlx::query!(
        r"
            SELECT action, resource_type, resource_id, status
            FROM audit_logs
            WHERE user_id = $1 AND action = 'self_delete_user'
            ORDER BY created_at DESC
            LIMIT 1
        ",
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("audit_logs row must exist after self-delete");

    assert_eq!(row.action, "self_delete_user");
    assert_eq!(row.resource_type, "user");
    assert_eq!(row.resource_id.unwrap(), session.user_id);
    assert_eq!(row.status.as_deref(), Some("success"));
}

/// Confirmation-string gate: missing or wrong `confirm` returns 400 and
/// makes no DB change. Pin both the missing-field and wrong-value
/// shapes because serde-default rejection and the explicit equality
/// check are different code paths even though both surface as 400.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_me_without_confirmation_returns_400(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    // Missing field: serde rejection -> 400.
    let missing = env
        .server
        .delete("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&serde_json::json!({}))
        .await;
    assert_eq!(missing.status_code(), StatusCode::BAD_REQUEST);

    // Wrong value: handler equality check -> 400.
    let wrong = env
        .server
        .delete("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={}", session.access_token))
        .json(&serde_json::json!({ "confirm": "yes" }))
        .await;
    assert_eq!(wrong.status_code(), StatusCode::BAD_REQUEST);

    // Sanity: row still alive, no placeholder email, no audit row.
    let row = sqlx::query!(
        r"SELECT deleted_at, email FROM users WHERE id = $1",
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        row.deleted_at.is_none(),
        "rejected requests must not stamp deleted_at",
    );
    assert!(
        !row.email
            .as_deref()
            .is_some_and(|email| email.contains("@deleted.local")),
        "rejected requests must not rewrite email to placeholder",
    );

    let audit_count: i64 = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "n!" FROM audit_logs
            WHERE user_id = $1 AND action = 'self_delete_user'
        "#,
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        audit_count, 0,
        "rejected requests must not emit a self_delete_user audit row",
    );
}

/// Recent-auth gate: an access token whose `iat` is older than the
/// 5-minute window returns 403 with `reauthentication_required`. The
/// user row exists (so middleware passes), and we mint the backdated
/// token directly with the test JWT secret rather than waiting in CI.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_me_with_stale_iat_returns_403(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;

    // 6 minutes > 5-minute window -> 403.
    let stale_token = mint_access_token_with_backdated_iat(
        session.user_id,
        UserRole::Tenant,
        &env.jwt_secret,
        6 * 60,
    );

    let response = env
        .server
        .delete("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={stale_token}"))
        .json(&serde_json::json!({ "confirm": "delete-my-account" }))
        .await;

    assert_eq!(response.status_code(), StatusCode::FORBIDDEN);
    let body = response.json::<Value>();
    assert_eq!(
        body["error"].as_str().unwrap(),
        "reauthentication_required",
        "403 must use the stable client-facing code",
    );

    // Sanity: row still alive.
    let still_alive: bool = sqlx::query_scalar!(
        r#"SELECT (deleted_at IS NULL) AS "alive!" FROM users WHERE id = $1"#,
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        still_alive,
        "403 must not have soft-deleted the user despite reaching the handler",
    );
}

/// Active-leases gate: a user who is the `landlord_id` of an active
/// lease cannot delete their account. 409 with the stable
/// `active_leases_blocking` code so the UI can produce a targeted
/// "settle your leases first" message.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_me_with_active_lease_returns_409(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    seed_active_lease_as_landlord(&pool, session.user_id).await;

    // Re-login so the new `iat` outruns the 5-minute window unambiguously.
    // The landlord seed already happened, so the gate fires on the lease,
    // not on a stale iat.
    let access = relogin_with_keypair(&env, &session).await;

    let response = env
        .server
        .delete("/api/v1/users/me")
        .add_header(COOKIE, format!("access_token={access}"))
        .json(&serde_json::json!({ "confirm": "delete-my-account" }))
        .await;

    assert_eq!(response.status_code(), StatusCode::CONFLICT);
    let body = response.json::<Value>();
    assert_eq!(
        body["error"].as_str().unwrap(),
        "active_leases_blocking",
        "409 must use the stable client-facing code",
    );

    // Sanity: row still alive after blocked deletion.
    let still_alive: bool = sqlx::query_scalar!(
        r#"SELECT (deleted_at IS NULL) AS "alive!" FROM users WHERE id = $1"#,
        session.user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        still_alive,
        "409 must not have soft-deleted the user when the gate blocks",
    );
}

/// Race-condition regression: an active lease created in the window
/// between the handler's outer `has_active_lease_participation` check
/// and the inner `soft_delete_user` transaction must NOT be ignored.
///
/// The bug: `delete_me` runs the lease gate against the pool directly
/// (no transaction isolation) and `soft_delete_user` opens its own tx
/// without re-checking, so a concurrent lease INSERT in the window
/// silently bypasses the gate - the user gets soft-deleted while an
/// active lease still references them as `landlord_id`. Because
/// soft-delete is irreversible, this leaves the contractual
/// counterparty pointing at a tombstone with no way to renegotiate.
///
/// The test reproduces the race deterministically by mirroring the
/// handler's two-step sequence at the db layer with a manual lease
/// insertion in the gap. The fix must move the lease check inside the
/// soft-delete transaction (matching the `patch_me_role` pattern of
/// `lock_user_role` + `has_blocking_leases` under one tx), so the
/// post-fix behavior is: `soft_delete_user` returns an error AND
/// `users.deleted_at` stays NULL when an active lease exists.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_me_concurrent_lease_does_not_orphan_user(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), true).await;
    let session = common::login_and_extract(&env).await;
    let user_id = session.user_id;

    // Step 1: outer lease gate passes (no lease yet) - this mirrors
    // `delete_me`'s `has_active_lease_participation(&state.db, ...)`
    // call against the pool, outside any transaction.
    let blocked_before = api::services::users::has_active_lease_participation(&pool, user_id)
        .await
        .expect("lease check must succeed");
    assert!(
        !blocked_before,
        "precondition: no active lease yet, so the outer gate would let the handler through",
    );

    // Step 2: a parallel `POST /api/v1/leases` lands in the window
    // between the gate and `soft_delete_user`. Simulated by direct
    // INSERT to keep the timing deterministic.
    seed_active_lease_as_landlord(&pool, user_id).await;

    // Step 3: `soft_delete_user` is invoked - same call the handler
    // makes after the gate passes. With the bug, it commits without
    // re-checking and the user gets soft-deleted with the active
    // lease still pointing at them. The return value is intentionally
    // discarded: the post-fix contract may surface "blocked" as
    // either `Err(...)` or `Ok(SoftDeleteOutcome::LeaseBlocking)`,
    // and the load-bearing invariant is asserted below on
    // `users.deleted_at`, not on the result shape.
    let _ = api::services::users::soft_delete_user(&pool, user_id).await;

    // Post-fix invariant: the user row stays alive. Pre-fix, this is
    // where the test fails - `deleted_at` is stamped despite the
    // lease, leaving an unrecoverable inconsistency.
    let row = sqlx::query!(
        r"
            SELECT deleted_at
            FROM users
            WHERE id = $1
        ",
        user_id,
    )
    .fetch_one(&pool)
    .await
    .expect("user row must exist");
    assert!(
        row.deleted_at.is_none(),
        "user must not be soft-deleted while an active lease still references them as landlord_id",
    );

    // Sanity: the lease itself is still active and still points at
    // the user. If the user got dangling-deleted under the bug, this
    // is the row that would be the orphaned counterparty.
    let active_leases: i64 = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "n!" FROM leases
            WHERE status = 'active'
              AND deleted_at IS NULL
              AND (landlord_id = $1 OR primary_tenant_id = $1)
        "#,
        user_id,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        active_leases, 1,
        "the concurrently-created lease must still be active, untouched by the failed delete",
    );
}
