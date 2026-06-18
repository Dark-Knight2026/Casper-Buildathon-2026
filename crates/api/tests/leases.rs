//! Integration tests for the lease-agreement domain (`/api/v1/leases`).
//!
//! Covers the off-chain lifecycle (draft -> submit -> sign(both) -> commit ->
//! active), the consent-signature gate on `/commit`, term validation, and the
//! ownership/role gates. Consent is signed with a real Casper keypair via
//! `common::sign_with_prefix`, reproducing the canonical consent message
//! byte-for-byte.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use casper_types::AsymmetricType;
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::{LoggedSession, TestEnv};

/// A valid create-lease payload (30-day term = one whole month).
fn lease_body(property_id: Uuid, tenant_id: Uuid) -> Value {
    json!({
        "propertyId": property_id,
        "tenantId": tenant_id,
        "type": "fixed-term",
        "startDate": "2025-01-01",
        "endDate": "2025-01-31",
        "monthlyRent": 2000.0,
        "securityDeposit": 2000.0,
        "currency": "cUSD",
    })
}

/// Logs in a fresh wallet user (so they have a linked active wallet to sign
/// with), promotes them to `role`, and returns the session plus a role-stamped
/// token. The wallet powers `/sign`; the token clears `RoleUser<R>`.
async fn wallet_user(env: &TestEnv, pool: &PgPool, role: UserRole) -> (LoggedSession, String) {
    let session = common::login_and_extract(env).await;
    sqlx::query("UPDATE users SET role = $1 WHERE id = $2")
        .bind(role.to_string())
        .bind(session.user_id)
        .execute(pool)
        .await
        .expect("promote wallet user");
    let token = common::create_test_jwt(session.user_id, role, &env.jwt_secret);
    (session, token)
}

/// Rebuilds the canonical consent message the backend signs, from a lease's
/// public JSON. Numbers go through `as_f64` (not the raw `Value`) so the `f64`
/// `Display` form matches the server's exactly (`2000`, not `2000.0`).
fn consent_message(lease: &Value) -> String {
    format!(
        "LeaseConsent|lease={}|landlord={}|tenant={}|rent={}|deposit={}|currency={}|start={}|end={}",
        lease["id"].as_str().unwrap(),
        lease["landlordId"].as_str().unwrap(),
        lease["tenantIds"][0].as_str().unwrap(),
        lease["monthlyRent"].as_f64().unwrap(),
        lease["securityDeposit"].as_f64().unwrap(),
        lease["currency"].as_str().unwrap_or(""),
        lease["startDate"].as_str().unwrap(),
        lease["endDate"].as_str().unwrap(),
    )
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_lease_draft_succeeds(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/leases",
        &token,
        &lease_body(property_id, tenant_id),
    )
    .await;

    assert_eq!(status, StatusCode::CREATED);
    let lease = body.unwrap();
    assert_eq!(lease["status"], "draft");
    assert_eq!(
        lease["landlordId"].as_str().unwrap(),
        landlord_id.to_string()
    );
    assert_eq!(
        lease["tenantIds"][0].as_str().unwrap(),
        tenant_id.to_string()
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_lease_rejects_non_month_duration(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let mut body = lease_body(property_id, tenant_id);
    // 14 days is not a whole number of 30-day months.
    body["endDate"] = json!("2025-01-15");

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/leases",
        &token,
        &body,
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_lease_requires_landlord_role(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/leases",
        &tenant_token,
        &lease_body(property_id, tenant_id),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_lease_rejects_non_owned_property(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let other_landlord = common::seed_user(&pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    // Property belongs to a different landlord.
    let property_id = common::seed_property(&pool, other_landlord).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/leases",
        &token,
        &lease_body(property_id, tenant_id),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
    assert_eq!(
        body.unwrap()["error"].as_str().unwrap(),
        "not_property_owner"
    );
}

/// Creates a draft lease and returns its JSON. Helper for the read/lifecycle tests.
async fn create_draft(env: &TestEnv, token: &str, property_id: Uuid, tenant_id: Uuid) -> Value {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/leases",
        token,
        &lease_body(property_id, tenant_id),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    body.unwrap()
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_lease_visible_to_parties_only(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_, outsider) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let uri = format!("/api/v1/leases/{}", lease["id"].as_str().unwrap());

    let (s_landlord, _) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &ltoken, &Value::Null)
            .await;
    let (s_tenant, _) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &ttoken, &Value::Null)
            .await;
    let (s_outsider, _) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &outsider, &Value::Null)
            .await;

    assert_eq!(s_landlord, StatusCode::OK);
    assert_eq!(s_tenant, StatusCode::OK);
    assert_eq!(s_outsider, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn edit_rejected_once_past_draft(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();

    // Editing a draft is allowed.
    let (s_edit, _) = common::authed_request::<Value>(
        &env.server,
        &Method::PATCH,
        &format!("/api/v1/leases/{id}"),
        &ltoken,
        &json!({ "monthlyRent": 2500.0 }),
    )
    .await;
    assert_eq!(s_edit, StatusCode::OK);

    // Submit moves it past draft.
    let (s_submit, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/submit"),
        &ltoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_submit, StatusCode::OK);

    // Editing past draft is a conflict.
    let (s_edit2, _) = common::authed_request::<Value>(
        &env.server,
        &Method::PATCH,
        &format!("/api/v1/leases/{id}"),
        &ltoken,
        &json!({ "monthlyRent": 3000.0 }),
    )
    .await;
    assert_eq!(s_edit2, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_seeds_unsigned_progress(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/submit"),
        &ltoken,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let lease = body.unwrap();
    assert_eq!(lease["status"], "pending-signatures");
    assert_eq!(lease["signatureProgress"]["landlord"]["signed"], false);
    assert_eq!(lease["signatureProgress"]["tenant"]["signed"], false);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn full_lifecycle_draft_to_active(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord, ltoken) = wallet_user(&env, &pool, UserRole::Landlord).await;
    let (tenant, ttoken) = wallet_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord.user_id).await;

    let lease = create_draft(&env, &ltoken, property_id, tenant.user_id).await;
    let id = lease["id"].as_str().unwrap().to_owned();

    let (_, submitted) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/submit"),
        &ltoken,
        &Value::Null,
    )
    .await;
    let message = consent_message(&submitted.unwrap());

    // Landlord signs.
    let landlord_sig =
        common::sign_with_prefix(&message, &landlord.secret_key, &landlord.public_key);
    let (s_lsign, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/sign"),
        &ltoken,
        &json!({
            "role": "landlord",
            "signature": landlord_sig,
            "signerWallet": landlord.public_key.to_hex(),
        }),
    )
    .await;
    assert_eq!(s_lsign, StatusCode::OK);

    // Tenant signs.
    let tenant_sig = common::sign_with_prefix(&message, &tenant.secret_key, &tenant.public_key);
    let (s_tsign, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/sign"),
        &ttoken,
        &json!({
            "role": "tenant",
            "signature": tenant_sig,
            "signerWallet": tenant.public_key.to_hex(),
        }),
    )
    .await;
    assert_eq!(s_tsign, StatusCode::OK);

    // Commit activates the lease.
    let (s_commit, committed) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/commit"),
        &ltoken,
        &json!({
            "onchainLeaseId": "0",
            "nftTokenId": "1",
            "commitTxHash": "deploy-test-1",
        }),
    )
    .await;
    assert_eq!(s_commit, StatusCode::OK);
    let committed = committed.unwrap();
    assert_eq!(committed["status"], "active");
    assert_eq!(committed["onchainLeaseId"].as_str().unwrap(), "0");
    assert_eq!(committed["nftTokenId"].as_str().unwrap(), "1");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn commit_blocked_until_both_signatures(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord, ltoken) = wallet_user(&env, &pool, UserRole::Landlord).await;
    let (tenant, _ttoken) = wallet_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord.user_id).await;

    let lease = create_draft(&env, &ltoken, property_id, tenant.user_id).await;
    let id = lease["id"].as_str().unwrap().to_owned();

    let (_, submitted) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/submit"),
        &ltoken,
        &Value::Null,
    )
    .await;
    let message = consent_message(&submitted.unwrap());

    // Only the landlord signs; the tenant has not.
    let landlord_sig =
        common::sign_with_prefix(&message, &landlord.secret_key, &landlord.public_key);
    common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/sign"),
        &ltoken,
        &json!({
            "role": "landlord",
            "signature": landlord_sig,
            "signerWallet": landlord.public_key.to_hex(),
        }),
    )
    .await;

    let (s_commit, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/commit"),
        &ltoken,
        &json!({
            "onchainLeaseId": "0",
            "nftTokenId": "1",
            "commitTxHash": "deploy-test-1",
        }),
    )
    .await;
    assert_eq!(s_commit, StatusCode::CONFLICT);
    assert!(
        body.unwrap()["error"]
            .as_str()
            .unwrap()
            .contains("both consent signatures")
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn commit_requires_landlord_role(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_, tenant_token) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/commit"),
        &tenant_token,
        &json!({
            "onchainLeaseId": "0",
            "nftTokenId": "1",
            "commitTxHash": "deploy-test-1",
        }),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn lease_document_renders_and_hashes(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/leases/{id}/document"),
        &ltoken,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let lease = body.unwrap();
    // SHA-256 hex is 64 chars; the generated document URL is populated.
    assert_eq!(lease["documentHash"].as_str().unwrap().len(), 64);
    assert!(lease["documentLinks"]["generatedPDF"].is_string());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_draft_then_gone(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let uri = format!("/api/v1/leases/{}", lease["id"].as_str().unwrap());

    let (s_delete, _) =
        common::authed_request::<Value>(&env.server, &Method::DELETE, &uri, &ltoken, &Value::Null)
            .await;
    assert_eq!(s_delete, StatusCode::NO_CONTENT);

    // The soft-deleted lease is no longer readable.
    let (s_get, _) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &ltoken, &Value::Null)
            .await;
    assert_eq!(s_get, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_scoped_to_landlord(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/leases?landlordId=me",
        &ltoken,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let page = body.unwrap();
    let data = page["data"].as_array().unwrap();
    assert_eq!(data.len(), 1);
    assert_eq!(data[0]["id"], lease["id"]);
}
