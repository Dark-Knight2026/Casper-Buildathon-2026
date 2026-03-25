# Specifies google region location
variable "GOOGLE_APPLICATION_REGION" {
  description = "GOOGLE APPLICATION REGION of the resources"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]+$", var.GOOGLE_APPLICATION_REGION))
    error_message = "Region must match GCP format (e.g., europe-central2)"
  }
}

# Project id
variable "GOOGLE_APPLICATION_PROJECT_ID" {
  description = "PROJECT APPLICATION ID for the resources"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[a-z0-9-]{6,30}$", var.GOOGLE_APPLICATION_PROJECT_ID))
    error_message = "GOOGLE_APPLICATION_PROJECT_ID must be a valid GCP project ID (lowercase, hyphens, 6-30 chars)"
  }
}

# Artifact Registry repository name
variable "ARTIFACT_REPO_NAME" {
  description = "Artifact registry name"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,62}$", var.ARTIFACT_REPO_NAME))
    error_message = "ARTIFACT_REPO_NAME must start with a letter or digit, contain only lowercase alphanumeric and hyphens, and be 2-63 chars (GCP Artifact Registry constraint)"
  }
}
