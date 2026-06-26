//! Integration tests for the invoice domain (`/api/v1/invoices`).
//!
//! Covers party-scoped list/detail, optimistic settlement (partial then full
//! rent, full-only deposit), the role/ownership gates, the read-time `overdue`
//! projection, and the landlord/tenant dashboard summaries. Invoices and their
//! parent lease are seeded directly (runtime `sqlx`, no compile-time macros) so
//! a test does not have to drive the whole lease commit flow.

#![cfg(feature = "integration")]

mod common;

use axum::http::{Method, StatusCode};
use serde_json::{Value, json};
use sqlx::PgPool;
use uuid::Uuid;

use api::UserRole;
use common::TestEnv;

/// Inserts a minimal `active` lease and returns its id (invoices FK to it).
async fn seed_lease(pool: &PgPool, landlord: Uuid, tenant: Uuid, property: Uuid) -> Uuid {
    sqlx::query_scalar::<_, Uuid>(
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
            RETURNING id
        ",
    )
    .bind(landlord)
    .bind(property)
    .bind(tenant)
    .fetch_one(pool)
    .await
    .expect("seed lease")
}

/// Inserts one invoice and returns its id. `deadline_days` is an offset from
/// today (negative for an already-overdue deadline).
#[allow(clippy::too_many_arguments)]
async fn seed_invoice(
    pool: &PgPool,
    lease: Uuid,
    tenant: Uuid,
    landlord: Uuid,
    property: Uuid,
    kind: &str,
    amount_due: f64,
    status: &str,
    deadline_days: i64,
) -> Uuid {
    sqlx::query_scalar::<_, Uuid>(
        r"
            INSERT INTO invoices (
                lease_id, kind, tenant_id, landlord_id, property_id,
                amount_due, status, deadline
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, (CURRENT_DATE + ($8 * INTERVAL '1 day'))::date
            )
            RETURNING id
        ",
    )
    .bind(lease)
    .bind(kind)
    .bind(tenant)
    .bind(landlord)
    .bind(property)
    .bind(amount_due)
    .bind(status)
    .bind(deadline_days)
    .fetch_one(pool)
    .await
    .expect("seed invoice")
}

/// Seeds a landlord, a tenant, a property, and an active lease between them.
async fn seed_parties(env: &TestEnv, pool: &PgPool) -> (Uuid, String, Uuid, String, Uuid, Uuid) {
    let (landlord_id, ltoken) = common::seed_authed_user(env, pool, UserRole::Landlord).await;
    let (tenant_id, ttoken) = common::seed_authed_user(env, pool, UserRole::Tenant).await;
    let property_id = common::seed_property(pool, landlord_id).await;
    let lease_id = seed_lease(pool, landlord_id, tenant_id, property_id).await;
    (
        landlord_id,
        ltoken,
        tenant_id,
        ttoken,
        property_id,
        lease_id,
    )
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_is_scoped_to_the_caller(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "security_deposit",
        1000.0,
        "pending",
        7,
    )
    .await;

    // An invoice for a different tenant must not leak (scope is by tenant_id,
    // not lease, so the same lease with a different tenant_id is enough).
    let other_tenant = common::seed_user(&pool, UserRole::Tenant).await;
    seed_invoice(
        &pool,
        lease_id,
        other_tenant,
        landlord_id,
        property_id,
        "rent",
        500.0,
        "pending",
        7,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices?tenantId=me",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["data"].as_array().unwrap().len(), 2);
    assert_eq!(body["itemCount"], 2);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn detail_visible_to_party_hidden_from_stranger(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;
    let uri = format!("/api/v1/invoices/{invoice_id}");

    let (s_party, _) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &ttoken, &Value::Null)
            .await;
    assert_eq!(s_party, StatusCode::OK);

    let (_, stranger) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (s_stranger, _) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &stranger, &Value::Null)
            .await;
    assert_eq!(s_stranger, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn settle_rent_partial_then_full(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;
    let uri = format!("/api/v1/invoices/{invoice_id}/settlement");

    let (s_partial, partial) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &uri,
        &ttoken,
        &json!({ "amount": "400", "txHash": "deploy-1" }),
    )
    .await;
    assert_eq!(s_partial, StatusCode::OK);
    assert_eq!(partial.unwrap()["status"], "partial");

    let (s_full, full) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &uri,
        &ttoken,
        &json!({ "amount": "600", "txHash": "deploy-2" }),
    )
    .await;
    assert_eq!(s_full, StatusCode::OK);
    assert_eq!(full.unwrap()["status"], "paid");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn settle_deposit_requires_full_amount(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "security_deposit",
        1000.0,
        "pending",
        7,
    )
    .await;
    let uri = format!("/api/v1/invoices/{invoice_id}/settlement");

    let (s_partial, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &uri,
        &ttoken,
        &json!({ "amount": "500", "txHash": "deploy-1" }),
    )
    .await;
    assert_eq!(s_partial, StatusCode::BAD_REQUEST);

    let (s_full, full) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &uri,
        &ttoken,
        &json!({ "amount": "1000", "txHash": "deploy-2" }),
    )
    .await;
    assert_eq!(s_full, StatusCode::OK);
    assert_eq!(full.unwrap()["status"], "paid");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn settle_enforces_role_and_overpay_gates(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;
    let uri = format!("/api/v1/invoices/{invoice_id}/settlement");
    let body = json!({ "amount": "500", "txHash": "deploy-x" });

    // Landlord role is rejected before the body is considered.
    let (s_landlord, _) =
        common::authed_request::<Value>(&env.server, &Method::POST, &uri, &ltoken, &body).await;
    assert_eq!(s_landlord, StatusCode::FORBIDDEN);

    // A tenant who is not on the invoice cannot see it.
    let (_, stranger) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (s_stranger, _) =
        common::authed_request::<Value>(&env.server, &Method::POST, &uri, &stranger, &body).await;
    assert_eq!(s_stranger, StatusCode::NOT_FOUND);

    // Overpaying the balance is rejected.
    let (s_over, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &uri,
        &ttoken,
        &json!({ "amount": "1500", "txHash": "deploy-y" }),
    )
    .await;
    assert_eq!(s_over, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn overdue_is_derived_on_read(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    // Pending invoice whose deadline is in the past.
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        -1,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/invoices/{invoice_id}"),
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["status"], "overdue");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn landlord_summary_aggregates(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken, tenant_id, _ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    // Rent paid this month, one overdue rent, one held deposit.
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "paid",
        0,
    )
    .await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        800.0,
        "pending",
        -1,
    )
    .await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "security_deposit",
        500.0,
        "paid",
        0,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices/summary?landlordId=me",
        &ltoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert_eq!(body["overdueCount"], 1);
    assert_eq!(body["rentReceivedMtd"], "1000.000000");
    assert_eq!(body["overdueAmount"], "800.000000");
    assert_eq!(body["depositsHeld"], "500.000000");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn tenant_summary_reports_next_due(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        5,
    )
    .await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        35,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices/summary?tenantId=me",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let body = body.unwrap();
    assert!(body["nextDue"].is_object());
    assert_eq!(body["balanceDue"], "2000.000000");
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn settle_rejected_past_deadline(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    // Pending but already past its deadline: payable on-chain is closed.
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        -1,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/invoices/{invoice_id}/settlement"),
        &ttoken,
        &json!({ "amount": "500", "txHash": "deploy-x" }),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
    assert!(
        body.unwrap()["error"]
            .as_str()
            .unwrap()
            .contains("deadline")
    );
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn settle_rejects_invalid_amount(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;
    let uri = format!("/api/v1/invoices/{invoice_id}/settlement");

    for amount in ["abc", "0", "-5"] {
        let (status, _) = common::authed_request::<Value>(
            &env.server,
            &Method::POST,
            &uri,
            &ttoken,
            &json!({ "amount": amount, "txHash": "deploy-x" }),
        )
        .await;
        assert_eq!(
            status,
            StatusCode::BAD_REQUEST,
            "amount {amount:?} must be rejected"
        );
    }
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn settle_rejected_when_already_paid(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "paid",
        7,
    )
    .await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::POST,
        &format!("/api/v1/invoices/{invoice_id}/settlement"),
        &ttoken,
        &json!({ "amount": "100", "txHash": "deploy-x" }),
    )
    .await;
    assert_eq!(status, StatusCode::CONFLICT);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn receipt_visible_to_party_hidden_from_stranger(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;
    let uri = format!("/api/v1/invoices/{invoice_id}/receipt");

    let (s_party, body) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &ttoken, &Value::Null)
            .await;
    assert_eq!(s_party, StatusCode::OK);
    // No receipt pipeline in Phase 0, so the URL is null but the shape is present.
    assert!(body.unwrap().get("receiptUrl").is_some());

    let (_, stranger) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;
    let (s_stranger, _) =
        common::authed_request::<Value>(&env.server, &Method::GET, &uri, &stranger, &Value::Null)
            .await;
    assert_eq!(s_stranger, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_applies_status_kind_and_lease_filters(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, _ltoken, tenant_id, ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    // A paid rent, a pending rent, a pending deposit, and an overdue rent.
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "paid",
        7,
    )
    .await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "security_deposit",
        1000.0,
        "pending",
        7,
    )
    .await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        -1,
    )
    .await;

    let count = |body: &Value| body["data"].as_array().unwrap().len();

    // kind=rent -> 3 of the 4.
    let (_, by_kind) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices?tenantId=me&kind=rent",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(count(&by_kind.unwrap()), 3);

    // status=paid -> only the paid one.
    let (_, by_status) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices?tenantId=me&status=paid",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(count(&by_status.unwrap()), 1);

    // status=overdue -> only the pending past-deadline one.
    let (_, overdue) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices?tenantId=me&status=overdue",
        &ttoken,
        &Value::Null,
    )
    .await;
    let overdue = overdue.unwrap();
    assert_eq!(count(&overdue), 1);
    assert_eq!(overdue["data"][0]["status"], "overdue");

    // leaseId filter scopes to the lease (all 4 share it).
    let (_, by_lease) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/invoices?tenantId=me&leaseId={lease_id}"),
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(count(&by_lease.unwrap()), 4);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_landlord_scope_returns_owned_invoices(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken, tenant_id, _ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;

    let (status, body) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices?landlordId=me",
        &ltoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.unwrap()["data"].as_array().unwrap().len(), 1);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn list_rejects_non_me_scope(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/invoices?tenantId={}", Uuid::new_v4()),
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn summary_rejects_ambiguous_scope(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (_, ttoken) = common::seed_authed_user(&env, &pool, UserRole::Tenant).await;

    // Neither party set.
    let (s_neither, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices/summary",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_neither, StatusCode::BAD_REQUEST);

    // Both set.
    let (s_both, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        "/api/v1/invoices/summary?tenantId=me&landlordId=me",
        &ttoken,
        &Value::Null,
    )
    .await;
    assert_eq!(s_both, StatusCode::BAD_REQUEST);
}

#[sqlx::test(migrator = "common::MIGRATIONS")]
async fn detail_visible_to_landlord(pool: PgPool) {
    let env = common::setup_test_server(pool.clone(), false).await;
    let (landlord_id, ltoken, tenant_id, _ttoken, property_id, lease_id) =
        seed_parties(&env, &pool).await;
    let invoice_id = seed_invoice(
        &pool,
        lease_id,
        tenant_id,
        landlord_id,
        property_id,
        "rent",
        1000.0,
        "pending",
        7,
    )
    .await;

    let (status, _) = common::authed_request::<Value>(
        &env.server,
        &Method::GET,
        &format!("/api/v1/invoices/{invoice_id}"),
        &ltoken,
        &Value::Null,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
}
