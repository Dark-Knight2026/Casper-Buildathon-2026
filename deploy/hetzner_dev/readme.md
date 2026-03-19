# hetzner_dev

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
- Creates an Ubuntu 24.04 server with `cloud-init.yml` for first-boot setup (Docker, ufw, fail2ban)

**2. Service deployment** (runs on every `terraform apply`):
- Waits for cloud-init to finish
- Creates `/opt/itinerary_service/deploy` and `/opt/itinerary_service/nginx` directories
- Copies files to the server:
  - `nginx/nginx.conf` → `/opt/itinerary_service/nginx/nginx.conf` (rendered with `project_domain`)
  - `redeploy.sh` → `/opt/itinerary_service/deploy/redeploy.sh`
  - `docker-compose.dev.yml` → `/opt/itinerary_service/deploy/docker-compose.yml`
  - Generated `.env` → `/opt/itinerary_service/deploy/.env`
  - GCP service account JSON → `/root/.sa.json`
- Runs `redeploy.sh` on the server

The `terraform_data.redeploy_sh` resource uses `triggers_replace = timestamp()`, so it re-runs on every apply regardless of changes.

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
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | — |
| `PROJECT_DOMAIN` | Domain for nginx `server_name` | — |
| `PROJECT_MAP_VARIABLES` | Map of all project env vars written to `.env` | — |

## Terraform State

Remote state stored in GCS:
- Bucket: `gs://bucket-{REPO_NAME}/{DEPLOYMENT_MODE}/hetzner_dev/`
- Encrypted with `GOOGLE_ENCRYPTION_KEY`

State is kept so Terraform can track existing Hetzner resources (server, IP, SSH key) and avoid recreating them on subsequent deploys.

## Server Access

```bash
# SSH to server
ssh root@<SERVER_IP>

# View running containers
docker ps

# Follow backend logs
docker logs -f leasefi_backend

# Follow all logs
docker compose \
  --project-directory /opt/itinerary_service/deploy \
  -f /opt/itinerary_service/deploy/docker-compose.yml \
  logs -f

# Manual redeploy (re-runs redeploy.sh with current .env)
bash /opt/itinerary_service/deploy/redeploy.sh
```
