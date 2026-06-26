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
## Generate with: ssh-keygen -t ed25519 -f .secret/-anthony_leasefi_dev -C "anthony_leasefi_dev"
SSH_PRIVATE_KEY_PATH=".secret/-anthony_leasefi_dev"
SSH_PUBLIC_KEY_PATH=".secret/-anthony_leasefi_dev.pub"


# CLOUDFLARE ORIGIN CERTIFICATE (optional — not used in the default certbot flow)
## If you want to use a Cloudflare Origin CA certificate instead of Let's Encrypt,
## issue the cert at: https://dash.cloudflare.com -> SSL/TLS -> Origin Server -> Create Certificate
## Save the certificate and private key to .secret/ and set the paths below.
## Then pass these variables into the Makefile / CI and mount them in redeploy.sh.
## NOTE: currently the deployment uses certbot (DNS-01 via Cloudflare) to obtain
## a Let's Encrypt certificate. These paths are only needed if you switch back
## to the Origin CA approach.
# ORIGIN_CERT_PATH=".secret/-origin.crt"
# ORIGIN_KEY_PATH=".secret/-origin.key"


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

CERTBOT_EMAIL="<your-certbot-email>"
CF_DNS_API_TOKEN="<your-cloudflare-dns-api-token>"


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

RUN_MIGRATIONS="false"
ALLOW_DB_RESET="false"
## Redis password for the local Redis container (--requirepass). Must match the password in REDIS_URL.
## For an external Redis service, set REDIS_URL to the full connection string provided by that service.
REDIS_PASSWORD="<your-redis-password>"
REDIS_URL="redis://:${REDIS_PASSWORD}@redis:6379"

## CSPR.cloud API (Casper Network indexer)
CSPR_CLOUD_API_TOKEN="<your-cspr-cloud-api-token>"
CSPR_CLOUD_REST_URL="https://api.testnet.cspr.cloud"
CSPR_CLOUD_WSS_URL="wss://streaming.testnet.cspr.cloud/contract-events"
CASPER_NODE_RPC_URL="http://<your-casper-node>:7777/rpc"

## Smart contract addresses
CONTRACT_USDC="<contract-hash-usdc>"
CONTRACT_USDT="<contract-hash-usdt>"
CONTRACT_BIG="<contract-hash-big>"
CONTRACT_TREASURY="<contract-hash-treasury>"
CONTRACT_ICO="<contract-hash-ico>"
CONTRACT_VESTING="<contract-hash-vesting>"
CONTRACT_STAKING="<contract-hash-staking>"

## Indexer start blocks (deploy block number for each contract)
START_BLOCK_CONTRACT_USDC="0"
START_BLOCK_CONTRACT_USDT="0"
START_BLOCK_CONTRACT_BIG="0"
START_BLOCK_CONTRACT_TREASURY="0"
START_BLOCK_CONTRACT_ICO="0"
START_BLOCK_CONTRACT_VESTING="0"
START_BLOCK_CONTRACT_STAKING="0"
