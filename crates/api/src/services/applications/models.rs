//! Request/response models for the rental-application endpoints.
//!
//! The PII fields (name, DOB, income, references) mirror the wire contract
//! one-to-one; `status` is a fixed-set TEXT column mapped to a `strum` enum at
//! the model boundary (the `ListingState` pattern).

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strum::{Display, EnumString};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult, Pagination},
    services::{
        applications::db::{
            ApplicationNoteRow, ApplicationRow, BackgroundCheckRow, LandlordApplicationFilter,
            NewApplication,
        },
        listings::models::Listing,
    },
};
// The check-type/status vocabulary is owned by the provider port but is part of
// the wire contract, so re-export it here as the application models' own - this
// keeps the OpenAPI schema registry uniformly `models::`-sourced.
pub use crate::providers::background_check::{BackgroundCheckStatus, BackgroundCheckType};

/// Lifecycle status of an application. Stored as TEXT (CHECK) in the DB; parsed
/// into this enum at the model boundary.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ApplicationStatus {
    /// Being filled in by the applicant, before submission.
    Draft,
    /// Submitted, awaiting landlord review.
    Pending,
    /// The landlord is actively reviewing.
    UnderReview,
    /// Conditionally approved, pending stated conditions.
    Conditional,
    /// Approved by the landlord.
    Approved,
    /// Rejected by the landlord.
    Rejected,
}

impl ApplicationStatus {
    /// Whether a landlord review may move an application from `self` to `target`.
    ///
    /// The open review states - `pending`, `under_review`, `conditional` - may
    /// advance to `under_review`, `conditional`, `approved` or `rejected`.
    /// `draft` is pre-review and `approved`/`rejected` are terminal, so neither
    /// is a valid source; `draft`/`pending` are never review targets (a review
    /// decides, it does not unsubmit). Returning to `pending` is the separate
    /// request-info action, not a review.
    #[inline]
    #[must_use]
    pub fn can_review_to(self, target: Self) -> bool {
        let open_source = matches!(self, Self::Pending | Self::UnderReview | Self::Conditional);
        let review_target = matches!(
            target,
            Self::UnderReview | Self::Conditional | Self::Approved | Self::Rejected
        );
        open_source && review_target
    }
}

/// A rental application as returned on the wire.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RentalApplication {
    /// Application id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Listing this application targets.
    #[schema(value_type = Uuid)]
    pub listing_id: Uuid,
    /// Applicant (tenant) user id.
    #[schema(value_type = Uuid)]
    pub user_id: Uuid,
    /// Reviewing landlord user id.
    #[schema(value_type = Uuid)]
    pub landlord_id: Uuid,
    /// Full legal name.
    pub full_name: String,
    /// Contact email.
    pub email: String,
    /// Contact phone.
    pub phone: String,
    /// Date of birth (`YYYY-MM-DD`).
    pub date_of_birth: NaiveDate,
    /// Current street address.
    pub current_address: String,
    /// Current city.
    pub current_city: String,
    /// Current state.
    pub current_state: String,
    /// Current ZIP/postal code.
    pub current_zip: String,
    /// Desired move-in date (`YYYY-MM-DD`).
    pub move_in_date: NaiveDate,
    /// Employer name.
    pub employer: String,
    /// Job title.
    pub job_title: String,
    /// Length of employment (free text, e.g. "3 years").
    pub employment_length: String,
    /// Gross monthly income.
    pub monthly_income: f64,
    /// First reference name.
    pub reference1_name: String,
    /// First reference phone.
    pub reference1_phone: String,
    /// Second reference name (optional).
    pub reference2_name: Option<String>,
    /// Second reference phone (optional).
    pub reference2_phone: Option<String>,
    /// Whether the applicant has pets.
    pub pets: bool,
    /// Pet description (optional).
    pub pet_description: Option<String>,
    /// Any additional notes (optional).
    pub additional_info: Option<String>,
    /// Whether the applicant consented to a background check.
    pub background_check_consent: bool,
    /// Review status.
    pub status: ApplicationStatus,
    /// The listing this application targets; nested in `GET /applications`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub listing: Option<Listing>,
    /// Submission timestamp.
    pub created_at: DateTime<Utc>,
    /// Last update timestamp.
    pub updated_at: DateTime<Utc>,
}

impl RentalApplication {
    /// Assembles the wire shape from a row plus an optional nested listing.
    #[inline]
    #[must_use]
    pub fn assemble(row: ApplicationRow, listing: Option<Listing>) -> Self {
        Self {
            id: row.id,
            listing_id: row.listing_id,
            user_id: row.user_id,
            landlord_id: row.landlord_id,
            full_name: row.full_name,
            email: row.email,
            phone: row.phone,
            date_of_birth: row.date_of_birth,
            current_address: row.current_address,
            current_city: row.current_city,
            current_state: row.current_state,
            current_zip: row.current_zip,
            move_in_date: row.move_in_date,
            employer: row.employer,
            job_title: row.job_title,
            employment_length: row.employment_length,
            monthly_income: row.monthly_income,
            reference1_name: row.reference1_name,
            reference1_phone: row.reference1_phone,
            reference2_name: row.reference2_name,
            reference2_phone: row.reference2_phone,
            pets: row.pets,
            pet_description: row.pet_description,
            additional_info: row.additional_info,
            background_check_consent: row.background_check_consent,
            status: ApplicationStatus::from_str(&row.status).unwrap_or(ApplicationStatus::Pending),
            listing,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Submit-an-application payload (`POST /listings/{id}/applications`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SubmitApplicationRequest {
    /// Full legal name.
    pub full_name: String,
    /// Contact email.
    pub email: String,
    /// Contact phone.
    pub phone: String,
    /// Date of birth (`YYYY-MM-DD`).
    pub date_of_birth: NaiveDate,
    /// Current street address.
    pub current_address: String,
    /// Current city.
    pub current_city: String,
    /// Current state.
    pub current_state: String,
    /// Current ZIP/postal code.
    pub current_zip: String,
    /// Desired move-in date (`YYYY-MM-DD`).
    pub move_in_date: NaiveDate,
    /// Employer name.
    pub employer: String,
    /// Job title.
    pub job_title: String,
    /// Length of employment (free text).
    pub employment_length: String,
    /// Gross monthly income.
    pub monthly_income: f64,
    /// First reference name.
    pub reference1_name: String,
    /// First reference phone.
    pub reference1_phone: String,
    /// Second reference name (optional).
    pub reference2_name: Option<String>,
    /// Second reference phone (optional).
    pub reference2_phone: Option<String>,
    /// Whether the applicant has pets.
    #[serde(default)]
    pub pets: bool,
    /// Pet description (optional).
    pub pet_description: Option<String>,
    /// Any additional notes (optional).
    pub additional_info: Option<String>,
    /// Whether the applicant consents to a background check.
    #[serde(default)]
    pub background_check_consent: bool,
    /// Create as an editable draft instead of submitting immediately.
    #[serde(default)]
    pub as_draft: bool,
}

impl TryFrom<SubmitApplicationRequest> for NewApplication {
    type Error = ApiError;

    /// Validates the payload and maps it into a [`NewApplication`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when a required field is blank, the
    /// email is obviously malformed, or `monthlyIncome` is not a positive
    /// finite number.
    #[inline]
    fn try_from(request: SubmitApplicationRequest) -> ApiResult<Self> {
        let full_name = required("fullName", &request.full_name)?;
        let email = required("email", &request.email)?;
        if !email.contains('@') {
            return Err(ApiError::BadRequest("email is invalid".to_owned()));
        }
        let phone = required("phone", &request.phone)?;
        let current_address = required("currentAddress", &request.current_address)?;
        let current_city = required("currentCity", &request.current_city)?;
        let current_state = required("currentState", &request.current_state)?;
        let current_zip = required("currentZip", &request.current_zip)?;
        let employer = required("employer", &request.employer)?;
        let job_title = required("jobTitle", &request.job_title)?;
        let employment_length = required("employmentLength", &request.employment_length)?;
        let reference1_name = required("reference1Name", &request.reference1_name)?;
        let reference1_phone = required("reference1Phone", &request.reference1_phone)?;
        if !request.monthly_income.is_finite() || request.monthly_income <= 0.0 {
            return Err(ApiError::BadRequest(
                "monthlyIncome must be a positive number".to_owned(),
            ));
        }

        Ok(NewApplication {
            full_name,
            email,
            phone,
            date_of_birth: request.date_of_birth,
            current_address,
            current_city,
            current_state,
            current_zip,
            move_in_date: request.move_in_date,
            employer,
            job_title,
            employment_length,
            monthly_income: request.monthly_income,
            reference1_name,
            reference1_phone,
            reference2_name: optional(request.reference2_name),
            reference2_phone: optional(request.reference2_phone),
            pets: request.pets,
            pet_description: optional(request.pet_description),
            additional_info: optional(request.additional_info),
            background_check_consent: request.background_check_consent,
        })
    }
}

/// Review-an-application payload (`PUT /applications/{id}/status`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReviewApplicationRequest {
    /// Review target: `under_review`, `conditional`, `approved` or `rejected`.
    pub status: ApplicationStatus,
}

impl TryFrom<ReviewApplicationRequest> for ApplicationStatus {
    type Error = ApiError;

    /// Validates that the requested status is a reachable review target.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] for `draft`/`pending`, which a review
    /// cannot set. Whether the target is reachable from the application's
    /// current state is checked against that state in the db layer.
    #[inline]
    fn try_from(request: ReviewApplicationRequest) -> ApiResult<Self> {
        match request.status {
            ApplicationStatus::Draft | ApplicationStatus::Pending => Err(ApiError::BadRequest(
                "status must be 'under_review', 'conditional', 'approved' or 'rejected'".to_owned(),
            )),
            target => Ok(target),
        }
    }
}

/// Landlord cross-listing application search (`GET /applications/landlord`).
#[derive(Debug, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct LandlordApplicationParams {
    /// Filter by review status.
    pub status: Option<ApplicationStatus>,
    /// ILIKE over applicant name + email.
    pub search: Option<String>,
    /// Restrict to applications on one listing.
    #[param(value_type = Uuid)]
    pub listing_id: Option<Uuid>,
    /// Submitted on/after this date, inclusive (`YYYY-MM-DD`).
    pub date_from: Option<NaiveDate>,
    /// Submitted on/before this date, inclusive (`YYYY-MM-DD`).
    pub date_to: Option<NaiveDate>,
}

impl LandlordApplicationParams {
    /// Validates the filters and resolves them into a
    /// [`LandlordApplicationFilter`], folding in the page window.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when `dateFrom` is after `dateTo`.
    #[inline]
    pub fn into_validated(self, pagination: &Pagination) -> ApiResult<LandlordApplicationFilter> {
        if let (Some(from), Some(to)) = (self.date_from, self.date_to)
            && from > to
        {
            return Err(ApiError::BadRequest(
                "dateFrom must not be after dateTo".to_owned(),
            ));
        }
        Ok(LandlordApplicationFilter {
            status: self.status,
            search: self.search.filter(|term| !term.trim().is_empty()),
            listing_id: self.listing_id,
            date_from: self.date_from,
            date_to: self.date_to,
            limit: pagination.page_size(),
            offset: pagination.offset(),
        })
    }
}

/// A private landlord note on an application, as returned on the wire.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationNote {
    /// Note id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Application the note annotates.
    #[schema(value_type = Uuid)]
    pub application_id: Uuid,
    /// Author (reviewing landlord) user id.
    #[schema(value_type = Uuid)]
    pub author_id: Uuid,
    /// Note text.
    pub body: String,
    /// Creation timestamp.
    pub created_at: DateTime<Utc>,
}

impl From<ApplicationNoteRow> for ApplicationNote {
    /// Builds the wire shape from a stored row.
    #[inline]
    fn from(row: ApplicationNoteRow) -> Self {
        Self {
            id: row.id,
            application_id: row.application_id,
            author_id: row.author_id,
            body: row.body,
            created_at: row.created_at,
        }
    }
}

/// Add-a-note payload (`POST /applications/{id}/notes`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AddNoteRequest {
    /// Note text.
    pub body: String,
}

impl TryFrom<AddNoteRequest> for String {
    type Error = ApiError;

    /// Validates and trims the note body into a stored note body.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when the body is blank.
    #[inline]
    fn try_from(request: AddNoteRequest) -> ApiResult<Self> {
        let body = request.body.trim();
        if body.is_empty() {
            return Err(ApiError::BadRequest("note body cannot be empty".to_owned()));
        }
        Ok(body.to_owned())
    }
}

/// A background check on an application, as returned on the wire.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundCheck {
    /// Check id.
    #[schema(value_type = Uuid)]
    pub id: Uuid,
    /// Application the check ran against.
    #[schema(value_type = Uuid)]
    pub application_id: Uuid,
    /// Requesting landlord user id.
    #[schema(value_type = Uuid)]
    pub requested_by: Uuid,
    /// Check type.
    pub check_type: BackgroundCheckType,
    /// Lifecycle status.
    pub status: BackgroundCheckStatus,
    /// Bureau report, absent until resolved.
    #[schema(value_type = Option<Object>)]
    pub result: Option<Value>,
    /// Bureau-side reference, when available.
    pub reference: Option<String>,
    /// Request timestamp.
    pub created_at: DateTime<Utc>,
    /// Resolution timestamp, absent while pending.
    pub completed_at: Option<DateTime<Utc>>,
}

impl From<BackgroundCheckRow> for BackgroundCheck {
    /// Builds the wire shape from a stored row, parsing the TEXT enums.
    #[inline]
    fn from(row: BackgroundCheckRow) -> Self {
        Self {
            id: row.id,
            application_id: row.application_id,
            requested_by: row.requested_by,
            check_type: BackgroundCheckType::from_str(&row.check_type)
                .unwrap_or(BackgroundCheckType::Credit),
            status: BackgroundCheckStatus::from_str(&row.status)
                .unwrap_or(BackgroundCheckStatus::Pending),
            result: row.result.map(|json| json.0),
            reference: row.reference,
            created_at: row.created_at,
            completed_at: row.completed_at,
        }
    }
}

/// Request-a-check payload (`POST /applications/{id}/background-checks`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RequestBackgroundCheckRequest {
    /// Which check to run.
    pub check_type: BackgroundCheckType,
}

/// One weighted factor in an applicant's score.
#[derive(Debug, Clone, Copy, Serialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ScoreFactorKind {
    /// Monthly income relative to rent.
    Income,
    /// Credit background check.
    Credit,
    /// Length of employment.
    Employment,
    /// Supplied references.
    References,
    /// Criminal/eviction background checks.
    Background,
}

/// A single factor's contribution to an applicant's score.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScoreFactor {
    /// Which factor this is.
    pub factor: ScoreFactorKind,
    /// The factor's maximum contribution.
    pub weight: i32,
    /// Points awarded, `0..=weight`.
    pub score: i32,
}

/// A computed applicant score with its weighted breakdown (out of 100).
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationScore {
    /// Total score, `0..=100`.
    pub total: i32,
    /// Per-factor contributions, summing to `total`.
    pub breakdown: Vec<ScoreFactor>,
}

/// Trims a required free-text field, rejecting a blank value.
fn required(field: &str, raw: &str) -> ApiResult<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(ApiError::BadRequest(format!("{field} cannot be empty")));
    }
    Ok(trimmed.to_owned())
}

/// Trims an optional free-text field; a blank value collapses to `None`.
fn optional(value: Option<String>) -> Option<String> {
    value
        .map(|raw| raw.trim().to_owned())
        .filter(|trimmed| !trimmed.is_empty())
}
