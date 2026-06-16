//! Database operations for leases.
//!
//! Detail/create use compile-time `sqlx` macros. NUMERIC money is cast to
//! `float8` and the U256 `onchain_lease_id` to `text` at the SQL boundary so
//! the row maps to plain Rust types without precision loss. JSONB columns
//! (`clauses`, `signature_progress`, `consent_signatures`) map to `Json<Value>`.

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Error, FromRow, PgPool, types::Json};
use uuid::Uuid;

/// Validated payload for creating a lease draft.
#[derive(Debug)]
pub struct NewLease {
    /// Physical property id.
    pub property_id: Uuid,
    /// Primary (and only, at create) tenant id.
    pub primary_tenant_id: Uuid,
    /// Lease type (DB string form, `snake_case`).
    pub lease_type: String,
    /// Start date.
    pub start_date: NaiveDate,
    /// End date.
    pub end_date: NaiveDate,
    /// Monthly rent (off-chain amount).
    pub monthly_rent: f64,
    /// Security deposit (off-chain amount).
    pub security_deposit: f64,
    /// Settlement currency.
    pub currency: String,
    /// Property manager receiving a rent share, if any.
    pub property_manager_id: Option<Uuid>,
    /// Manager rent share in basis points.
    pub property_manager_bps: i32,
    /// Lease-to-own equity-eligible property, if any.
    pub equity_property_id: Option<Uuid>,
    /// Agreement clauses (JSON array).
    pub clauses: Value,
}

/// A lease row as stored. Enum-typed fields (`lease_type`/`status`) stay
/// `String` here and are parsed at the model boundary.
#[derive(Debug, FromRow)]
pub struct LeaseRow {
    /// Lease id.
    pub id: Uuid,
    /// Physical property id.
    pub property_id: Uuid,
    /// Landlord user id.
    pub landlord_id: Uuid,
    /// Tenant user ids.
    pub tenant_ids: Vec<Uuid>,
    /// Lease type.
    pub lease_type: String,
    /// Lifecycle status.
    pub status: String,
    /// Start date.
    pub start_date: NaiveDate,
    /// End date.
    pub end_date: NaiveDate,
    /// Monthly rent (off-chain amount).
    pub monthly_rent: f64,
    /// Security deposit (off-chain amount).
    pub security_deposit: f64,
    /// Settlement currency.
    pub currency: Option<String>,
    /// Agreement clauses (JSONB).
    pub clauses: Json<Value>,
    /// Property manager receiving a rent share, if any.
    pub property_manager_id: Option<Uuid>,
    /// Manager rent share in basis points.
    pub property_manager_bps: i32,
    /// Lease-to-own equity-eligible property, if any.
    pub equity_property_id: Option<Uuid>,
    /// Signature progress (JSONB).
    pub signature_progress: Json<Value>,
    /// Off-chain consent signatures (JSONB).
    pub consent_signatures: Json<Value>,
    /// Generated (unsigned) document URL.
    pub lease_document_url: Option<String>,
    /// Signed document URL.
    pub signed_document_url: Option<String>,
    /// SHA-256 of the rendered document.
    pub document_hash: Option<String>,
    /// IPFS CID.
    pub ipfs_cid: Option<String>,
    /// U256 on-chain agreement id (as text).
    pub onchain_lease_id: Option<String>,
    /// Tenant frozen lease NFT token id.
    pub nft_token_id: Option<String>,
    /// Commit tx hash.
    pub commit_tx_hash: Option<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Whether a user with this id exists.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn user_exists(pool: &PgPool, user_id: Uuid) -> Result<bool, Error> {
    sqlx::query_scalar!(
        r#"
            SELECT EXISTS(SELECT 1 FROM users WHERE id = $1) AS "exists!"
        "#,
        user_id,
    )
    .fetch_one(pool)
    .await
}

/// Creates a `draft` lease owned by `landlord_id` (also recorded as `created_by`),
/// with the single tenant as both `primary_tenant_id` and the sole `tenant_ids`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure (e.g. a missing `property_id` or
/// tenant surfaces as a foreign-key violation).
#[inline]
pub async fn create_lease(
    pool: &PgPool,
    landlord_id: Uuid,
    new: NewLease,
) -> Result<LeaseRow, Error> {
    let tenant_ids = vec![new.primary_tenant_id];
    sqlx::query_as!(
        LeaseRow,
        r#"
            INSERT INTO leases (
                landlord_id, property_id, tenant_ids, primary_tenant_id, created_by,
                type, status, start_date, end_date, monthly_rent, security_deposit,
                currency, clauses, property_manager_id, property_manager_bps, equity_property_id
            )
            VALUES (
                $1, $2, $3, $4, $1,
                $5, 'draft', $6, $7, $8::double precision, $9::double precision,
                $10, $11, $12, $13, $14
            )
            RETURNING
                id, property_id, landlord_id, tenant_ids,
                type AS "lease_type!",
                status AS "status!",
                start_date, end_date,
                monthly_rent::float8 AS "monthly_rent!",
                security_deposit::float8 AS "security_deposit!",
                currency,
                clauses AS "clauses: Json<Value>",
                property_manager_id, property_manager_bps, equity_property_id,
                signature_progress AS "signature_progress: Json<Value>",
                consent_signatures AS "consent_signatures: Json<Value>",
                lease_document_url, signed_document_url,
                document_hash, ipfs_cid,
                onchain_lease_id::text AS onchain_lease_id,
                nft_token_id, commit_tx_hash,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        landlord_id,
        new.property_id,
        tenant_ids.as_slice(),
        new.primary_tenant_id,
        new.lease_type,
        new.start_date,
        new.end_date,
        new.monthly_rent,
        new.security_deposit,
        new.currency,
        new.clauses,
        new.property_manager_id,
        new.property_manager_bps,
        new.equity_property_id,
    )
    .fetch_one(pool)
    .await
}

/// Fetches a single lease by id (any non-deleted status).
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when no live lease has that id, or any other
/// database error.
#[inline]
pub async fn fetch_lease(pool: &PgPool, lease_id: Uuid) -> Result<LeaseRow, Error> {
    sqlx::query_as!(
        LeaseRow,
        r#"
            SELECT
                id, property_id, landlord_id, tenant_ids,
                type AS "lease_type!",
                status AS "status!",
                start_date, end_date,
                monthly_rent::float8 AS "monthly_rent!",
                security_deposit::float8 AS "security_deposit!",
                currency,
                clauses AS "clauses: Json<Value>",
                property_manager_id, property_manager_bps, equity_property_id,
                signature_progress AS "signature_progress: Json<Value>",
                consent_signatures AS "consent_signatures: Json<Value>",
                lease_document_url, signed_document_url,
                document_hash, ipfs_cid,
                onchain_lease_id::text AS onchain_lease_id,
                nft_token_id, commit_tx_hash,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM leases
            WHERE id = $1 AND deleted_at IS NULL
        "#,
        lease_id,
    )
    .fetch_one(pool)
    .await
}
