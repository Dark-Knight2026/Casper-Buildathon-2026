# Google Artifact Registry

Terraform configuration for provisioning a Google Artifact Registry repository to store Docker images for deployments.

## Responsibility Table

| File | Responsibility |
|------|----------------|
| `main.tf` | Define Google provider and Artifact Registry repository resource |
| `variables.tf` | Declare input variables for GCP region, project ID, and repository name |
| `outputs.tf` | Export created repository name for use by other modules |

## What It Does

Creates a Docker-format Artifact Registry repository in the specified GCP region and project. This is a one-time provisioning step — the repository persists across deploys.

## Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_APPLICATION_REGION` | GCP region for the repository |
| `GOOGLE_APPLICATION_PROJECT_ID` | GCP project ID |
| `ARTIFACT_REPO_NAME` | Name of the Artifact Registry repository |

## Outputs

| Output | Description |
|--------|-------------|
| `repo_name` | Name of the created Artifact Registry repository |

## Terraform State

Remote state stored in GCS:
- Bucket: `gs://bucket-{REPO_NAME}/{DEPLOYMENT_MODE}/gar/`
- Encrypted with `GOOGLE_ENCRYPTION_KEY`
- State locking enabled automatically via GCS object metadata — do not run concurrent `terraform apply` operations

State is kept so Terraform can track the existing repository and avoid recreating it on subsequent runs.
