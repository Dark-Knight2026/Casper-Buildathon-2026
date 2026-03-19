# Configuration Reference for `.secret/`

This document explains how to configure the `.secret/` directory used by the **Makefile** to deploy the application to Hetzner Cloud with **Docker Compose**.

```bash
make deploy
```

The `.secret/-secret.sh` file contains **all secrets and environment-specific settings**.
It is sourced by the Makefile before starting the Docker-based deployment environment, and its variables are passed into Terraform modules, helper scripts, and written as a `.env` file on the target server.

---

## Directory Layout

```text
.secret/
  |- -secret.sh                 # main secrets file (NOT committed, copy from template)
  |- secret.template.sh         # template with all variables (committed)
  |- env.dev.tfvars             # generated Terraform variables (NOT committed)
  |- readme.md                  # this documentation file (committed)
  |- -service_account.json      # GCP service account key (NOT committed)
  |- -iron_site_sdk             # SSH private key (NOT committed)
  |- -iron_site_sdk.pub         # SSH public key (NOT committed)
  |- .gitignore                 # ignores files prefixed with `-` and `.*`
```

Files prefixed with `-` are ignored by git. The `secret.template.sh` (no prefix) is committed as a reference.

The `-secret.sh` file is a regular bash script sourced by the Makefile:

```bash
source .secret/-secret.sh
```

---

## Required Variables

### Google Cloud

| Variable | Description | How to generate |
|----------|-------------|-----------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | See below |
| `GOOGLE_APPLICATION_PROJECT_ID` | GCP project ID | GCP Console |
| `GOOGLE_APPLICATION_REGION` | GCP region for GAR | Default: `europe-central2` |
| `GOOGLE_ENCRYPTION_KEY` | Encryption key for Terraform state in GCS | `openssl rand -base64 32` |

### SSH Keys

| Variable | Description |
|----------|-------------|
| `SSH_PRIVATE_KEY_PATH` | Path to SSH private key |
| `SSH_PUBLIC_KEY_PATH` | Path to SSH public key |

> Generate with: `ssh-keygen -t ed25519 -f .secret/-iron_site_sdk -C "deploy_key"`

### Host Server

| Variable | Description |
|----------|-------------|
| `HOST_SERVER_NAME` | Hetzner server hostname |

### Hetzner

| Variable | Description | How to get |
|----------|-------------|------------|
| `HETZNER_CLOUD_TOKEN` | Hetzner Cloud API token | [Hetzner Docs](https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/) |

### Deployment

| Variable | Values | Description |
|----------|--------|-------------|
| `DEPLOYMENT_MODE` | `dev` \| `staging` \| `production` | Target environment |
| `PROJECT_NAME` | string (no hyphens/spaces) | Used for GAR repo name and image tagging |
| `PROJECT_DOMAIN` | domain string | Domain for nginx `server_name` and Cloudflare |

### Backend / Application

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for token verification |
| `CORS_ORIGIN` | Allowed CORS origin (e.g. `https://leasefi.vercel.app`) |
| `CSPR_CLOUD_API_TOKEN` | CSPR.cloud API token |
| `CSPR_CLOUD_REST_URL` | CSPR.cloud REST endpoint URL |
| `CSPR_CLOUD_WSS_URL` | CSPR.cloud WebSocket URL |

---

## Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST_SERVER_LOCATION` | `hel1` | Hetzner datacenter |
| `HOST_SERVER_IMAGE` | `ubuntu-24.04` | Server OS image |
| `HOST_SERVER_TYPE` | `cx23` | Server hardware type |

---

## Retrieving Keys

### GCP Service Account Key

1. Open: <https://console.cloud.google.com/iam-admin/serviceaccounts>
2. Choose or create a Service Account with roles: `Artifact Registry Administrator`, `Storage Admin`
3. Go to **Keys** → **Add Key** → **Create new key** → **JSON**
4. Save as `.secret/-service_account.json`

### `GOOGLE_ENCRYPTION_KEY`

```bash
openssl rand -base64 32
```

### `HETZNER_CLOUD_TOKEN`

1. Open Hetzner Cloud Console
2. Go to **Security** → **API Tokens** → **Generate API Token**
3. Select **Read & Write** access

---

## How Secrets Are Used

During deployment, variables from `-secret.sh` are:

1. **Exported as `TF_VAR_*`** — passed to Terraform for infrastructure provisioning
2. **Written to `/opt/itinerary_service/deploy/.env`** on the server via Terraform `file` provisioner
3. **Loaded by Docker Compose** — `backend` and `indexer` containers read from `.env` at startup
