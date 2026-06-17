//! Database operations for rental applications.
//!
//! `landlord_id` is denormalized from the listing at submit time, so the review
//! owner-check is a local `WHERE landlord_id = $caller` predicate. The nested
//! listing in `GET /applications` is hydrated through
//! [`listings_db::fetch_listings_by_ids`]; an application outlives a withdrawn
//! listing, so that nested listing is optional.

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::{Error, FromRow, PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::{
    common::{AppendFilters, QueryBuilderExt},
    services::{
        applications::models::{ApplicationStatus, RentalApplication},
        listings::db as listings_db,
    },
};

/// A rental-application row as stored. `status` stays `String` here and is
/// parsed at the model boundary; `monthly_income` is read as `float8`.
#[derive(Debug, FromRow)]
pub struct ApplicationRow {
    /// Application id.
    pub id: Uuid,
    /// Listing this application targets.
    pub listing_id: Uuid,
    /// Applicant (tenant) user id.
    pub user_id: Uuid,
    /// Reviewing landlord user id.
    pub landlord_id: Uuid,
    /// Full legal name.
    pub full_name: String,
    /// Contact email.
    pub email: String,
    /// Contact phone.
    pub phone: String,
    /// Date of birth.
    pub date_of_birth: NaiveDate,
    /// Current street address.
    pub current_address: String,
    /// Current city.
    pub current_city: String,
    /// Current state.
    pub current_state: String,
    /// Current ZIP/postal code.
    pub current_zip: String,
    /// Desired move-in date.
    pub move_in_date: NaiveDate,
    /// Employer name.
    pub employer: String,
    /// Job title.
    pub job_title: String,
    /// Length of employment.
    pub employment_length: String,
    /// Gross monthly income.
    pub monthly_income: f64,
    /// First reference name.
    pub reference1_name: String,
    /// First reference phone.
    pub reference1_phone: String,
    /// Second reference name.
    pub reference2_name: Option<String>,
    /// Second reference phone.
    pub reference2_phone: Option<String>,
    /// Whether the applicant has pets.
    pub pets: bool,
    /// Pet description.
    pub pet_description: Option<String>,
    /// Additional notes.
    pub additional_info: Option<String>,
    /// Background-check consent.
    pub background_check_consent: bool,
    /// Review status (TEXT).
    pub status: String,
    /// Submission timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

/// Validated input for [`submit_application`]; `listing_id`/`user_id`/
/// `landlord_id` are supplied by the handler and the listing lookup.
#[derive(Debug)]
pub struct NewApplication {
    /// Full legal name.
    pub full_name: String,
    /// Contact email.
    pub email: String,
    /// Contact phone.
    pub phone: String,
    /// Date of birth.
    pub date_of_birth: NaiveDate,
    /// Current street address.
    pub current_address: String,
    /// Current city.
    pub current_city: String,
    /// Current state.
    pub current_state: String,
    /// Current ZIP/postal code.
    pub current_zip: String,
    /// Desired move-in date.
    pub move_in_date: NaiveDate,
    /// Employer name.
    pub employer: String,
    /// Job title.
    pub job_title: String,
    /// Length of employment.
    pub employment_length: String,
    /// Gross monthly income.
    pub monthly_income: f64,
    /// First reference name.
    pub reference1_name: String,
    /// First reference phone.
    pub reference1_phone: String,
    /// Second reference name.
    pub reference2_name: Option<String>,
    /// Second reference phone.
    pub reference2_phone: Option<String>,
    /// Whether the applicant has pets.
    pub pets: bool,
    /// Pet description.
    pub pet_description: Option<String>,
    /// Additional notes.
    pub additional_info: Option<String>,
    /// Background-check consent.
    pub background_check_consent: bool,
}

/// Outcome of a submit attempt.
#[derive(Debug)]
pub enum SubmitOutcome {
    /// Created; carries the fresh row (boxed - it dwarfs the unit variant).
    Created(Box<ApplicationRow>),
    /// No active listing has that id, so there is nothing to apply to.
    ListingUnavailable,
}

/// Submits a tenant's application against an active listing, denormalizing the
/// listing's lister into `landlord_id`.
///
/// One atomic `INSERT ... SELECT`: the listing's `listed_by` is denormalized
/// into `landlord_id` and the active-listing gate lives in the `SELECT`'s
/// `WHERE`, so a missing/inactive listing inserts nothing (an empty `RETURNING`
/// becomes [`SubmitOutcome::ListingUnavailable`], a `404` upstream) instead of
/// needing a separate read. No check-then-insert window.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn submit_application(
    pool: &PgPool,
    listing_id: Uuid,
    tenant_id: Uuid,
    new: NewApplication,
) -> Result<SubmitOutcome, Error> {
    let row = sqlx::query_as!(
        ApplicationRow,
        r#"
            INSERT INTO rental_applications (
                listing_id, user_id, landlord_id,
                full_name, email, phone, date_of_birth,
                current_address, current_city, current_state, current_zip,
                move_in_date, employer, job_title, employment_length,
                monthly_income, reference1_name, reference1_phone,
                reference2_name, reference2_phone, pets, pet_description,
                additional_info, background_check_consent
            )
            SELECT
                l.id, $1, l.listed_by, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14::float8::numeric, $15, $16, $17, $18, $19,
                $20, $21, $22
            FROM listings l
            WHERE l.id = $23 AND l.state = 'active' AND l.deleted_at IS NULL
            RETURNING
                id, listing_id, user_id, landlord_id, full_name, email, phone,
                date_of_birth, current_address, current_city, current_state,
                current_zip, move_in_date, employer, job_title,
                employment_length, monthly_income::float8 AS "monthly_income!",
                reference1_name, reference1_phone, reference2_name,
                reference2_phone, pets, pet_description, additional_info,
                background_check_consent, status, created_at, updated_at
        "#,
        tenant_id,
        new.full_name,
        new.email,
        new.phone,
        new.date_of_birth,
        new.current_address,
        new.current_city,
        new.current_state,
        new.current_zip,
        new.move_in_date,
        new.employer,
        new.job_title,
        new.employment_length,
        new.monthly_income,
        new.reference1_name,
        new.reference1_phone,
        new.reference2_name,
        new.reference2_phone,
        new.pets,
        new.pet_description,
        new.additional_info,
        new.background_check_consent,
        listing_id,
    )
    .fetch_optional(pool)
    .await?;

    Ok(match row {
        Some(application) => SubmitOutcome::Created(Box::new(application)),
        None => SubmitOutcome::ListingUnavailable,
    })
}

/// Lists a tenant's own applications (newest first), each with its nested
/// listing, plus the total count for pagination. An application whose listing
/// was withdrawn keeps a `null` listing rather than disappearing.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_my_applications(
    pool: &PgPool,
    tenant_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<(Vec<RentalApplication>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page, so the total and the
    // returned page cannot disagree under concurrent inserts.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM rental_applications
            WHERE user_id = $1
        "#,
        tenant_id,
    )
    .fetch_one(tx.as_mut())
    .await?;

    let rows = sqlx::query_as!(
        ApplicationRow,
        r#"
            SELECT
                id, listing_id, user_id, landlord_id, full_name, email, phone,
                date_of_birth, current_address, current_city, current_state,
                current_zip, move_in_date, employer, job_title,
                employment_length, monthly_income::float8 AS "monthly_income!",
                reference1_name, reference1_phone, reference2_name,
                reference2_phone, pets, pet_description, additional_info,
                background_check_consent, status, created_at, updated_at
            FROM rental_applications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        "#,
        tenant_id,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;
    tx.commit().await?;

    // Hydrate the nested listings after the snapshot closes: a separate table,
    // and optional (an application outlives a withdrawn listing).
    let listing_ids = rows.iter().map(|row| row.listing_id).collect::<Vec<_>>();
    let listings = listings_db::fetch_listings_by_ids(pool, &listing_ids).await?;
    let applications = rows
        .into_iter()
        .map(|row| {
            let listing = listings.get(&row.listing_id).cloned();
            RentalApplication::assemble(row, listing)
        })
        .collect();
    Ok((applications, total))
}

/// Lists the applications submitted against a listing (newest first) plus the
/// total count. The caller's ownership of the listing is asserted upstream, so
/// this read is unscoped beyond `listing_id`. No nested listing - the landlord
/// already holds it.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_listing_applications(
    pool: &PgPool,
    listing_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<(Vec<RentalApplication>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page, so the total and the
    // returned page cannot disagree under concurrent inserts.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let total = sqlx::query_scalar!(
        r#"
            SELECT COUNT(*) AS "count!"
            FROM rental_applications
            WHERE listing_id = $1
        "#,
        listing_id,
    )
    .fetch_one(tx.as_mut())
    .await?;

    let rows = sqlx::query_as!(
        ApplicationRow,
        r#"
            SELECT
                id, listing_id, user_id, landlord_id, full_name, email, phone,
                date_of_birth, current_address, current_city, current_state,
                current_zip, move_in_date, employer, job_title,
                employment_length, monthly_income::float8 AS "monthly_income!",
                reference1_name, reference1_phone, reference2_name,
                reference2_phone, pets, pet_description, additional_info,
                background_check_consent, status, created_at, updated_at
            FROM rental_applications
            WHERE listing_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        "#,
        listing_id,
        limit,
        offset,
    )
    .fetch_all(tx.as_mut())
    .await?;
    tx.commit().await?;

    let applications = rows
        .into_iter()
        .map(|row| RentalApplication::assemble(row, None))
        .collect();
    Ok((applications, total))
}

/// Validated filter for [`list_landlord_applications`]. Absent fields impose no
/// constraint; limit/offset are pre-clamped by the pagination layer. The
/// landlord scope itself is the base query's constant predicate, not a filter.
#[derive(Debug)]
pub struct LandlordApplicationFilter {
    /// Review-status filter.
    pub status: Option<ApplicationStatus>,
    /// ILIKE term over applicant name + email.
    pub search: Option<String>,
    /// Restrict to applications on a single listing.
    pub listing_id: Option<Uuid>,
    /// Submitted on/after this date, inclusive.
    pub date_from: Option<NaiveDate>,
    /// Submitted on/before this date, inclusive.
    pub date_to: Option<NaiveDate>,
    /// Page size.
    pub limit: i64,
    /// Page offset.
    pub offset: i64,
}

impl AppendFilters for LandlordApplicationFilter {
    /// Pushes the dynamic WHERE filters shared by the count and page queries.
    #[inline]
    fn append_to(&self, builder: &mut QueryBuilder<Postgres>) {
        if let Some(status) = self.status {
            builder.push(" AND status = ").push_bind(status.to_string());
        }
        if let Some(search) = &self.search {
            builder
                .push(" AND (full_name ILIKE ")
                .push_bind(format!("%{search}%"))
                .push(" OR email ILIKE ")
                .push_bind(format!("%{search}%"))
                .push(")");
        }
        if let Some(listing_id) = self.listing_id {
            builder.push(" AND listing_id = ").push_bind(listing_id);
        }
        if let Some(date_from) = self.date_from {
            builder.push(" AND created_at >= ").push_bind(date_from);
        }
        if let Some(date_to) = self.date_to {
            // Inclusive of the whole `date_to` calendar day: everything strictly
            // before the following midnight.
            builder
                .push(" AND created_at < (")
                .push_bind(date_to)
                .push("::date + INTERVAL '1 day')");
        }
    }
}

/// Lists every application across the caller's listings (newest first), narrowed
/// by `filter`, with each application's nested listing hydrated, plus the total
/// match count. Scoped to the caller via the denormalized `landlord_id`, so no
/// join back to listings is needed.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_landlord_applications(
    pool: &PgPool,
    landlord_id: Uuid,
    filter: &LandlordApplicationFilter,
) -> Result<(Vec<RentalApplication>, i64), Error> {
    // One REPEATABLE READ snapshot for count + page, so the total and the
    // returned page cannot disagree under concurrent inserts.
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        .execute(tx.as_mut())
        .await?;

    let total = QueryBuilder::<Postgres>::new(
        r"
            SELECT COUNT(*)
            FROM rental_applications
            WHERE landlord_id =
        ",
    )
    .push_bind(landlord_id)
    .append(filter)
    .build_query_scalar::<i64>()
    .fetch_one(tx.as_mut())
    .await?;

    let rows = QueryBuilder::<Postgres>::new(
        r"
            SELECT
                id, listing_id, user_id, landlord_id, full_name, email, phone,
                date_of_birth, current_address, current_city, current_state,
                current_zip, move_in_date, employer, job_title,
                employment_length, monthly_income::float8 AS monthly_income,
                reference1_name, reference1_phone, reference2_name,
                reference2_phone, pets, pet_description, additional_info,
                background_check_consent, status, created_at, updated_at
            FROM rental_applications
            WHERE landlord_id =
        ",
    )
    .push_bind(landlord_id)
    .append(filter)
    .push(" ORDER BY created_at DESC")
    .limit_offset(filter.limit, filter.offset)
    .build_query_as::<ApplicationRow>()
    .fetch_all(tx.as_mut())
    .await?;
    tx.commit().await?;

    // Hydrate nested listings the same way the tenant list does: an application
    // outlives a withdrawn listing, so the nested listing stays optional.
    let listing_ids = rows.iter().map(|row| row.listing_id).collect::<Vec<_>>();
    let listings = listings_db::fetch_listings_by_ids(pool, &listing_ids).await?;
    let applications = rows
        .into_iter()
        .map(|row| {
            let listing = listings.get(&row.listing_id).cloned();
            RentalApplication::assemble(row, listing)
        })
        .collect();
    Ok((applications, total))
}

/// Fetches one application the caller is party to - as the applicant (tenant) or
/// the reviewing landlord - with its nested listing hydrated. An id the caller
/// has no part in (or that does not exist) reads as `None`: a `404` upstream
/// that leaks nothing, mirroring the review owner-check.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_application(
    pool: &PgPool,
    application_id: Uuid,
    user_id: Uuid,
) -> Result<Option<RentalApplication>, Error> {
    let row = sqlx::query_as!(
        ApplicationRow,
        r#"
            SELECT
                id, listing_id, user_id, landlord_id, full_name, email, phone,
                date_of_birth, current_address, current_city, current_state,
                current_zip, move_in_date, employer, job_title,
                employment_length, monthly_income::float8 AS "monthly_income!",
                reference1_name, reference1_phone, reference2_name,
                reference2_phone, pets, pet_description, additional_info,
                background_check_consent, status, created_at, updated_at
            FROM rental_applications
            WHERE id = $1 AND (user_id = $2 OR landlord_id = $2)
        "#,
        application_id,
        user_id,
    )
    .fetch_optional(pool)
    .await?;

    let Some(row) = row else {
        return Ok(None);
    };

    // Hydrate the nested listing the same way the tenant list does: a batch
    // fetch of one id, optional because an application outlives a withdrawn
    // listing.
    let listing = listings_db::fetch_listings_by_ids(pool, &[row.listing_id])
        .await?
        .remove(&row.listing_id);
    Ok(Some(RentalApplication::assemble(row, listing)))
}

/// Outcome of an owner-scoped review.
#[derive(Debug)]
pub enum ReviewOutcome {
    /// Reviewed; carries the fresh row (boxed - it dwarfs the unit variants).
    Updated(Box<ApplicationRow>),
    /// No application with that id is owned (as landlord) by the caller.
    NotFound,
    /// The requested status is not reachable from the application's current one.
    InvalidTransition,
}

/// Reviews an application the caller is the landlord of, advancing it along the
/// review lifecycle, atomically.
///
/// A `SELECT ... FOR UPDATE` locks the row so the landlord check, the
/// transition check and the write share one snapshot. A foreign application
/// reads as [`ReviewOutcome::NotFound`] (no leak); a target unreachable from the
/// current state (e.g. re-deciding a terminal one) is
/// [`ReviewOutcome::InvalidTransition`].
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn review_application(
    pool: &PgPool,
    application_id: Uuid,
    landlord_id: Uuid,
    status: ApplicationStatus,
) -> Result<ReviewOutcome, Error> {
    let mut tx = pool.begin().await?;

    let current = sqlx::query!(
        r"
            SELECT landlord_id, status
            FROM rental_applications
            WHERE id = $1
            FOR UPDATE
        ",
        application_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current) = current else {
        return Ok(ReviewOutcome::NotFound);
    };
    if current.landlord_id != landlord_id {
        return Ok(ReviewOutcome::NotFound);
    }
    let current_status =
        ApplicationStatus::from_str(&current.status).unwrap_or(ApplicationStatus::Pending);
    if !current_status.can_review_to(status) {
        return Ok(ReviewOutcome::InvalidTransition);
    }

    let row = sqlx::query_as!(
        ApplicationRow,
        r#"
            UPDATE rental_applications
            SET status = $2
            WHERE id = $1
            RETURNING
                id, listing_id, user_id, landlord_id, full_name, email, phone,
                date_of_birth, current_address, current_city, current_state,
                current_zip, move_in_date, employer, job_title,
                employment_length, monthly_income::float8 AS "monthly_income!",
                reference1_name, reference1_phone, reference2_name,
                reference2_phone, pets, pet_description, additional_info,
                background_check_consent, status, created_at, updated_at
        "#,
        application_id,
        status.to_string(),
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(ReviewOutcome::Updated(Box::new(row)))
}
