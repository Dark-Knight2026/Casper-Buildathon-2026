# hetzner_dev

> **Dev environment only.** This module is not hardened for production. Do not use with production credentials or data.

Terraform module that provisions a Hetzner Cloud server and deploys all services to it via SSH.

## Responsibility Table

| File | Responsibility |
|------|----------------|
| `main.tf` | SSH key, static IPv4, server instance, file provisioning via SSH, redeploy execution |
| `variables.tf` | Input variables for server config, SSH keys, and project env vars |
| `outputs.tf` | Exports server public IPv4 address |

## What It Does

This module serves two purposes in a single `terraform apply`:

**1. Server provisioning**:
- Allocates a static IPv4 address
- Uploads the SSH public key
- Creates an Ubuntu 24.04 server with `cloud-init.yml` for first-boot setup:
  - Installs Docker, ufw, fail2ban, certbot (with `certbot-dns-cloudflare`)
  - Decodes the GCP service account from base64 (embedded in cloud-init), logs into Artifact Registry, then shreds the credentials
  - Configures cron jobs for certbot renewal (twice daily) and monthly certbot upgrades
  - Creates `/opt/<PROJECT_NAME>/deploy`, `/opt/<PROJECT_NAME>/nginx`, `/opt/<PROJECT_NAME>/logs`

**2. Service deployment** (runs on every `terraform apply`):
- Waits for cloud-init to finish
- Creates `/opt/<PROJECT_NAME>/deploy` and `/opt/<PROJECT_NAME>/nginx` directories
- Copies files to the server:
  - `nginx/nginx.conf` -> `/opt/<PROJECT_NAME>/nginx/nginx.conf`
  - `nginx/https.conf.template` -> `/opt/<PROJECT_NAME>/nginx/https.conf.template` (expanded by `envsubst` in `redeploy.sh`)
  - `redeploy.sh` -> `/opt/<PROJECT_NAME>/deploy/redeploy.sh`
  - `docker-compose.dev.yml` -> `/opt/<PROJECT_NAME>/deploy/docker-compose.yml`
  - Generated `.env` -> `/opt/<PROJECT_NAME>/deploy/.env`
- Runs `redeploy.sh` on the server

The `terraform_data.redeploy_sh` resource uses `triggers_replace` with `filesha256(...)` hashes of all deployed files and a hash of the `.env` contents, so it re-runs only when those inputs change.

## Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HETZNER_CLOUD_TOKEN` | Hetzner API token | — |
| `HOST_SERVER_NAME` | Server name in Hetzner | — |
| `HOST_SERVER_TYPE` | Server hardware type | `cx23` |
| `HOST_SERVER_IMAGE` | OS image | `ubuntu-24.04` |
| `HOST_SERVER_LOCATION` | Hetzner datacenter | `hel1` |
| `SSH_PRIVATE_KEY_PATH` | Path to SSH private key file | — |
| `SSH_PUBLIC_KEY_PATH` | Path to SSH public key file | — |
| `GOOGLE_APPLICATION_REGION` | GCP region (used in cloud-init for Docker login) | — |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON (embedded as base64 in cloud-init) | — |
| `PROJECT_NAME` | Project name (lowercase snake-case, 3–40 chars) | — |
| `DEPLOYMENT_MODE` | Deployment mode (`dev` \| `staging` \| `production`) | — |
| `PROJECT_DOMAIN` | Domain for nginx `server_name` | — |
| `TAG` | Docker image base tag (`registry/repo/name`) | — |
| `VERSION` | Docker image version/tag | — |
| `PROJECT_MAP_VARIABLES` | Map of all project env vars written to `.env` | — |

## Terraform State

Remote state stored in GCS:
- Bucket: `gs://bucket-{REPO_NAME}/{DEPLOYMENT_MODE}/hetzner_dev/`
- Encrypted with `GOOGLE_ENCRYPTION_KEY`

State is kept so Terraform can track existing Hetzner resources (server, IP, SSH key) and avoid recreating them on subsequent deploys.

## Server Access

```bash
# SSH to server
ssh deploy@<SERVER_IP>

# View running containers
docker ps

# Follow backend logs
docker logs -f <PROJECT_NAME>_backend

# Follow all logs
docker compose \
  --project-directory /opt/<PROJECT_NAME>/deploy \
  -f /opt/<PROJECT_NAME>/deploy/docker-compose.yml \
  logs -f

# Manual redeploy (re-runs redeploy.sh with current .env)
sudo -E bash /opt/<PROJECT_NAME>/deploy/redeploy.sh
```
