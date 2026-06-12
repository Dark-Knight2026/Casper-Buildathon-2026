//! Request/response models for the rental-application endpoints.
//!
//! The PII fields (name, DOB, income, references) mirror the wire contract
//! one-to-one; `status` is a fixed-set TEXT column mapped to a `strum` enum at
//! the model boundary (the `ListingState` pattern).

use core::str::FromStr;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    common::{ApiError, ApiResult},
    services::{
        applications::db::{ApplicationRow, NewApplication},
        listings::models::Listing,
    },
};

/// Lifecycle status of an application. Stored as TEXT (CHECK) in the DB; parsed
/// into this enum at the model boundary.
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, EnumString, Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum ApplicationStatus {
    /// Awaiting landlord review.
    Pending,
    /// Approved by the landlord.
    Approved,
    /// Rejected by the landlord.
    Rejected,
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
}

impl SubmitApplicationRequest {
    /// Validates the payload and maps it into a [`NewApplication`].
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when a required field is blank, the
    /// email is obviously malformed, or `monthlyIncome` is not a positive
    /// finite number.
    #[inline]
    pub fn into_validated(self) -> ApiResult<NewApplication> {
        let full_name = required("fullName", &self.full_name)?;
        let email = required("email", &self.email)?;
        if !email.contains('@') {
            return Err(ApiError::BadRequest("email is invalid".to_owned()));
        }
        let phone = required("phone", &self.phone)?;
        let current_address = required("currentAddress", &self.current_address)?;
        let current_city = required("currentCity", &self.current_city)?;
        let current_state = required("currentState", &self.current_state)?;
        let current_zip = required("currentZip", &self.current_zip)?;
        let employer = required("employer", &self.employer)?;
        let job_title = required("jobTitle", &self.job_title)?;
        let employment_length = required("employmentLength", &self.employment_length)?;
        let reference1_name = required("reference1Name", &self.reference1_name)?;
        let reference1_phone = required("reference1Phone", &self.reference1_phone)?;
        if !self.monthly_income.is_finite() || self.monthly_income <= 0.0 {
            return Err(ApiError::BadRequest(
                "monthlyIncome must be a positive number".to_owned(),
            ));
        }

        Ok(NewApplication {
            full_name,
            email,
            phone,
            date_of_birth: self.date_of_birth,
            current_address,
            current_city,
            current_state,
            current_zip,
            move_in_date: self.move_in_date,
            employer,
            job_title,
            employment_length,
            monthly_income: self.monthly_income,
            reference1_name,
            reference1_phone,
            reference2_name: optional(self.reference2_name),
            reference2_phone: optional(self.reference2_phone),
            pets: self.pets,
            pet_description: optional(self.pet_description),
            additional_info: optional(self.additional_info),
            background_check_consent: self.background_check_consent,
        })
    }
}

/// Review-an-application payload (`PUT /applications/{id}/status`).
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReviewApplicationRequest {
    /// Decision: `approved` or `rejected` (`pending` is not a valid target).
    pub status: ApplicationStatus,
}

impl ReviewApplicationRequest {
    /// Validates that the requested status is a terminal review decision.
    ///
    /// # Errors
    ///
    /// Returns [`ApiError::BadRequest`] when the target is `pending` (a review
    /// can only approve or reject).
    #[inline]
    pub fn into_validated(self) -> ApiResult<ApplicationStatus> {
        if self.status == ApplicationStatus::Pending {
            return Err(ApiError::BadRequest(
                "status must be 'approved' or 'rejected'".to_owned(),
            ));
        }
        Ok(self.status)
    }
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
