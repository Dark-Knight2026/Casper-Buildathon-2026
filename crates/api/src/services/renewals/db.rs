//! Database operations for lease renewals.
//!
//! DECIMAL `proposed_rent` is cast to `float8` at the SQL boundary so the row
//! maps to a plain `f64`; the nullable `counter_offer` JSONB maps to
//! `Option<Json<Value>>`. Status stays a `String` here and is parsed at the
//! model boundary.

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Error, FromRow, PgPool, types::Json};
use uuid::Uuid;

/// Validated payload for creating a renewal offer.
#[derive(Debug)]
pub struct NewRenewal {
    /// Lease this offer renews.
    pub lease_id: Uuid,
    /// Proposed new monthly rent.
    pub proposed_rent: f64,
    /// Proposed new term in whole months.
    pub proposed_term_months: i32,
    /// Proposed new start date.
    pub proposed_start_date: NaiveDate,
    /// Optional reason for a rent increase.
    pub rent_increase_reason: Option<String>,
    /// Optional response deadline.
    pub response_deadline: Option<NaiveDate>,
}

/// A renewal-offer row as stored. The enum-typed `status` stays `String` here
/// and is parsed at the model boundary.
#[derive(Debug, FromRow)]
pub struct RenewalRow {
    /// Renewal id.
    pub id: Uuid,
    /// Lease this offer renews.
    pub lease_id: Uuid,
    /// Landlord (offer author) user id.
    pub landlord_id: Uuid,
    /// Tenant (offer recipient) user id.
    pub tenant_id: Uuid,
    /// Proposed new monthly rent.
    pub proposed_rent: f64,
    /// Proposed new term in whole months.
    pub proposed_term_months: i32,
    /// Proposed new start date.
    pub proposed_start_date: NaiveDate,
    /// Reason for a rent increase, if given.
    pub rent_increase_reason: Option<String>,
    /// Response deadline, if set.
    pub response_deadline: Option<NaiveDate>,
    /// Lifecycle status.
    pub status: String,
    /// Tenant counter-offer (JSONB); null unless countered.
    pub counter_offer: Option<Json<Value>>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Creates a `sent` renewal offer from `landlord_id` to `tenant_id` on `new.lease_id`.
///
/// # Errors
///
/// Returns [`Error`] on any database failure (a missing lease or user surfaces
/// as a foreign-key violation).
#[inline]
pub async fn create_renewal(
    pool: &PgPool,
    landlord_id: Uuid,
    tenant_id: Uuid,
    new: NewRenewal,
) -> Result<RenewalRow, Error> {
    sqlx::query_as!(
        RenewalRow,
        r#"
            INSERT INTO lease_renewals (
                lease_id, landlord_id, tenant_id,
                proposed_rent, proposed_term_months, proposed_start_date,
                rent_increase_reason, response_deadline, status
            )
            VALUES (
                $1, $2, $3,
                $4::double precision, $5, $6,
                $7, $8, 'sent'
            )
            RETURNING
                id, lease_id, landlord_id, tenant_id,
                proposed_rent::float8 AS "proposed_rent!",
                proposed_term_months,
                proposed_start_date,
                rent_increase_reason,
                response_deadline,
                status,
                counter_offer AS "counter_offer?: Json<Value>",
                created_at AS "created_at!",
                updated_at AS "updated_at!"
        "#,
        new.lease_id,
        landlord_id,
        tenant_id,
        new.proposed_rent,
        new.proposed_term_months,
        new.proposed_start_date,
        new.rent_increase_reason,
        new.response_deadline,
    )
    .fetch_one(pool)
    .await
}

/// Fetches a single renewal offer by id (any non-deleted status).
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when no live renewal has that id, or any other
/// database error.
#[inline]
pub async fn fetch_renewal(pool: &PgPool, renewal_id: Uuid) -> Result<RenewalRow, Error> {
    sqlx::query_as!(
        RenewalRow,
        r#"
            SELECT
                id, lease_id, landlord_id, tenant_id,
                proposed_rent::float8 AS "proposed_rent!",
                proposed_term_months,
                proposed_start_date,
                rent_increase_reason,
                response_deadline,
                status,
                counter_offer AS "counter_offer?: Json<Value>",
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM lease_renewals
            WHERE id = $1 AND deleted_at IS NULL
        "#,
        renewal_id,
    )
    .fetch_one(pool)
    .await
}

/// Lists renewals the caller is a party to, scoped by `scope`
/// (`landlord`/`tenant`/`both`), plus the total matching count for pagination.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_renewals(
    pool: &PgPool,
    caller: Uuid,
    scope: &str,
    limit: i64,
    offset: i64,
) -> Result<(Vec<RenewalRow>, i64), Error> {
    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM lease_renewals
            WHERE deleted_at IS NULL
              AND (
                ($2 = 'landlord' AND landlord_id = $1)
                OR ($2 = 'tenant' AND tenant_id = $1)
                OR ($2 = 'both' AND (landlord_id = $1 OR tenant_id = $1))
              )
        "#,
        caller,
        scope,
    )
    .fetch_one(pool)
    .await?;

    let rows = sqlx::query_as!(
        RenewalRow,
        r#"
            SELECT
                id, lease_id, landlord_id, tenant_id,
                proposed_rent::float8 AS "proposed_rent!",
                proposed_term_months,
                proposed_start_date,
                rent_increase_reason,
                response_deadline,
                status,
                counter_offer AS "counter_offer?: Json<Value>",
                created_at AS "created_at!",
                updated_at AS "updated_at!"
            FROM lease_renewals
            WHERE deleted_at IS NULL
              AND (
                ($2 = 'landlord' AND landlord_id = $1)
                OR ($2 = 'tenant' AND tenant_id = $1)
                OR ($2 = 'both' AND (landlord_id = $1 OR tenant_id = $1))
              )
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        "#,
        caller,
        scope,
        limit,
        offset,
    )
    .fetch_all(pool)
    .await?;

    Ok((rows, total))
}
