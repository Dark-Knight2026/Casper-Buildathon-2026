//! Database operations for rental applications.
//!
//! `landlord_id` is denormalized from the listing at submit time, so the review
//! owner-check is a local `WHERE landlord_id = $caller` predicate. The nested
//! listing in `GET /applications` is hydrated through
//! [`listings_db::fetch_listings_by_ids`]; an application outlives a withdrawn
//! listing, so that nested listing is optional.

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use serde_json::Value;
use sqlx::{Error, FromRow, PgPool, Postgres, QueryBuilder, types::Json};
use uuid::Uuid;

use crate::{
    common::{AppendFilters, QueryBuilderExt},
    providers::{BackgroundCheckStatus, BackgroundCheckType},
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
    status: ApplicationStatus,
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
                additional_info, background_check_consent, status
            )
            SELECT
                l.id, $1, l.listed_by, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14::float8::numeric, $15, $16, $17, $18, $19,
                $20, $21, $22, $24
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
        status.to_string(),
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
            WHERE listing_id = $1 AND status <> 'draft'
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
            WHERE listing_id = $1 AND status <> 'draft'
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
    .push(" AND status <> 'draft'")
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
    .push(" AND status <> 'draft'")
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
            WHERE id = $1 AND (user_id = $2 OR (landlord_id = $2 AND status <> 'draft'))
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

/// A private landlord note on an application, as stored.
#[derive(Debug, FromRow)]
pub struct ApplicationNoteRow {
    /// Note id.
    pub id: Uuid,
    /// Application the note annotates.
    pub application_id: Uuid,
    /// Author (the reviewing landlord) user id.
    pub author_id: Uuid,
    /// Note text.
    pub body: String,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
}

/// Adds a private landlord note to an application the caller is the landlord of.
///
/// One atomic `INSERT ... SELECT`: the landlord owner-check lives in the
/// `SELECT`'s `WHERE`, so a foreign or unknown application inserts nothing - an
/// empty `RETURNING` becomes `None`, a `404` upstream that leaks nothing - with
/// no check-then-insert window.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn add_application_note(
    pool: &PgPool,
    application_id: Uuid,
    landlord_id: Uuid,
    body: String,
) -> Result<Option<ApplicationNoteRow>, Error> {
    let row = sqlx::query_as!(
        ApplicationNoteRow,
        r"
            INSERT INTO application_notes (application_id, author_id, body)
            SELECT $1, $2, $3
            FROM rental_applications
            WHERE id = $1 AND landlord_id = $2
            RETURNING id, application_id, author_id, body, created_at
        ",
        application_id,
        landlord_id,
        body,
    )
    .fetch_optional(pool)
    .await?;
    Ok(row)
}

/// Lists the notes on an application the caller is the landlord of (newest
/// first). A foreign or unknown application reads as `None` (a `404` upstream),
/// kept distinct from an owned application that simply has no notes (an empty
/// `Vec`).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_application_notes(
    pool: &PgPool,
    application_id: Uuid,
    landlord_id: Uuid,
) -> Result<Option<Vec<ApplicationNoteRow>>, Error> {
    let owns = sqlx::query_scalar!(
        r#"
            SELECT EXISTS(
                SELECT 1 FROM rental_applications
                WHERE id = $1 AND landlord_id = $2
            ) AS "owns!"
        "#,
        application_id,
        landlord_id,
    )
    .fetch_one(pool)
    .await?;
    if !owns {
        return Ok(None);
    }

    let notes = sqlx::query_as!(
        ApplicationNoteRow,
        r"
            SELECT id, application_id, author_id, body, created_at
            FROM application_notes
            WHERE application_id = $1
            ORDER BY created_at DESC
        ",
        application_id,
    )
    .fetch_all(pool)
    .await?;
    Ok(Some(notes))
}

/// The applicant data a background check needs, plus their consent flag, read
/// owner-scoped for the landlord requesting the check.
#[derive(Debug)]
pub struct ApplicationSubject {
    /// Applicant's full legal name.
    pub full_name: String,
    /// Applicant's date of birth.
    pub date_of_birth: NaiveDate,
    /// Whether the applicant consented to a background check.
    pub consent: bool,
}

/// Reads the applicant subject for an application the caller is the landlord of.
/// A foreign or unknown application reads as `None` (a `404` upstream).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_application_subject(
    pool: &PgPool,
    application_id: Uuid,
    landlord_id: Uuid,
) -> Result<Option<ApplicationSubject>, Error> {
    let row = sqlx::query!(
        r"
            SELECT full_name, date_of_birth, background_check_consent
            FROM rental_applications
            WHERE id = $1 AND landlord_id = $2
        ",
        application_id,
        landlord_id,
    )
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|record| ApplicationSubject {
        full_name: record.full_name,
        date_of_birth: record.date_of_birth,
        consent: record.background_check_consent,
    }))
}

/// A background-check row as stored. `check_type`/`status` stay `String` here
/// and are parsed at the model boundary; `result` is the bureau's JSONB report.
#[derive(Debug, FromRow)]
pub struct BackgroundCheckRow {
    /// Check id.
    pub id: Uuid,
    /// Application the check ran against.
    pub application_id: Uuid,
    /// Requesting landlord user id.
    pub requested_by: Uuid,
    /// Check type (TEXT).
    pub check_type: String,
    /// Lifecycle status (TEXT).
    pub status: String,
    /// Bureau report (JSONB), absent until resolved.
    pub result: Option<Json<Value>>,
    /// Bureau-side reference, when available.
    pub reference: Option<String>,
    /// Request timestamp.
    pub created_at: DateTime<Utc>,
    /// Resolution timestamp, absent while pending.
    pub completed_at: Option<DateTime<Utc>>,
}

/// Records the outcome of a background check the landlord requested. The owner
/// check and consent gate are enforced upstream; this is the write half.
/// `completed_at` is stamped for a terminal `status`, left null while pending.
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn insert_background_check(
    pool: &PgPool,
    application_id: Uuid,
    requested_by: Uuid,
    check_type: BackgroundCheckType,
    status: BackgroundCheckStatus,
    result: Value,
    reference: Option<String>,
) -> Result<BackgroundCheckRow, Error> {
    let row = sqlx::query_as!(
        BackgroundCheckRow,
        r#"
            INSERT INTO background_checks (
                application_id, requested_by, check_type, status, result,
                reference, completed_at
            )
            VALUES (
                $1, $2, $3, $4, $5, $6,
                CASE WHEN $4 IN ('completed', 'failed') THEN NOW() ELSE NULL END
            )
            RETURNING
                id, application_id, requested_by, check_type, status,
                result AS "result?: Json<serde_json::Value>", reference,
                created_at, completed_at
        "#,
        application_id,
        requested_by,
        check_type.to_string(),
        status.to_string(),
        result,
        reference,
    )
    .fetch_one(pool)
    .await?;
    Ok(row)
}

/// Lists the background checks on an application the caller is the landlord of
/// (newest first). A foreign or unknown application reads as `None` (a `404`
/// upstream), distinct from an owned application with no checks (an empty
/// `Vec`).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn list_background_checks(
    pool: &PgPool,
    application_id: Uuid,
    landlord_id: Uuid,
) -> Result<Option<Vec<BackgroundCheckRow>>, Error> {
    let owns = sqlx::query_scalar!(
        r#"
            SELECT EXISTS(
                SELECT 1 FROM rental_applications
                WHERE id = $1 AND landlord_id = $2
            ) AS "owns!"
        "#,
        application_id,
        landlord_id,
    )
    .fetch_one(pool)
    .await?;
    if !owns {
        return Ok(None);
    }

    let rows = sqlx::query_as!(
        BackgroundCheckRow,
        r#"
            SELECT
                id, application_id, requested_by, check_type, status,
                result AS "result?: Json<serde_json::Value>", reference,
                created_at, completed_at
            FROM background_checks
            WHERE application_id = $1
            ORDER BY created_at DESC
        "#,
        application_id,
    )
    .fetch_all(pool)
    .await?;
    Ok(Some(rows))
}

/// The inputs the scoring layer needs, gathered owner-scoped for the landlord.
#[derive(Debug)]
pub struct ScoreInputs {
    /// Applicant's gross monthly income.
    pub monthly_income: f64,
    /// The listing's monthly rent, absent if the listing was withdrawn.
    pub rent_monthly: Option<f64>,
    /// Free-text length of employment.
    pub employment_length: String,
    /// Whether a second reference was supplied.
    pub has_second_reference: bool,
    /// Latest credit check verdict: cleared / adverse / absent.
    pub credit_cleared: Option<bool>,
    /// Latest criminal check verdict.
    pub criminal_cleared: Option<bool>,
    /// Latest eviction check verdict.
    pub eviction_cleared: Option<bool>,
}

/// Gathers the scoring inputs for an application the caller is the landlord of:
/// the affordability/employment/reference fields, the listing's rent, and the
/// latest completed background check per type. A foreign or unknown application
/// reads as `None` (a `404` upstream).
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn fetch_score_inputs(
    pool: &PgPool,
    application_id: Uuid,
    landlord_id: Uuid,
) -> Result<Option<ScoreInputs>, Error> {
    let application = sqlx::query!(
        r#"
            SELECT
                a.monthly_income::float8 AS "monthly_income!",
                a.employment_length,
                a.reference2_name,
                (l.terms->>'rentMonthly')::float8 AS rent_monthly
            FROM rental_applications a
            LEFT JOIN listings l ON l.id = a.listing_id
            WHERE a.id = $1 AND a.landlord_id = $2
        "#,
        application_id,
        landlord_id,
    )
    .fetch_optional(pool)
    .await?;

    let Some(application) = application else {
        return Ok(None);
    };

    // Latest completed check per type, so a re-run supersedes an earlier verdict.
    let checks = sqlx::query!(
        r"
            SELECT DISTINCT ON (check_type)
                check_type, result->>'summary' AS summary
            FROM background_checks
            WHERE application_id = $1 AND status = 'completed'
            ORDER BY check_type, created_at DESC
        ",
        application_id,
    )
    .fetch_all(pool)
    .await?;

    let cleared_for = |kind: &str| {
        checks
            .iter()
            .find(|check| check.check_type == kind)
            .map(|check| check.summary.as_deref() == Some("clear"))
    };

    Ok(Some(ScoreInputs {
        monthly_income: application.monthly_income,
        rent_monthly: application.rent_monthly,
        employment_length: application.employment_length,
        has_second_reference: application.reference2_name.is_some(),
        credit_cleared: cleared_for("credit"),
        criminal_cleared: cleared_for("criminal"),
        eviction_cleared: cleared_for("eviction"),
    }))
}

/// Outcome of a tenant draft operation (edit or submit).
#[derive(Debug)]
pub enum DraftOutcome {
    /// Succeeded; carries the fresh row (boxed - it dwarfs the unit variants).
    Updated(Box<ApplicationRow>),
    /// No application with that id is owned (as applicant) by the caller.
    NotFound,
    /// The application exists but is not a `draft`, so it cannot be edited or
    /// submitted.
    NotDraft,
}

/// Replaces the fields of a `draft` application the caller owns, atomically.
///
/// A `SELECT ... FOR UPDATE` locks the row so the owner check, the draft-state
/// check and the write share one snapshot. A foreign/unknown application reads
/// as [`DraftOutcome::NotFound`] (no leak); a non-draft one as
/// [`DraftOutcome::NotDraft`].
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn update_draft(
    pool: &PgPool,
    application_id: Uuid,
    tenant_id: Uuid,
    new: NewApplication,
) -> Result<DraftOutcome, Error> {
    let mut tx = pool.begin().await?;

    let current = sqlx::query!(
        r"
            SELECT user_id, status
            FROM rental_applications
            WHERE id = $1
            FOR UPDATE
        ",
        application_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current) = current else {
        return Ok(DraftOutcome::NotFound);
    };
    if current.user_id != tenant_id {
        return Ok(DraftOutcome::NotFound);
    }
    if current.status != "draft" {
        return Ok(DraftOutcome::NotDraft);
    }

    let row = sqlx::query_as!(
        ApplicationRow,
        r#"
            UPDATE rental_applications
            SET full_name = $2, email = $3, phone = $4, date_of_birth = $5,
                current_address = $6, current_city = $7, current_state = $8,
                current_zip = $9, move_in_date = $10, employer = $11,
                job_title = $12, employment_length = $13,
                monthly_income = $14::float8::numeric, reference1_name = $15,
                reference1_phone = $16, reference2_name = $17,
                reference2_phone = $18, pets = $19, pet_description = $20,
                additional_info = $21, background_check_consent = $22
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
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(DraftOutcome::Updated(Box::new(row)))
}

/// Submits a `draft` application the caller owns, moving it to `pending`.
///
/// Shares the locked owner + draft-state check with [`update_draft`]; a
/// foreign/unknown application reads as [`DraftOutcome::NotFound`], a non-draft
/// one as [`DraftOutcome::NotDraft`].
///
/// # Errors
///
/// Returns [`Error`] on any database failure.
#[inline]
pub async fn submit_draft(
    pool: &PgPool,
    application_id: Uuid,
    tenant_id: Uuid,
) -> Result<DraftOutcome, Error> {
    let mut tx = pool.begin().await?;

    let current = sqlx::query!(
        r"
            SELECT user_id, status
            FROM rental_applications
            WHERE id = $1
            FOR UPDATE
        ",
        application_id,
    )
    .fetch_optional(tx.as_mut())
    .await?;

    let Some(current) = current else {
        return Ok(DraftOutcome::NotFound);
    };
    if current.user_id != tenant_id {
        return Ok(DraftOutcome::NotFound);
    }
    if current.status != "draft" {
        return Ok(DraftOutcome::NotDraft);
    }

    let row = sqlx::query_as!(
        ApplicationRow,
        r#"
            UPDATE rental_applications
            SET status = 'pending'
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
    )
    .fetch_one(tx.as_mut())
    .await?;

    tx.commit().await?;
    Ok(DraftOutcome::Updated(Box::new(row)))
}
