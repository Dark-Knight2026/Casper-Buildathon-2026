//! HTTP request handlers for lease-agreement endpoints.

use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::Utc;
use serde_json::Value;
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, AppState, ErrorResponse, PaginatedResponse, Pagination, crypto},
    services::{
        auth::{AuthUser, LandlordRole, RoleUser},
        leases::{
            db::{self, LeaseRow, NewLease},
            models::{
                CreateLeaseRequest, Lease, LeaseListParams, SignLeaseRequest, SignerRole,
                UpdateLeaseRequest,
            },
        },
        properties::db as properties_db,
    },
};

// `POST /api/v1/leases`
//
/// Creates a `draft` lease agreement against a property the caller owns.
///
/// Landlord-only. Validates the terms (30-day-month duration, positive rent,
/// allowed currency, consistent manager split), property ownership, and that
/// the tenant exists. Nothing on-chain happens here.
///
/// # Errors
///
/// Returns `400` on invalid terms or an unknown tenant, `403` when the caller
/// is not the property owner, `404` when the property is missing.
#[utoipa::path(
    post,
    path = "/leases",
    tag = "Leases",
    request_body = CreateLeaseRequest,
    responses(
        (status = 201, description = "Draft lease created", body = Lease),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Landlord role required or not the property owner", body = ErrorResponse),
        (status = 404, description = "Property not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn create_lease(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Json(payload): Json<CreateLeaseRequest>,
) -> ApiResult<(StatusCode, Json<Lease>)> {
    let new_lease = NewLease::try_from(payload)?;
    // Referenced property must exist and belong to the caller.
    let owner = properties_db::fetch_property_owner(&state.db, new_lease.property_id)
        .await?
        .ok_or_else(|| ApiError::NotFound("property not found".to_owned()))?;
    if owner != user.0.sub {
        return Err(ApiError::Forbidden("not_property_owner".to_owned()));
    }
    if !db::user_exists(&state.db, new_lease.primary_tenant_id).await? {
        return Err(ApiError::BadRequest("tenant not found".to_owned()));
    }
    let row = db::create_lease(&state.db, user.0.sub, new_lease).await?;
    Ok((StatusCode::CREATED, Json(Lease::from(row))))
}

// `GET /api/v1/leases/{id}`
//
/// Returns a single lease agreement to one of its parties.
///
/// Readable only by the landlord or a listed tenant; any other authenticated
/// caller gets `403`.
///
/// # Errors
///
/// Returns `403` when the caller is not a party, `404` when no live lease has
/// that id.
#[utoipa::path(
    get,
    path = "/leases/{id}",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    responses(
        (status = 200, description = "Lease detail", body = Lease),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not a party to this lease", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn get_lease(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Path(lease_id): Path<Uuid>,
) -> ApiResult<Json<Lease>> {
    let row = db::fetch_lease(&state.db, lease_id).await?;
    // Only the landlord or a listed tenant may read the agreement.
    if row.landlord_id != claims.sub && !row.tenant_ids.contains(&claims.sub) {
        return Err(ApiError::Forbidden("not_a_lease_party".to_owned()));
    }
    Ok(Json(Lease::from(row)))
}

// `GET /api/v1/leases`
//
/// Lists the caller's leases, scoped by role and optionally filtered by status.
///
/// `landlordId=me` returns leases the caller owns, `tenantId=me` those they are
/// a tenant on; with neither, both are returned. A caller never sees a lease
/// they are not a party to.
///
/// # Errors
///
/// Returns `400` when `tenantId`/`landlordId` is set to anything but `me`, or a
/// database error.
#[utoipa::path(
    get,
    path = "/leases",
    tag = "Leases",
    params(LeaseListParams, Pagination),
    responses(
        (status = 200, description = "Caller's leases (paginated)", body = PaginatedResponse<Lease>),
        (status = 400, description = "Invalid query", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn list_leases(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Query(params): Query<LeaseListParams>,
    Query(pagination): Query<Pagination>,
) -> ApiResult<Json<PaginatedResponse<Lease>>> {
    let (scope, status) = params.resolve()?;
    let (rows, total) = db::list_leases(
        &state.db,
        claims.sub,
        scope,
        status.as_deref(),
        pagination.page_size(),
        pagination.offset(),
    )
    .await?;
    let leases = rows.into_iter().map(Lease::from).collect();
    Ok(Json(PaginatedResponse::new(leases, total, &pagination)))
}

// `PATCH /api/v1/leases/{id}`
//
/// Edits a draft lease's terms.
///
/// Landlord-only, owner-only, and allowed only while the lease is a `draft`;
/// omitted fields keep their current value. Editing a non-draft lease is `409`.
///
/// # Errors
///
/// Returns `400` on invalid merged terms, `403` when not the landlord, `404`
/// when the lease is missing, `409` when the lease is no longer a draft.
#[utoipa::path(
    patch,
    path = "/leases/{id}",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    request_body = UpdateLeaseRequest,
    responses(
        (status = 200, description = "Updated lease", body = Lease),
        (status = 400, description = "Invalid input", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lease landlord", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 409, description = "Lease is not a draft", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn update_lease(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(lease_id): Path<Uuid>,
    Json(payload): Json<UpdateLeaseRequest>,
) -> ApiResult<Json<Lease>> {
    let current = db::fetch_lease(&state.db, lease_id).await?;
    if current.landlord_id != user.0.sub {
        return Err(ApiError::Forbidden("not_lease_landlord".to_owned()));
    }
    if current.status != "draft" {
        return Err(ApiError::Conflict(
            "lease can only be edited while draft".to_owned(),
        ));
    }
    let edit = payload.into_validated(&current)?;
    let row = db::update_lease_draft(&state.db, lease_id, edit).await?;
    Ok(Json(Lease::from(row)))
}

// `DELETE /api/v1/leases/{id}`
//
/// Soft-deletes a draft lease.
///
/// Landlord-only, owner-only, and allowed only while the lease is a `draft`;
/// deleting a committed/active lease is `409`.
///
/// # Errors
///
/// Returns `403` when not the landlord, `404` when the lease is missing, `409`
/// when the lease is not a draft.
#[utoipa::path(
    delete,
    path = "/leases/{id}",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    responses(
        (status = 204, description = "Draft lease deleted"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lease landlord", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 409, description = "Lease is not a draft", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn delete_lease(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(lease_id): Path<Uuid>,
) -> ApiResult<StatusCode> {
    let current = db::fetch_lease(&state.db, lease_id).await?;
    if current.landlord_id != user.0.sub {
        return Err(ApiError::Forbidden("not_lease_landlord".to_owned()));
    }
    if current.status != "draft" {
        return Err(ApiError::Conflict(
            "only a draft lease can be deleted".to_owned(),
        ));
    }
    db::soft_delete_lease(&state.db, lease_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

// `POST /api/v1/leases/{id}/submit`
//
/// Submits a draft lease for signing.
///
/// Landlord-only, owner-only; moves `draft -> pending_signatures` and seeds the
/// signature-progress object with both parties unsigned. The lease must have a
/// tenant. Submitting a non-draft lease is `409`.
///
/// # Errors
///
/// Returns `400` when the lease has no tenant, `403` when not the landlord,
/// `404` when the lease is missing, `409` when the lease is not a draft.
#[utoipa::path(
    post,
    path = "/leases/{id}/submit",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    responses(
        (status = 200, description = "Lease sent for signing", body = Lease),
        (status = 400, description = "Lease has no tenant", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Not the lease landlord", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 409, description = "Lease is not a draft", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn submit_lease(
    State(state): State<Arc<AppState>>,
    user: RoleUser<LandlordRole>,
    Path(lease_id): Path<Uuid>,
) -> ApiResult<Json<Lease>> {
    let current = db::fetch_lease(&state.db, lease_id).await?;
    if current.landlord_id != user.0.sub {
        return Err(ApiError::Forbidden("not_lease_landlord".to_owned()));
    }
    if current.status != "draft" {
        return Err(ApiError::Conflict(
            "only a draft lease can be submitted".to_owned(),
        ));
    }
    if current.tenant_ids.is_empty() {
        return Err(ApiError::BadRequest(
            "lease has no tenant to sign".to_owned(),
        ));
    }
    // Seed both parties as unsigned; /sign flips each in turn.
    let signature_progress = serde_json::json!({
        "landlord": { "signed": false, "timestamp": null },
        "tenant": { "signed": false, "timestamp": null },
    });
    let row = db::submit_lease(&state.db, lease_id, signature_progress).await?;
    Ok(Json(Lease::from(row)))
}

/// Builds the canonical lease-consent message both parties sign off-chain.
///
/// This string is the signing contract with the frontend: the wallet signs
/// exactly these bytes (the verifier prepends the Casper `Casper Message:\n`
/// prefix), so the frontend MUST reconstruct it identically or verification
/// fails. `signedAt` is deliberately excluded - it would diverge per party.
fn lease_consent_message(lease: &LeaseRow) -> String {
    let tenant = lease
        .tenant_ids
        .first()
        .map_or_else(String::new, ToString::to_string);
    format!(
        "LeaseConsent|lease={}|landlord={}|tenant={}|rent={}|deposit={}|currency={}|start={}|end={}",
        lease.id,
        lease.landlord_id,
        tenant,
        lease.monthly_rent,
        lease.security_deposit,
        lease.currency.as_deref().unwrap_or(""),
        lease.start_date,
        lease.end_date,
    )
}

// `POST /api/v1/leases/{id}/sign`
//
/// Records a party's off-chain consent signature (reference §6).
///
/// Open to the landlord or a listed tenant while the lease is
/// `pending_signatures`. Verifies `signerWallet` is the caller's active wallet
/// and that the Casper signature is valid over the canonical consent message,
/// then stores it; re-signing the same role overwrites. `/commit` is blocked
/// until both parties have signed.
///
/// # Errors
///
/// Returns `400` on a malformed signature or no linked wallet, `401` on a
/// signature mismatch, `403` when the caller is not the claimed party or the
/// wallet does not match, `404` when the lease is missing, `409` when the lease
/// is not awaiting signatures.
#[utoipa::path(
    post,
    path = "/leases/{id}/sign",
    tag = "Leases",
    params(
        ("id" = Uuid, Path, description = "Lease id")
    ),
    request_body = SignLeaseRequest,
    responses(
        (status = 200, description = "Signature recorded", body = Lease),
        (status = 400, description = "Malformed signature or no active wallet", body = ErrorResponse),
        (status = 401, description = "Signature verification failed", body = ErrorResponse),
        (status = 403, description = "Not the signing party or wallet mismatch", body = ErrorResponse),
        (status = 404, description = "Lease not found", body = ErrorResponse),
        (status = 409, description = "Lease is not awaiting signatures", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(
        ("cookie_auth" = [])
    )
)]
#[inline]
pub async fn sign_lease(
    State(state): State<Arc<AppState>>,
    AuthUser(claims): AuthUser,
    Path(lease_id): Path<Uuid>,
    Json(payload): Json<SignLeaseRequest>,
) -> ApiResult<Json<Lease>> {
    let lease = db::fetch_lease(&state.db, lease_id).await?;
    if lease.status != "pending_signatures" {
        return Err(ApiError::Conflict(
            "lease is not awaiting signatures".to_owned(),
        ));
    }
    // The caller must actually be the party they claim to sign as.
    let authorized = match payload.role {
        SignerRole::Landlord => lease.landlord_id == claims.sub,
        SignerRole::Tenant => lease.tenant_ids.contains(&claims.sub),
    };
    if !authorized {
        return Err(ApiError::Forbidden("not_the_signing_party".to_owned()));
    }
    // `signerWallet` must be the caller's active wallet.
    let active_wallet = db::user_active_wallet(&state.db, claims.sub)
        .await?
        .ok_or_else(|| ApiError::BadRequest("no active wallet linked".to_owned()))?;
    if active_wallet != payload.signer_wallet {
        return Err(ApiError::Forbidden("signer_wallet_mismatch".to_owned()));
    }
    // Verify the Casper signature over the canonical consent message.
    let message = lease_consent_message(&lease);
    let valid =
        crypto::verify_casper_signature(&payload.signer_wallet, &payload.signature, &message)
            .map_err(|_| ApiError::BadRequest("invalid signature format".to_owned()))?;
    if !valid {
        return Err(ApiError::Unauthorized(
            "signature verification failed".to_owned(),
        ));
    }
    // Merge this party's entry into the progress + consent objects.
    let signed_at = Utc::now().to_rfc3339();
    let key = payload.role.to_string();
    let mut progress = lease
        .signature_progress
        .0
        .as_object()
        .cloned()
        .unwrap_or_default();
    progress.insert(
        key.clone(),
        serde_json::json!({ "signed": true, "timestamp": signed_at.clone() }),
    );
    let mut consent = lease
        .consent_signatures
        .0
        .as_object()
        .cloned()
        .unwrap_or_default();
    consent.insert(
        key,
        serde_json::json!({
            "signature": payload.signature,
            "signedAt": signed_at,
            "signerWallet": payload.signer_wallet,
        }),
    );
    let row = db::update_consent(
        &state.db,
        lease_id,
        Value::Object(progress),
        Value::Object(consent),
    )
    .await?;
    Ok(Json(Lease::from(row)))
}
