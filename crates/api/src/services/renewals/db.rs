//! Database operations for lease renewals.
//!
//! DECIMAL `proposed_rent` is cast to `float8` at the SQL boundary so the row
//! maps to a plain `f64`; the nullable `counter_offer` JSONB maps to
//! `Option<Json<Value>>`. The TEXT `status` column is read into the private
//! [`RenewalRowRaw`] and parsed into a typed [`RenewalStatus`] via its
//! `TryFrom<RenewalRowRaw>` impl, so a stray CHECK value fails loudly with
//! [`Error::ColumnDecode`] rather than silently degrading (mirrors the
//! `users`/`auth` db layers).

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Error, FromRow, PgPool, types::Json};
use uuid::Uuid;

use crate::services::renewals::models::RenewalStatus;

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

/// A renewal-offer row as stored, with a typed `status`.
#[derive(Debug)]
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
    pub status: RenewalStatus,
    /// Tenant counter-offer (JSONB); null unless countered.
    pub counter_offer: Option<Json<Value>>,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Raw DB projection of a renewal row: `status` is the underlying TEXT value,
/// parsed into a typed [`RenewalStatus`] by `RenewalRow`'s `TryFrom` impl.
/// Private to the db layer; handlers only ever see [`RenewalRow`].
#[derive(Debug, FromRow)]
struct RenewalRowRaw {
    id: Uuid,
    lease_id: Uuid,
    landlord_id: Uuid,
    tenant_id: Uuid,
    proposed_rent: f64,
    proposed_term_months: i32,
    proposed_start_date: NaiveDate,
    rent_increase_reason: Option<String>,
    response_deadline: Option<NaiveDate>,
    status: String,
    counter_offer: Option<Json<Value>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl TryFrom<RenewalRowRaw> for RenewalRow {
    type Error = Error;

    /// Parses the raw row into a [`RenewalRow`], failing loudly when the TEXT
    /// `status` is not a known [`RenewalStatus`] (a missing migration, not user
    /// input).
    #[inline]
    fn try_from(raw: RenewalRowRaw) -> Result<Self, Self::Error> {
        let status = RenewalStatus::from_str(&raw.status).map_err(|err| Error::ColumnDecode {
            index: "status".to_owned(),
            source: Box::new(err),
        })?;
        Ok(Self {
            id: raw.id,
            lease_id: raw.lease_id,
            landlord_id: raw.landlord_id,
            tenant_id: raw.tenant_id,
            proposed_rent: raw.proposed_rent,
            proposed_term_months: raw.proposed_term_months,
            proposed_start_date: raw.proposed_start_date,
            rent_increase_reason: raw.rent_increase_reason,
            response_deadline: raw.response_deadline,
            status,
            counter_offer: raw.counter_offer,
            created_at: raw.created_at,
            updated_at: raw.updated_at,
        })
    }
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
        RenewalRowRaw,
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
    .await?
    .try_into()
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
        RenewalRowRaw,
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
    .await?
    .try_into()
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
        RenewalRowRaw,
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
    .await?
    .into_iter()
    .map(RenewalRow::try_from)
    .collect::<Result<Vec<_>, _>>()?;

    Ok((rows, total))
}

/// Records the tenant's response on a renewal awaiting one, setting the new
/// `status` (and `counter_offer` when countering).
///
/// The `status IN ('sent', 'under_review')` guard makes this a no-op
/// (`RowNotFound`) once the renewal already left those states, so a second
/// response is rejected rather than overwriting the first.
///
/// # Errors
///
/// Returns [`Error::RowNotFound`] when the renewal is no longer awaiting a
/// response, or any other database error.
#[inline]
pub async fn update_renewal_response(
    pool: &PgPool,
    renewal_id: Uuid,
    status: &str,
    counter_offer: Option<Value>,
) -> Result<RenewalRow, Error> {
    sqlx::query_as!(
        RenewalRowRaw,
        r#"
            UPDATE lease_renewals SET
                status = $2,
                counter_offer = $3
            WHERE id = $1 AND status IN ('sent', 'under_review') AND deleted_at IS NULL
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
        renewal_id,
        status,
        counter_offer,
    )
    .fetch_one(pool)
    .await?
    .try_into()
}
