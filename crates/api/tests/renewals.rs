//! Integration tests for the lease-renewal domain (`/api/v1/renewals`).
//!
//! Covers offer creation (landlord-only, active lease), the tenant response
//! state machine (accept/reject/counter, idempotency), party-scoped reads, and
//! the negotiation thread.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// Seeds a property + lease with `status`, owned by `landlord_id` with
/// `tenant_id` as the sole tenant (distinct parties, unlike the shared
/// `seed_active_lease_as_landlord` which self-references one user).
async fn seed_lease(pool: &PgPool, landlord_id: Uuid, tenant_id: Uuid, status: &str) -> Uuid {
    let property_id = sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO properties (landlord_id, property_type, address_line1, city, state, zip_code)
            VALUES ($1, 'single_family', '1 Renewal St', 'Testville', 'CA', '00000')
            RETURNING id
        ",
    )
    .bind(landlord_id)
    .fetch_one(pool)
    .await
    .expect("seed property");

    sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO leases (
                landlord_id, property_id, tenant_ids, primary_tenant_id,
                type, status, start_date, end_date, monthly_rent, security_deposit, created_by
            )
            VALUES (
                $1, $2, ARRAY[$3]::uuid[], $3,
                'fixed_term', $4, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year',
                1000.00, 1000.00, $1
            )
            RETURNING id
        ",
    )
    .bind(landlord_id)
    .bind(property_id)
    .bind(tenant_id)
    .bind(status)
    .fetch_one(pool)
    .await
    .expect("seed lease")
}

fn renewal_body(lease_id: Uuid) -> Value {
    json!({
        "leaseId": lease_id,
        "proposedRent": 2200.0,
        "proposedTermMonths": 12,
        "proposedStartDate": "2026-01-01",
    })
}

/// Creates a renewal offer and returns its JSON.
async fn create_renewal(env: &TestEnv, token: &str, lease_id: Uuid) -> Value {
    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/renewals",
        token,
        &renewal_body(lease_id),
    )
    .await;
    assert_eq!(status, StatusCode::CREATED);
    body.unwrap()
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_renewal_succeeds(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;

    let renewal = create_renewal(&env, &ltoken, lease_id).await;

    assert_eq!(renewal["status"], "sent");
    assert_eq!(renewal["leaseId"].as_str().unwrap(), lease_id.to_string());
    assert_eq!(
        renewal["landlordId"].as_str().unwrap(),
        landlord_id.to_string()
    );
    assert_eq!(renewal["tenantId"].as_str().unwrap(), tenant_id.to_string());
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_renewal_requires_landlord_role(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let landlord_id = common::seed_user(&pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/renewals",
        &ttoken,
        &renewal_body(lease_id),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn create_renewal_rejects_non_active_lease(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    // A draft lease is not renewable.
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "draft").await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        "/api/v1/renewals",
        &ltoken,
        &renewal_body(lease_id),
    )
    .await;

    assert_eq!(status, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn get_renewal_visible_to_parties_only(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (_, outsider) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;
    let renewal = create_renewal(&env, &ltoken, lease_id).await;
    let uri = format!("/api/v1/renewals/{}", renewal["id"].as_str().unwrap());

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
async fn respond_accept_moves_to_accepted(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;
    let renewal = create_renewal(&env, &ltoken, lease_id).await;
    let id = renewal["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/renewals/{id}/respond"),
        &ttoken,
        &json!({ "decision": "accept" }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["status"], "accepted");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn respond_counter_requires_offer(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;
    let renewal = create_renewal(&env, &ltoken, lease_id).await;
    let id = renewal["id"].as_str().unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/renewals/{id}/respond"),
        &ttoken,
        &json!({ "decision": "counter" }),
    )
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn respond_counter_records_offer(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;
    let renewal = create_renewal(&env, &ltoken, lease_id).await;
    let id = renewal["id"].as_str().unwrap();

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/renewals/{id}/respond"),
        &ttoken,
        &json!({
            "decision": "counter",
            "counterOffer": { "proposedRent": 2100.0, "proposedTermMonths": 6 },
        }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    let renewal = body.unwrap();
    assert_eq!(renewal["status"], "countered");
    // Assert on the integer term (the float rent would trip clippy::float_cmp);
    // both prove the counter-offer payload was persisted.
    assert_eq!(
        renewal["counterOffer"]["proposedTermMonths"]
            .as_i64()
            .unwrap(),
        6
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn respond_rejected_for_non_tenant(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let tenant_id = common::seed_user(&pool, UserRole::Tenant).await;
    // A different tenant who is not on the renewal.
    let (_, outsider) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;
    let renewal = create_renewal(&env, &ltoken, lease_id).await;
    let id = renewal["id"].as_str().unwrap();

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/renewals/{id}/respond"),
        &outsider,
        &json!({ "decision": "accept" }),
    )
    .await;

    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn respond_twice_conflicts(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;
    let renewal = create_renewal(&env, &ltoken, lease_id).await;
    let id = renewal["id"].as_str().unwrap();
    let respond = json!({ "decision": "reject" });

    let (s_first, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/renewals/{id}/respond"),
        &ttoken,
        &respond,
    )
    .await;
    let (s_second, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/renewals/{id}/respond"),
        &ttoken,
        &respond,
    )
    .await;

    assert_eq!(s_first, StatusCode::OK);
    assert_eq!(s_second, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn negotiations_append_and_list_in_order(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken) = common::seed_authed_user(&env, &pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let lease_id = seed_lease(&pool, landlord_id, tenant_id, "active").await;
    let renewal = create_renewal(&env, &ltoken, lease_id).await;
    let id = renewal["id"].as_str().unwrap();
    let negotiations_uri = format!("/api/v1/renewals/{id}/negotiations");

    let (s_msg, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &negotiations_uri,
        &ltoken,
        &json!({ "kind": "message", "body": "Can we discuss the rent?" }),
    )
    .await;
    assert_eq!(s_msg, StatusCode::CREATED);

    let (s_counter, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &negotiations_uri,
        &ttoken,
        &json!({
            "kind": "counter-offer",
            "proposedTerms": { "proposedRent": 2100.0, "proposedTermMonths": 6 },
        }),
    )
    .await;
    assert_eq!(s_counter, StatusCode::CREATED);

    let (s_list, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &negotiations_uri,
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_list, StatusCode::OK);
    let thread = body.unwrap();
    let entries = thread.as_array().unwrap();
    assert_eq!(entries.len(), 2);
    assert_eq!(entries[0]["kind"], "message");
    assert_eq!(entries[1]["kind"], "counter-offer");
}
