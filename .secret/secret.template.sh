# -------------------------------------------------------------------------------------------------------------
# Required Parameters
# Copy this file to .secret/-secret.sh and fill in your values.
# -------------------------------------------------------------------------------------------------------------

# GOOGLE CREDS
## Path to the service account credentials JSON (roles: Artifact Registry Admin, Storage Admin)
GOOGLE_APPLICATION_CREDENTIALS=".secret/-service_account.json"
## GCP project ID
GOOGLE_APPLICATION_PROJECT_ID="<your-gcp-project-id>"
## GCP region for Google Artifact Registry
GOOGLE_APPLICATION_REGION="europe-central2"
## Encryption key for Terraform state in GCS
## Generate with: openssl rand -base64 32
GOOGLE_ENCRYPTION_KEY="<generated-encryption-key>"


# SSH KEYS
## Generate with: ssh-keygen -t ed25519 -f .secret/-iron_site_sdk -C "deploy_key"
SSH_PRIVATE_KEY_PATH=".secret/-iron_site_sdk"
SSH_PUBLIC_KEY_PATH=".secret/-iron_site_sdk.pub"


# HETZNER
## Get from https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/
HETZNER_CLOUD_TOKEN="<your-hetzner-api-token>"


# HOST SERVER
HOST_SERVER_NAME="<your-server-hostname>"


# ======== DEPLOYMENT CONFIG ========
## Deployment mode: dev | staging | production
DEPLOYMENT_MODE="dev"


# ======== PROJECT CONFIG ========
## Project name (no hyphens or spaces, used for GAR repo and image tagging)
PROJECT_NAME="my_project"
## Domain for nginx server_name and Cloudflare DNS
PROJECT_DOMAIN="example.com"


# ======== HETZNER SERVER CONFIG ========
## Datacenter: fsn1 | nbg1 | hel1 | ash | hil
HOST_SERVER_LOCATION="hel1"
HOST_SERVER_IMAGE="ubuntu-24.04"
HOST_SERVER_TYPE="cx23"


# =============================================================================
# Backend Application Secrets

## PostgreSQL connection string (Supabase)
DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
## Supabase JWT secret for token verification
SUPABASE_JWT_SECRET="<your-supabase-jwt-secret>"
## Allowed CORS origin
CORS_ORIGIN="https://<your-frontend-domain>"

## CSPR.cloud API (Casper Network indexer)
CSPR_CLOUD_API_TOKEN="<your-cspr-cloud-api-token>"
CSPR_CLOUD_REST_URL="https://api.testnet.cspr.cloud"
CSPR_CLOUD_WSS_URL="wss://streaming.testnet.cspr.cloud/contract-events"
