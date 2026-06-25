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
            "invoiceValidityDuration": 0,
        }),
    )
    .await;
    assert_eq!(s_commit, StatusCode::OK);
    let committed = committed.unwrap();
    assert_eq!(committed["status"], "active");
    assert_eq!(committed["onchainLeaseId"].as_str().unwrap(), "0");
    assert_eq!(committed["nftTokenId"].as_str().unwrap(), "1");

    // Activation seeds invoice mirrors in the same transaction: a 30-day term is
    // one month, so one security deposit + one rent invoice, both `scheduled`.
    let lease_uuid = Uuid::parse_str(&id).unwrap();
    let scheduled_invoices = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM invoices WHERE lease_id = $1 AND status = 'scheduled'",
    )
    .bind(lease_uuid)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(scheduled_invoices, 2);
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
            "invoiceValidityDuration": 0,
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

// Negative & branch coverage --------------------------------------------------

/// A lease submitted for signing, with both parties' wallets and the canonical
/// consent message ready to sign.
struct PendingLease {
    id: String,
    landlord: LoggedSession,
    ltoken: String,
    tenant: LoggedSession,
    ttoken: String,
    message: String,
}

/// Drives a fresh lease to `pending_signatures` and returns everything the
/// sign/commit tests need.
async fn pending_lease(env: &TestEnv, pool: &PgPool) -> PendingLease {
    let (landlord, ltoken) = wallet_user(env, pool, UserRole::Landlord).await;
    let (tenant, ttoken) = wallet_user(env, pool, UserRole::Tenant).await;
    let property_id = common::seed_property(pool, landlord.user_id).await;
    let lease = create_draft(env, &ltoken, property_id, tenant.user_id).await;
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
    PendingLease {
        id,
        landlord,
        ltoken,
        tenant,
        ttoken,
        message,
    }
}

/// Posts a `/sign` request and returns the status.
async fn post_sign(
    env: &TestEnv,
    token: &str,
    lease_id: &str,
    role: &str,
    signature: &str,
    signer_wallet: &str,
) -> StatusCode {
    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{lease_id}/sign"),
        token,
        &json!({ "role": role, "signature": signature, "signerWallet": signer_wallet }),
    )
    .await;
    status
}

/// Signs `role`'s consent correctly with `session`'s wallet over `message`.
async fn sign_consent(
    env: &TestEnv,
    token: &str,
    lease_id: &str,
    role: &str,
    session: &LoggedSession,
    message: &str,
) -> StatusCode {
    let signature = common::sign_with_prefix(message, &session.secret_key, &session.public_key);
    post_sign(
        env,
        token,
        lease_id,
        role,
        &signature,
        &session.public_key.to_hex(),
    )
    .await
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_lease_rejects_zero_rent(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let mut body = lease_body(property_id, tenant_id);
    body["monthlyRent"] = json!(0.0);

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
async fn create_lease_rejects_unsupported_currency(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let mut body = lease_body(property_id, tenant_id);
    body["currency"] = json!("XYZ");

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
async fn create_lease_rejects_unknown_tenant(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    // Random tenant id that does not exist in `users`.
    let body = lease_body(property_id, Uuid::new_v4());

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
async fn create_lease_rejects_end_before_start(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let mut body = lease_body(property_id, tenant_id);
    body["endDate"] = json!("2024-01-01");

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
async fn create_lease_property_not_found(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    // Random property id.
    let body = lease_body(Uuid::new_v4(), tenant_id);

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/leases",
        &token,
        &body,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_lease_not_found(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/leases/{}", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_tenant_scope_and_invalid_scope(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    create_draft(&env, &ltoken, property_id, tenant_id).await;

    // tenantId=me returns the lease the caller is a tenant on.
    let (s_tenant, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/leases?tenantId=me",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_tenant, StatusCode::OK);
    assert_eq!(body.unwrap()["data"].as_array().unwrap().len(), 1);

    // Anything but `me` is rejected.
    let (s_invalid, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/leases?tenantId=someone-else",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_invalid, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_status_filter(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    create_draft(&env, &ltoken, property_id, tenant_id).await;

    let (s_draft, draft_body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/leases?status=draft",
        &ltoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_draft, StatusCode::OK);
    assert_eq!(draft_body.unwrap()["data"].as_array().unwrap().len(), 1);

    // No active leases for this caller.
    let (s_active, active_body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/leases?status=active",
        &ltoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_active, StatusCode::OK);
    assert_eq!(active_body.unwrap()["data"].as_array().unwrap().len(), 0);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_rejected_for_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_, other_landlord) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::PATCH,
        &format!("/api/v1/leases/{}", lease["id"].as_str().unwrap()),
        &other_landlord,
        &json!({ "monthlyRent": 2500.0 }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_not_found(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::PATCH,
        &format!("/api/v1/leases/{}", Uuid::new_v4()),
        &token,
        &json!({ "monthlyRent": 2500.0 }),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn update_rejects_invalid_terms(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::PATCH,
        &format!("/api/v1/leases/{}", lease["id"].as_str().unwrap()),
        &ltoken,
        &json!({ "monthlyRent": 0.0 }),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_rejected_for_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_, other_landlord) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/leases/{}", lease["id"].as_str().unwrap()),
        &other_landlord,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn delete_non_draft_conflicts(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();

    // Move past draft.
    common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/submit"),
        &ltoken,
        &Value::Null,
    )
    .await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::DELETE,
        &format!("/api/v1/leases/{id}"),
        &ltoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_non_draft_conflicts(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();
    let submit_uri = format!("/api/v1/leases/{id}/submit");

    let (s_first, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &submit_uri,
        &ltoken,
        &Value::Null,
    )
    .await;
    let (s_second, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &submit_uri,
        &ltoken,
        &Value::Null,
    )
    .await;

    assert_eq!(s_first, StatusCode::OK);
    assert_eq!(s_second, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn submit_rejected_for_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (_, other_landlord) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{}/submit", lease["id"].as_str().unwrap()),
        &other_landlord,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn sign_rejects_invalid_signature(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let p = pending_lease(&env, &pool).await;

    // Correct wallet, but a signature over the wrong message: verification fails.
    let bad_sig = common::sign_with_prefix(
        "not the consent message",
        &p.landlord.secret_key,
        &p.landlord.public_key,
    );
    let status = post_sign(
        &env,
        &p.ltoken,
        &p.id,
        "landlord",
        &bad_sig,
        &p.landlord.public_key.to_hex(),
    )
    .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn sign_rejects_wrong_wallet(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let p = pending_lease(&env, &pool).await;

    // A wallet that is not the caller's active wallet.
    let (_, other_pk) = common::generate_random_ed25519();
    let signature =
        common::sign_with_prefix(&p.message, &p.landlord.secret_key, &p.landlord.public_key);
    let status = post_sign(
        &env,
        &p.ltoken,
        &p.id,
        "landlord",
        &signature,
        &other_pk.to_hex(),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn sign_rejects_non_party(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let p = pending_lease(&env, &pool).await;
    // A third wallet user who is neither the landlord nor the tenant.
    let (outsider, otoken) = wallet_user(&env, &pool, UserRole::Landlord).await;

    let signature =
        common::sign_with_prefix(&p.message, &outsider.secret_key, &outsider.public_key);
    let status = post_sign(
        &env,
        &otoken,
        &p.id,
        "landlord",
        &signature,
        &outsider.public_key.to_hex(),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn sign_rejects_when_not_pending(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord, ltoken) = wallet_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord.user_id).await;
    // Still a draft - never submitted.
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();

    let message = consent_message(&lease);
    let status = sign_consent(&env, &ltoken, id, "landlord", &landlord, &message).await;
    assert_eq!(status, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn sign_rejects_without_active_wallet(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    // Seeded users have no linked wallet.
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let id = lease["id"].as_str().unwrap();
    common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{id}/submit"),
        &ltoken,
        &Value::Null,
    )
    .await;

    // The signature/wallet values are irrelevant: the caller has no active wallet.
    let status = post_sign(&env, &ltoken, id, "landlord", "deadbeef", "01abc").await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn commit_idempotent_when_already_active(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let p = pending_lease(&env, &pool).await;
    assert_eq!(
        sign_consent(&env, &p.ltoken, &p.id, "landlord", &p.landlord, &p.message).await,
        StatusCode::OK
    );
    assert_eq!(
        sign_consent(&env, &p.ttoken, &p.id, "tenant", &p.tenant, &p.message).await,
        StatusCode::OK
    );
    let commit_uri = format!("/api/v1/leases/{}/commit", p.id);
    let commit_body = json!({
        "onchainLeaseId": "0",
        "nftTokenId": "1",
        "commitTxHash": "deploy-test-1",
        "invoiceValidityDuration": 0,
    });

    let (s_first, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &commit_uri,
        &p.ltoken,
        &commit_body,
    )
    .await;
    // A second commit on an already-active lease returns it unchanged.
    let (s_second, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &commit_uri,
        &p.ltoken,
        &commit_body,
    )
    .await;

    assert_eq!(s_first, StatusCode::OK);
    assert_eq!(s_second, StatusCode::OK);
    assert_eq!(body.unwrap()["status"], "active");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn commit_rejects_non_owner(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let p = pending_lease(&env, &pool).await;
    // A different landlord (has the role, but does not own the lease).
    let (_, other_landlord) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{}/commit", p.id),
        &other_landlord,
        &json!({ "onchainLeaseId": "0", "nftTokenId": "1", "commitTxHash": "x", "invoiceValidityDuration": 0 }),
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn commit_not_found(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{}/commit", Uuid::new_v4()),
        &token,
        &json!({ "onchainLeaseId": "0", "nftTokenId": "1", "commitTxHash": "x", "invoiceValidityDuration": 0 }),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn document_rejected_for_non_party(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let (_, outsider) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;
    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/leases/{}/document", lease["id"].as_str().unwrap()),
        &outsider,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn document_not_found(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, token) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/leases/{}/document", Uuid::new_v4()),
        &token,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// `tenantOnchainUserId` field -------------------------------------------------

/// `tenantOnchainUserId` is present in the lease response and is `null` when
/// the tenant has not yet registered on-chain.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_lease_tenant_onchain_user_id_null_when_not_registered(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let lease_id = lease["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/leases/{lease_id}"),
        &ltoken,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert!(
        body.unwrap()["tenantOnchainUserId"].is_null(),
        "tenantOnchainUserId must be null when the tenant is not registered on-chain"
    );
}

/// `tenantOnchainUserId` carries the contract-assigned U256 id once the tenant
/// registers on-chain (stamped by the indexer from `UserCreated`).
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_lease_tenant_onchain_user_id_populated_when_registered(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let property_id = common::seed_property(&pool, landlord_id).await;

    sqlx::query(r"UPDATE users SET onchain_user_id = $1::TEXT::NUMERIC WHERE id = $2")
        .bind("7")
        .bind(tenant_id)
        .execute(&pool)
        .await
        .unwrap();

    let lease = create_draft(&env, &ltoken, property_id, tenant_id).await;
    let lease_id = lease["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/leases/{lease_id}"),
        &ltoken,
        &Value::Null,
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["tenantOnchainUserId"].as_str().unwrap(), "7");
}

/// Inserts an `active` lease and returns the trigger-generated `lease_number`.
async fn insert_lease_returning_number(
    pool: &PgPool,
    landlord: Uuid,
    tenant: Uuid,
    property: Uuid,
) -> String {
    sqlx::query_scalar::<_, String>(
        r"
            INSERT INTO leases (
                landlord_id, property_id, tenant_ids, primary_tenant_id,
                type, status, start_date, end_date, monthly_rent, security_deposit, created_by
            )
            VALUES (
                $1, $2, ARRAY[$3]::uuid[], $3,
                'fixed_term', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year',
                1000.00, 1000.00, $1
            )
            RETURNING lease_number
        ",
    )
    .bind(landlord)
    .bind(property)
    .bind(tenant)
    .fetch_one(pool)
    .await
    .expect("insert lease")
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn second_lease_in_year_gets_a_sequential_number(pool: PgPool) {
    // Regression: `generate_lease_number()` sliced the running counter with
    // `SUBSTRING(lease_number FROM 6)` - an offset written for a 2-digit year -
    // but the format is `LS<4-digit-year>-<counter>`. The first lease in a year
    // skips the slice (no existing rows), so the bug only bit the *second*
    // lease, where `CAST('6-00001' AS INTEGER)` blew up. Both inserts must
    // succeed and yield distinct, `LS`-prefixed numbers.
    let landlord = common::seed_user(&pool, UserRole::Landlord).await;
    let tenant = common::seed_user(&pool, UserRole::Tenant).await;
    let property = common::seed_property(&pool, landlord).await;

    let first = insert_lease_returning_number(&pool, landlord, tenant, property).await;
    let second = insert_lease_returning_number(&pool, landlord, tenant, property).await;

    assert!(first.starts_with("LS"), "unexpected format: {first}");
    assert!(second.starts_with("LS"), "unexpected format: {second}");
    assert_ne!(first, second, "the second lease must get a fresh number");
}

// /commit reconciliation against prior on-chain events ------------------------

/// Seed an orphan `InvoiceCreated` row into `blockchain_events` exactly as the
/// indexer persists it: the raw event is stored, but binding was skipped because
/// the off-chain mirror did not exist yet.
async fn seed_orphan_invoice_event(
    pool: &PgPool,
    deploy_hash: &str,
    transform_idx: i32,
    onchain_invoice_id: &str,
) {
    sqlx::query(
        r"
            INSERT INTO blockchain_events
                (event_type, contract_address, transaction_hash,
                 block_number, event_data, transform_idx, processed)
            VALUES ('InvoiceCreated', $1, $2, 100, $3, $4, true)
        ",
    )
    .bind("escrow-contract")
    .bind(deploy_hash)
    .bind(json!({ "invoice_id": onchain_invoice_id, "created_at": 1_782_369_426_200_i64 }))
    .bind(transform_idx)
    .execute(pool)
    .await
    .expect("seed orphan InvoiceCreated event");
}

/// Regression (red until `/commit` reconciliation lands): the indexer streams
/// `InvoiceCreated` ahead of `/commit`, so when it tries to bind, the off-chain
/// invoices do not exist yet and it skips - but it still persists the events in
/// `blockchain_events`. `/commit` then seeds the scheduled invoices and must
/// reconcile them against those already-stored events, binding each to its
/// on-chain id (deposit -> 10, rent -> 11) and moving it to `pending`.
///
/// Today `/commit` seeds the invoices but never reads `blockchain_events`, so
/// they stay `scheduled` with `onchain_invoice_id IS NULL` and this fails.
#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn commit_reconciles_invoices_against_prior_onchain_events(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let pending = pending_lease(&env, &pool).await;
    assert_eq!(
        sign_consent(
            &env,
            &pending.ltoken,
            &pending.id,
            "landlord",
            &pending.landlord,
            &pending.message,
        )
        .await,
        StatusCode::OK
    );
    assert_eq!(
        sign_consent(
            &env,
            &pending.ttoken,
            &pending.id,
            "tenant",
            &pending.tenant,
            &pending.message,
        )
        .await,
        StatusCode::OK
    );

    // The indexer already saw both InvoiceCreated events for this deploy (a
    // 30-day term -> deposit then one rent month) and stored them, distinguished
    // by transform_idx within the deploy. Binding was skipped (no mirror yet).
    let deploy_hash = "f".repeat(64);
    seed_orphan_invoice_event(&pool, &deploy_hash, 0, "10").await;
    seed_orphan_invoice_event(&pool, &deploy_hash, 1, "11").await;

    // Commit carries the same deploy hash the stored events do.
    let (s_commit, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/leases/{}/commit", pending.id),
        &pending.ltoken,
        &json!({
            "onchainLeaseId": "4",
            "nftTokenId": "4",
            "commitTxHash": deploy_hash,
            "invoiceValidityDuration": 0,
        }),
    )
    .await;
    assert_eq!(s_commit, StatusCode::OK);

    let lease_uuid = Uuid::parse_str(&pending.id).unwrap();
    let bound = sqlx::query_scalar::<_, i64>(
        r"
            SELECT COUNT(*) FROM invoices
            WHERE lease_id = $1 AND onchain_invoice_id IS NOT NULL AND status = 'pending'
        ",
    )
    .bind(lease_uuid)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        bound, 2,
        "both scheduled invoices must be reconciled against the prior on-chain events"
    );

    let deposit_onchain = sqlx::query_scalar::<_, Option<String>>(
        r"
            SELECT onchain_invoice_id::text
            FROM   invoices
            WHERE  lease_id = $1 AND kind = 'security_deposit'
        ",
    )
    .bind(lease_uuid)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        deposit_onchain.as_deref(),
        Some("10"),
        "the security deposit binds to the first on-chain invoice id"
    );
}
