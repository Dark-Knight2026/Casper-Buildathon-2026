# Deployment Architecture & Cost Diagram

## Overview

This document describes the container topology and estimated monthly infrastructure costs for the LeaseFi platform (Rust API, Blockchain Indexer, and supporting services including frontend).

Deployment is fully automated: `make -f deploy/Makefile.deploy deploy` builds Docker images, pushes them to Google Artifact Registry, provisions the Hetzner server via Terraform, and runs `redeploy.sh` over SSH. Build/test CI (lint, fmt, unit/integration tests) is not yet configured as a GitHub Actions workflow; it currently runs locally via `make ci`.

---

## Architecture Diagram

```mermaid
graph TB
    CLIENT["Frontend<br/>(SPA)"]

    subgraph "Hetzner (Docker Compose)"
        NGINX["Nginx<br/>(reverse proxy)<br/>:443 TLS · :80 -> 301 redirect<br/>HSTS enabled"]
        subgraph "Docker: API Server"
            API["API Server<br/>(Rust/Axum)<br/>Dockerfile<br/>:8080 internal"]
        end
        REDIS["Redis 7-alpine<br/>Nonce Store<br/>password via redis.conf"]
        subgraph "Docker: Indexer"
            IDX["Blockchain Indexer<br/>(Rust/Tokio)<br/>Dockerfile.indexer"]
            %% BACKFILL and STREAM are concurrent Tokio tasks within one binary — not separate processes
            BACKFILL["Backfill Task<br/>(REST polling)"]
            STREAM["Streaming Task<br/>(WSS realtime)"]
            IDX --> BACKFILL
            IDX --> STREAM
        end
    end

    subgraph "Supabase Cloud"
        PG["PostgreSQL 16+"]
    end

    %% URLs are env-specific; .env.example defaults to testnet
    subgraph "CSPR.cloud"
        REST["REST API<br/>(CSPR_CLOUD_REST_URL)"]
        WSS["WSS Streaming<br/>(CSPR_CLOUD_WSS_URL)"]
    end

    LE["Let's Encrypt<br/>(certbot DNS-01<br/>via Cloudflare API)"]

    %% Full (Strict): Cloudflare validates the Let's Encrypt cert chain
    CF["Cloudflare Proxy<br/>(Full / Full Strict)"]

    CLIENT -->|"HTTPS :443"| CF
    CF -->|"HTTPS :443<br/>(TLS — Let's Encrypt cert)"| NGINX
    NGINX -->|"HTTP :8080 internal<br/>/health, /api/v1/*, /swagger-ui, /api-docs/*"| API

    LE -.->|"cert issued on first deploy<br/>renewed by cron"| NGINX

    API -->|"SQLx pool"| PG
    API -->|"Nonce store (5-min TTL)"| REDIS
    %% JWT validation is local HS256 (SUPABASE_JWT_SECRET) — no network call to Supabase Auth
    %% Auth flow: nonce -> Casper Wallet Ed25519/Secp256k1 signature -> local verify -> issue JWT

    IDX -->|"SQLx pool"| PG
    BACKFILL -->|"HTTP GET<br/>/ft-token-actions (CEP-18), /deploys (ICO)"| REST
    STREAM -->|"WebSocket<br/>contract-events"| WSS
```

---

## CI/CD Flow

```mermaid
flowchart TD
    DEV["Developer<br/>make -f deploy/Makefile.deploy deploy"]

    subgraph "Deploy container (Dockerfile.deploy)"
        BUILD["docker build<br/>(Dockerfile + Dockerfile.indexer)"]
        GCPAUTH["gcloud auth<br/>GAR setup (Terraform)"]
        PUSH["docker push<br/>-> Google Artifact Registry"]
    end

    subgraph "Terraform: hetzner_dev"
        TF_SERVER["Provision Hetzner server<br/>(cloud-init on first deploy)"]
        TF_FILES["Copy files via SSH<br/>redeploy.sh · docker-compose.yml<br/>nginx.conf · https.conf.template<br/>redis.conf.template · .env"]
        TF_RUN["ssh: sudo -E bash redeploy.sh"]
    end

    subgraph "redeploy.sh (on server)"
        PREFLIGHT["Pre-flight validation<br/>(VERSION, PROJECT_DOMAIN, images in GAR)"]
        GENCONF["Generate configs via envsubst<br/>nginx https.conf · redis.conf"]
        CERT["Bootstrap self-signed cert<br/>(first deploy only)"]
        PULL["docker pull images from GAR"]
        ROLLBACK_SAVE["Save rollback state<br/>(.env.rollback)"]
        DOWN["docker compose down"]
        UP["docker compose up -d"]
        HEALTHCHECK["Poll /health (120s)<br/>start_period 60s + migration time"]
        CERTBOT["certbot DNS-01<br/>obtain Let's Encrypt cert<br/>(first deploy only)"]
        PRUNE["docker image prune"]
    end

    ROLLBACK["Rollback:<br/>pull previous images<br/>docker compose up -d"]

    DEV --> BUILD
    BUILD --> GCPAUTH
    GCPAUTH --> PUSH
    PUSH --> TF_SERVER
    TF_SERVER --> TF_FILES
    TF_FILES --> TF_RUN
    TF_RUN --> PREFLIGHT
    PREFLIGHT --> GENCONF
    GENCONF --> CERT
    CERT --> PULL
    PULL --> ROLLBACK_SAVE
    ROLLBACK_SAVE --> DOWN
    DOWN --> UP
    UP --> HEALTHCHECK
    HEALTHCHECK -->|"HTTP 200"| CERTBOT
    HEALTHCHECK -->|"timeout"| ROLLBACK
    CERTBOT --> PRUNE
```

---

## Monthly Cost Breakdown

| Service | Tier | Cost/mo | Notes |
|---|---|---|---|
| **Vercel** | Free -> Pro | $0 -> ~$20 | Free: 100 GB bandwidth, custom domain, no SLA; Pro adds team + SLA |
| **Supabase** | Free -> Pro | $0 -> ~$25 | Free: 500 MB DB, 1 GB storage (500 MB cap is the binding constraint — indexer continuous writes prevent inactivity pause); Pro: 8 GB DB, daily backups |
| **Hetzner** (API + Redis + Indexer) | CX23 · 2 vCPU / 4 GB / 40 GB SSD | $4.09 | Docker Compose on a single server; IPv4 $0.60/mo already included in $4.09 total |
| **Stripe** | Pay-per-use | 2.9% + $0.30/tx | **Planned — not yet integrated.** No monthly base fee; test mode is free |
| **Resend** | Free -> Pro | $0 -> ~$20 | **Planned — not yet integrated.** Free: 3 000 emails/mo, 100/day; Pro: 50 000/mo |
| **Cloudflare** | Free | $0 | DNS, reverse proxy, DDoS protection. Full / Full (Strict) SSL — Cloudflare validates the Let's Encrypt cert; both legs are TLS |
| **CSPR.cloud** | Pay-per-use | ~$0–50 | Free: 100 000 API req/mo budget; daily cap 6 000/day (two independent limits — first reached applies), 3 simultaneous streaming connections; cost scales above those limits |
| **Google Artifact Registry** | Pay-per-use | ~$0–2 | Storage ~$0.10/GB/mo; egress billed on pulls. Terraform managed; used by the deployment pipeline |
| **Google Cloud Storage** | Pay-per-use | ~$0 | Terraform remote state backend. Standard storage ~$0.02/GB/mo; negligible for state files |
| **Domain + SSL** | — | ~$1.25 | ~$15/yr billed annually; TLS terminated by Nginx (Let's Encrypt) and Vercel (frontend) |

**Estimated total: ~$5.35/mo** on free tiers (dev/MVP) -> **~$70–120/mo** production (paid plans)
