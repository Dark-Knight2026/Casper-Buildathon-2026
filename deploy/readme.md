# Deploy Directory

This directory contains infrastructure-as-code and deployment automation for the project using **Docker Compose** for container orchestration on a **Hetzner Cloud** server, with **Cloudflare** handling DNS and SSL termination.

## Directory Structure

```
deploy/
├── Dockerfile.deploy      # Container image with deployment tools (gcloud, terraform, hcloud)
├── Makefile.deploy        # Main deployment orchestration (entry point)
├── cloud-init.yml         # Server initialization script (installs Docker, ufw, fail2ban)
├── redeploy.sh            # Deployment script executed on the target server
├── nginx/
│   └── nginx.conf         # Nginx reverse proxy config (template with project_domain)
├── gar/                   # Google Artifact Registry Terraform module
├── hetzner_dev/           # Hetzner server provisioning + service deployment Terraform module
└── tests/
    └── redeploy.bats      # Bats tests for redeploy.sh
```

## Architecture

```
            Client (HTTPS)
                  │
                  ▼
         Cloudflare (DNS + SSL)
                  │ HTTPS (Full Strict)
                  ▼
        Hetzner Server :443
                  │
                  ▼
         nginx (leasefi_nginx)
                  │ proxy_pass backend:8080
                  ▼
         backend (leasefi_backend)
                  │
           ┌──────┴──────┐
           ▼             ▼
     Redis (leasefi_redis)   Supabase PostgreSQL

    indexer (leasefi_indexer)
           │
     Redis + Supabase PostgreSQL
```

### Docker Compose Services

| Container | Image | Port | Description |
|-----------|-------|------|-------------|
| `leasefi_nginx` | `nginx:alpine` | `80:80` | Reverse proxy, routes traffic to backend |
| `leasefi_backend` | GAR `*_back:VERSION` | (internal) | REST API server on port 8080 |
| `leasefi_indexer` | GAR `*_indexer:VERSION` | (internal) | Blockchain indexer |
| `leasefi_redis` | `redis:7-alpine` | (internal) | Nonce store (5-min TTL) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (status, redis, database) |
| `GET /swagger-ui` | Swagger UI documentation |
| `GET /api-docs/openapi.json` | OpenAPI specification (JSON) |

## Deployment Flow

1. **`make -f deploy/Makefile.deploy deploy`** — builds a deployment container and runs the orchestration inside it:
   - Builds `backend` and `indexer` Docker images
   - Authenticates with GCP, creates GCS bucket for Terraform state (if needed)
   - Creates GAR repository via Terraform (`gar/`)
   - Pushes both images to GAR
   - Runs `deploy_dev` -> Terraform `hetzner_dev/`:
     - Creates Hetzner server or reuses existing
     - Copies `nginx.conf`, `redeploy.sh`, `docker-compose.dev.yml`, `.env` to server via SSH
     - Runs `redeploy.sh` on server

2. **`redeploy.sh`** runs on the target server:
   - Loads env from `/opt/<PROJECT_NAME>/deploy/.env`
   - Verifies both images exist in GAR registry
   - Pulls images
   - `docker compose down --remove-orphans`
   - `docker compose up -d`
   - Prunes unused images

## Environment Variables

### Required Secrets (`-secret.sh`)

| Variable | Description |
|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON |
| `GOOGLE_APPLICATION_PROJECT_ID` | GCP project ID |
| `GOOGLE_ENCRYPTION_KEY` | Key for Terraform state encryption in GCS |
| `SSH_PRIVATE_KEY_PATH` | Path to SSH private key for server access |
| `SSH_PUBLIC_KEY_PATH` | Path to SSH public key for server access |
| `HOST_SERVER_NAME` | Hetzner server hostname |
| `PROJECT_NAME` | Service identifier (no dashes), e.g. `anthony_leasefi_testing` |
| `PROJECT_DOMAIN` | Domain served by nginx and Cloudflare |
| `DEPLOYMENT_MODE` | `dev` \| `staging` \| `production` |

### Optional Secrets (`-secret.sh`)

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_APPLICATION_REGION` | `europe-central2` | GCP region for GAR |
| `HOST_SERVER_LOCATION` | `hel1` | Hetzner datacenter |
| `HOST_SERVER_IMAGE` | `ubuntu-24.04` | Server OS image |
| `HOST_SERVER_TYPE` | `cx23` | Server hardware type |
| `HETZNER_CLOUD_TOKEN` | — | Hetzner API token (required when creating a new server) |

### Required Project Variables (`-secret.sh`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret |
| `REDIS_URL` | Redis connection string — include password if set (e.g. `redis://:password@redis:6379` for local, or an external URL) |
| `REDIS_PASSWORD` | Redis authentication password — used by the local redis container's `--requirepass`; must match the password in `REDIS_URL` |
| `CORS_ORIGIN` | Allowed CORS origin |
| `RUN_MIGRATIONS` | Whether to run DB migrations on startup (`true` / `false`) |
| `CSPR_CLOUD_API_TOKEN` | CSPR.cloud API token |
| `CSPR_CLOUD_REST_URL` | CSPR.cloud REST URL |
| `CSPR_CLOUD_WSS_URL` | CSPR.cloud WebSocket URL |
| `CASPER_NODE_RPC_URL` | Casper node JSON-RPC URL |
| `CONTRACT_USDC` | CEP-18 USDC contract package hash |
| `CONTRACT_USDT` | CEP-18 USDT contract package hash |
| `CONTRACT_BIG` | BIG token contract package hash |
| `CONTRACT_TREASURY` | Treasury contract package hash |
| `CONTRACT_ICO` | ICO contract package hash |
| `CONTRACT_VESTING` | Vesting contract package hash |
| `CONTRACT_STAKING` | Staking contract package hash |
| `START_BLOCK_CONTRACT_USDC` | Indexer start block for USDC contract |
| `START_BLOCK_CONTRACT_USDT` | Indexer start block for USDT contract |
| `START_BLOCK_CONTRACT_BIG` | Indexer start block for BIG contract |
| `START_BLOCK_CONTRACT_TREASURY` | Indexer start block for Treasury contract |
| `START_BLOCK_CONTRACT_ICO` | Indexer start block for ICO contract |
| `START_BLOCK_CONTRACT_VESTING` | Indexer start block for Vesting contract |
| `START_BLOCK_CONTRACT_STAKING` | Indexer start block for Staking contract |

## Makefile Targets

| Target | Description |
|--------|-------------|
| `deploy` | Full deployment from host machine (wraps everything in a container) |
| `deployment_orchestration` | Runs inside deploy container; calls build -> gc_setup -> artifact_repo_create -> push -> deploy_dev |
| `build_image` | Builds `backend` and `indexer` Docker images |
| `push_image` | Pushes both images to GAR |
| `gc_setup` | Authenticates gcloud, creates GCS bucket, configures Docker for GAR |
| `artifact_repo_create` | Creates GAR repo via Terraform (`gar/`) |
| `deploy_dev` | Generates `.tfvars`, runs Terraform `hetzner_dev/` |
| `show_state_info` | Prints GCS paths for Terraform states |

```bash
# Full deployment
make -f deploy/Makefile.deploy deploy

# View all configured variables
make -f deploy/Makefile.deploy all

# Show Terraform state storage paths
make -f deploy/Makefile.deploy show_state_info
```

## Components

### Dockerfile.deploy

Container with all deployment tools:
- Google Cloud SDK (`gcloud`, `gsutil`)
- Terraform 1.14.4
- Hetzner CLI (`hcloud`)
- Docker CLI
- `make`, `jq`, `curl`

### cloud-init.yml

Server initialization script executed on first boot:
- Disables password SSH auth (key-only)
- Installs `ufw` firewall (allows 22, 80, 443)
- Installs `fail2ban` (SSH brute-force protection)
- Installs Docker CE + Docker Compose plugin
- Authenticates Docker with GAR using the GCP service account

### nginx/nginx.conf

Nginx reverse proxy template rendered by Terraform (`templatefile`):
- Listens on port 80
- `server_name` set to `PROJECT_DOMAIN`
- Proxies all requests to `backend:8080` (Docker Compose service name)
- Uses `resolver 127.0.0.11` (Docker DNS) with a variable-based `proxy_pass` so nginx starts even if the backend container isn't ready yet
- Reads real client IP from `CF-Connecting-IP` header (Cloudflare)

### docker-compose.dev.yml

Defines four services on a shared `leasefi_net` bridge network with IPv6 support:
- All service logs are capped at 10 MB × 3 files
- `backend` and `indexer` load env from `.env` file at `/opt/<PROJECT_NAME>/deploy/.env`
- Redis data is persisted in a named volume

### hetzner_dev/

Terraform module that handles both server provisioning and service deployment:
- Creates static IPv4, SSH key, and Hetzner server if needed
- Copies files to server via SSH (`file` provisioner): `nginx.conf`, `redeploy.sh`, `docker-compose.dev.yml`, `.env`
- Runs `redeploy.sh` on every `terraform apply` (`triggers_replace = timestamp()`)

### gar/

Terraform module that creates the Google Artifact Registry Docker repository.
State stored remotely in GCS: `gs://bucket-{REPO_NAME}/{DEPLOYMENT_MODE}/gar/`.

## Terraform State

| Module | Backend | Reason |
|--------|---------|--------|
| `gar/` | GCS (remote) | Needs to track repository existence across runs |
| `hetzner_dev/` | GCS (remote) | Tracks server resources; prevents duplicate server creation |

States are encrypted with `GOOGLE_ENCRYPTION_KEY`.

## Server Access

```bash
# SSH to server
ssh root@<SERVER_IP>

# View running containers
docker ps

# Follow backend logs
docker logs -f leasefi_backend

# Follow nginx logs
docker logs -f leasefi_nginx

# Restart all services
docker compose --project-directory /opt/<PROJECT_NAME>/deploy \
  -f /opt/<PROJECT_NAME>/deploy/docker-compose.yml restart

# Manual redeploy (after updating .env or pulling new image)
bash /opt/<PROJECT_NAME>/deploy/redeploy.sh
```

## SSL / HTTPS

Cloudflare is set to **Full (Strict)** mode:
- Client ↔ Cloudflare: HTTPS (TLS)
- Cloudflare ↔ Origin server: HTTPS (TLS, port 443) — Let's Encrypt certificate

nginx redirects port 80 -> 443. The HTTPS server block is generated from `nginx/https.conf.template` via `envsubst` on every deploy.

### Certificate lifecycle

| Step | What happens |
|------|-------------|
| First `terraform apply` | `redeploy.sh` generates a self-signed cert -> nginx starts -> certbot obtains a real Let's Encrypt cert via Cloudflare DNS-01 -> nginx reloads |
| Every 60 days (auto) | System cron (`0 0,12 * * *`) runs `certbot renew`; deploy hook reloads nginx on success |
| First of every month (auto) | Cron upgrades certbot itself via pip |

### Required `.env` variables

| Variable | Description |
|----------|-------------|
| `PROJECT_DOMAIN` | The domain nginx serves (e.g. `api.leasefi.com`) |
| `CF_DNS_API_TOKEN` | Cloudflare API token with `Zone:DNS:Edit` permission — used by certbot for DNS-01 challenge |
| `CERTBOT_EMAIL` | Email for Let's Encrypt account registration and expiry notices |

### Certbot failure / retry

If certbot fails (DNS propagation timeout, wrong token), the self-signed cert stays in place and nginx keeps serving. The sentinel file `deploy/.self-signed` is preserved. Re-running `redeploy.sh` (or the next `terraform apply`) retries certbot automatically.
