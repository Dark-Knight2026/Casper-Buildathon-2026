//! Database operations for leases.
//!
//! Detail/create use compile-time `sqlx` macros. NUMERIC money is cast to
//! `float8` and the U256 `onchain_lease_id` to `text` at the SQL boundary so
//! the row maps to plain Rust types without precision loss. JSONB columns
//! (`clauses`, `signature_progress`, `consent_signatures`) map to `Json<Value>`.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::prelude::ToPrimitive;
use serde_json::Value;
use sqlx::{Error, FromRow, PgConnection, PgPool, types::Json};
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

/// Validated set of editable draft fields (merged against the current row).
#[derive(Debug)]
pub struct LeaseEdit {
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
    pub currency: Option<String>,
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
    /// Primary tenant's contract-assigned on-chain user id (U256 as text); null until registered on-chain.
    pub tenant_onchain_user_id: Option<String>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Returns the caller's active wallet address (cached on `users`), if linked.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn user_active_wallet(pool: &PgPool, user_id: Uuid) -> Result<Option<String>, Error> {
    sqlx::query_scalar!(
        r#"
            SELECT wallet_address
            FROM users
            WHERE id = $1
        "#,
        user_id,
    )
    .fetch_optional(pool)
    .await
    .map(Option::flatten)
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
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

/// Lists leases the caller is a party to, scoped by `scope`
/// (`landlord`/`tenant`/`both`) with an optional `status` filter, plus the
/// total matching count for pagination.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_leases(
    pool: &PgPool,
    caller: Uuid,
    scope: &str,
    status: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<(Vec<LeaseRow>, i64), Error> {
    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM leases
            WHERE deleted_at IS NULL
              AND (
                ($2 = 'landlord' AND landlord_id = $1)
                OR ($2 = 'tenant' AND $1 = ANY(tenant_ids))
                OR ($2 = 'both' AND (landlord_id = $1 OR $1 = ANY(tenant_ids)))
              )
              AND ($3::text IS NULL OR status = $3)
        "#,
        caller,
        scope,
        status,
    )
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query_as!(
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM leases
            WHERE deleted_at IS NULL
              AND (
                ($2 = 'landlord' AND landlord_id = $1)
                OR ($2 = 'tenant' AND $1 = ANY(tenant_ids))
                OR ($2 = 'both' AND (landlord_id = $1 OR $1 = ANY(tenant_ids)))
              )
              AND ($3::text IS NULL OR status = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
        "#,
        caller,
        scope,
        status,
        limit,
        offset,
    )
    .fetch_all(pool)
    .await?;

    Ok((rows, total))
}

/// Applies an edit to a `draft` lease and returns the updated row.
/// The `status = 'draft'` guard makes the update a no-op (`RowNotFound`) if the
/// lease left draft between the caller's read and this write.
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when the lease is no longer an editable draft,
/// or any other database error.
#[inline]
pub async fn update_lease_draft(
    pool: &PgPool,
    lease_id: Uuid,
    edit: LeaseEdit,
) -> Result<LeaseRow, Error> {
    sqlx::query_as!(
        LeaseRow,
        r#"
            UPDATE leases SET
                type = $2,
                start_date = $3,
                end_date = $4,
                monthly_rent = $5::double precision,
                security_deposit = $6::double precision,
                currency = $7,
                clauses = $8
            WHERE id = $1 AND status = 'draft' AND deleted_at IS NULL
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        lease_id,
        edit.lease_type,
        edit.start_date,
        edit.end_date,
        edit.monthly_rent,
        edit.security_deposit,
        edit.currency,
        edit.clauses,
    )
    .fetch_one(pool)
    .await
}

/// Soft-deletes a `draft` lease. Returns the number of rows affected (0 when
/// the lease is not an editable draft).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn soft_delete_lease(pool: &PgPool, lease_id: Uuid) -> Result<u64, Error> {
    let result = sqlx::query!(
        r#"
            UPDATE leases
            SET deleted_at = NOW()
            WHERE id = $1 AND status = 'draft' AND deleted_at IS NULL
        "#,
        lease_id,
    )
    .execute(pool)
    .await?;
    Ok(result.rows_affected())
}

/// Submits a `draft` lease for signing: moves it to `pending_signatures` and
/// stores the initial signature-progress object. The `status = 'draft'` guard
/// makes this a no-op (`RowNotFound`) if the lease already left draft.
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when the lease is no longer a draft, or any
/// other database error.
#[inline]
pub async fn submit_lease(
    pool: &PgPool,
    lease_id: Uuid,
    signature_progress: Value,
) -> Result<LeaseRow, Error> {
    sqlx::query_as!(
        LeaseRow,
        r#"
            UPDATE leases SET
                status = 'pending_signatures',
                signature_progress = $2
            WHERE id = $1 AND status = 'draft' AND deleted_at IS NULL
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        lease_id,
        signature_progress,
    )
    .fetch_one(pool)
    .await
}

/// Stores a party's consent signature plus updated progress on a lease that is
/// awaiting signatures. The `status = 'pending_signatures'` guard prevents
/// writing to a lease that already moved on.
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when the lease is not awaiting signatures, or
/// any other database error.
#[inline]
pub async fn update_consent(
    pool: &PgPool,
    lease_id: Uuid,
    signature_progress: Value,
    consent_signatures: Value,
) -> Result<LeaseRow, Error> {
    sqlx::query_as!(
        LeaseRow,
        r#"
            UPDATE leases SET
                signature_progress = $2,
                consent_signatures = $3
            WHERE id = $1 AND status = 'pending_signatures' AND deleted_at IS NULL
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        lease_id,
        signature_progress,
        consent_signatures,
    )
    .fetch_one(pool)
    .await
}

/// Activates a lease by persisting the on-chain binding returned by
/// `create_lease_agreement` and moving it to `active`.
///
/// Accepts a bare `&mut PgConnection` so the caller can run it inside a
/// transaction alongside [`create_lease_invoices`].
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when the lease is not in `pending_signatures`
/// (e.g. already activated), or any other database error.
#[inline]
pub async fn commit_lease(
    conn: &mut PgConnection,
    lease_id: Uuid,
    onchain_lease_id: &str,
    nft_token_id: &str,
    commit_tx_hash: &str,
) -> Result<LeaseRow, Error> {
    sqlx::query_as!(
        LeaseRow,
        r#"
            UPDATE leases SET
                status = 'active',
                onchain_lease_id = $2::TEXT::NUMERIC,
                nft_token_id = $3,
                commit_tx_hash = $4
            WHERE id = $1 AND status = 'pending_signatures' AND deleted_at IS NULL
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        lease_id,
        onchain_lease_id,
        nft_token_id,
        commit_tx_hash,
    )
    .fetch_one(conn)
    .await
}

/// Seeds `scheduled` invoice mirrors for an activated lease.
///
/// Creates one `security_deposit` invoice and N `rent` invoices (one per 30-day
/// month). Deadlines are derived from `NOW()` as a proxy for the on-chain block
/// timestamp at commit time — off by at most a few seconds, irrelevant since
/// `deadline` is a `DATE`.
///
/// Idempotent: skips silently if invoices already exist for this lease (e.g.
/// `/commit` is retried after the indexer already activated the lease).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn create_lease_invoices(
    conn: &mut PgConnection,
    row: &LeaseRow,
    validity_secs: i64,
) -> Result<(), Error> {
    let already_seeded = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM invoices WHERE lease_id = $1) AS "exists!""#,
        row.id,
    )
    .fetch_one(conn.as_mut())
    .await?;

    if already_seeded {
        return Ok(());
    }

    let tenant_id = row.tenant_ids[0];
    let n_months = ((row.end_date - row.start_date).num_days() / 30)
        .to_i32()
        .unwrap_or(i32::MAX);

    // Security deposit: deadline = NOW() + validity_secs.
    sqlx::query!(
        r#"
            INSERT INTO invoices (
                lease_id, kind, tenant_id, landlord_id, property_id,
                amount_due, rent_paid, property_manager_id, property_manager_bps,
                status, deadline
            ) VALUES (
                $1, 'security_deposit', $2, $3, $4,
                $5::double precision, 0, $6, $7,
                'scheduled',
                (NOW() + $8::bigint * INTERVAL '1 second')::date
            )
        "#,
        row.id,
        tenant_id,
        row.landlord_id,
        row.property_id,
        row.security_deposit,
        row.property_manager_id,
        row.property_manager_bps,
        validity_secs,
    )
    .execute(conn.as_mut())
    .await?;

    // Rent invoices: deadline[i] = NOW() + (i * 30d + validity_secs).
    // generate_series produces i = 0..N-1 matching the contract's loop.
    let one_month = 60 * 60 * 24 * 30_i64;
    sqlx::query!(
        r#"
            INSERT INTO invoices (
                lease_id, kind, tenant_id, landlord_id, property_id,
                amount_due, rent_paid, property_manager_id, property_manager_bps,
                status, deadline
            )
            SELECT
                $1, 'rent', $2, $3, $4,
                $5::double precision, 0, $6, $7,
                'scheduled',
                (NOW() + (gs::bigint * $8::bigint + $9::bigint) * INTERVAL '1 second')::date
            FROM generate_series(0, $10 - 1) AS gs
        "#,
        row.id,
        tenant_id,
        row.landlord_id,
        row.property_id,
        row.monthly_rent,
        row.property_manager_id,
        row.property_manager_bps,
        one_month,
        validity_secs,
        n_months,
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Binds invoices the indexer already saw on-chain but could not match because
/// the `InvoiceCreated` event raced ahead of this `/commit`.
///
/// The streamed events for the commit deploy are persisted in `blockchain_events`
/// keyed by `transaction_hash = commit_tx_hash`, each carrying the contract's
/// `invoice_id`. They are paired with the freshly seeded `scheduled` invoices
/// positionally - both in the contract's creation order (security deposit first,
/// then rent by ascending deadline, which matches ascending on-chain id) - and
/// each is stamped with its id and moved to `pending`.
///
/// Idempotent: only unbound `scheduled` invoices are touched, so a re-run, a
/// missing event, or a later live `InvoiceCreated` for the same deploy is a
/// no-op rather than a double-bind.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn reconcile_invoices_from_onchain_events(
    conn: &mut PgConnection,
    lease_id: Uuid,
    commit_tx_hash: &str,
) -> Result<(), Error> {
    sqlx::query!(
        r#"
            WITH ordered_invoices AS (
                SELECT id, ROW_NUMBER() OVER (
                    ORDER BY (kind = 'security_deposit') DESC, deadline ASC
                ) AS pos
                FROM invoices
                WHERE lease_id = $1
                  AND onchain_invoice_id IS NULL
                  AND status = 'scheduled'
            ),
            ordered_events AS (
                SELECT
                    (event_data->>'invoice_id')::NUMERIC AS onchain_invoice_id,
                    ROW_NUMBER() OVER (
                        ORDER BY (event_data->>'invoice_id')::NUMERIC ASC
                    ) AS pos
                FROM blockchain_events
                WHERE event_type = 'InvoiceCreated'
                  AND transaction_hash = $2
            )
            UPDATE invoices i
            SET onchain_invoice_id = oe.onchain_invoice_id,
                status = 'pending'
            FROM ordered_invoices oi
            JOIN ordered_events oe ON oe.pos = oi.pos
            WHERE i.id = oi.id
        "#,
        lease_id,
        commit_tx_hash,
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Records a freshly rendered lease document on the lease: the stored
/// (generated) URL, its SHA-256 hash, and the IPFS CID. Allowed at any live
/// status (the document is a read-time artifact, not a lifecycle transition).
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when the lease is missing or soft-deleted, or
/// any other database error.
#[inline]
pub async fn set_lease_document(
    pool: &PgPool,
    lease_id: Uuid,
    document_url: &str,
    document_hash: &str,
    ipfs_cid: &str,
) -> Result<LeaseRow, Error> {
    sqlx::query_as!(
        LeaseRow,
        r#"
            UPDATE leases SET
                lease_document_url = $2,
                document_hash = $3,
                ipfs_cid = $4
            WHERE id = $1 AND deleted_at IS NULL
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
                (SELECT onchain_user_id::TEXT FROM users WHERE id = primary_tenant_id) AS tenant_onchain_user_id,
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        lease_id,
        document_url,
        document_hash,
        ipfs_cid,
    )
    .fetch_one(pool)
    .await
}
