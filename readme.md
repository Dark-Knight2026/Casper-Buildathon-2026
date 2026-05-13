# LeaseFi Backend Service

High-performance Rust microservice for the KeyChain/LeaseFi Real Estate Platform. Handles authentication, property management analytics, tax calculations, ICO tracking, and blockchain event indexing.

## Prerequisites

- **Docker & Docker Compose**
- **Rust** (v1.92.0+)
- **Supabase CLI** (v1.x+)
- **SQLx CLI** (`cargo install sqlx-cli`)
- **cargo-nextest** (`cargo install cargo-nextest`)

## Setup

### 1. Environment configuration

```bash
cp .env.example .env
```

Edit `.env` - the following variables require your own values:

| Variable               | Description                                           |
|------------------------|-------------------------------------------------------|
| `SUPABASE_JWT_SECRET`  | Shown in `supabase start` output (`JWT secret`)       |
| `CSPR_CLOUD_API_TOKEN` | API key from [CSPR.cloud](https://cspr.cloud)         |
| `CORS_ORIGIN`          | Frontend URL (e.g. `http://localhost:3000`)           |
| `CASPER_SECRET_KEY`    | Path to `.pem` file (only for manual testnet tests)   |

The rest (contract hashes, start blocks, Redis/DB URLs, S3/MinIO credentials) have working defaults for the Casper testnet and local MinIO.

### 2. Start infrastructure

Start Supabase (Postgres + Auth + Storage), Redis, and MinIO:

```bash
make env-up
```

This runs `supabase start` and `docker compose up -d redis minio minio-init`. MinIO is an S3-compatible blob backend for avatar uploads; `minio-init` creates the default bucket on first run. For backend configuration details (AWS S3 / R2 / MinIO) see [`docs/feature/media_storage.md`](docs/feature/media_storage.md).

### 3. Apply database migrations

```bash
make migrate
```

Resets the local database and applies all migrations from `supabase/migrations/`.

### 4. Prepare SQLx offline metadata

Required for CI/Docker builds (`SQLX_OFFLINE=true`). Re-run whenever SQL queries change:

```bash
make prepare
```

## Running

### API server

```bash
make run
```

The API will be available at `http://localhost:8080`. Swagger UI: `http://localhost:8080/swagger-ui`.

### Blockchain indexer

```bash
make index
```

Connects to the Casper network, backfills historical events from configured contracts, then switches to real-time streaming via WebSocket.

## Testing

```bash
make test
```

Starts a dedicated test Postgres container and runs all tests with `cargo-nextest`.

## Code quality

```bash
make check    # fmt + sqlx prepare + clippy + openapi schema check
make validate # check + tests
```

## Authentication flow

LeaseFi uses Casper Wallet signature-based authentication (challenge-response). No passwords - the user proves wallet ownership by signing a nonce.

Set your wallet public key once:

```bash
export WALLET=0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca
```

### Step 1 - Get a nonce

```bash
curl "http://localhost:8080/api/v1/auth/nonce?wallet_address=$WALLET"
```

Response example:

```json
{
  "nonce": "aB3kLm9xPq2wZy4t",
  "message": "Sign this message to login to LeaseFi. Nonce: aB3kLm9xPq2wZy4t"
}
```

### Step 2 - Sign the message

Sign the `message` value from step 1 with your private key. The Casper Wallet
browser extension does this automatically (prepends `"Casper Message:\n"` before
signing).

With `casper-client`:

```bash
casper-client sign-message \
  --message "Sign this message to login to LeaseFi. Nonce: aB3kLm9xPq2wZy4t" \
  --secret-key /path/to/secret_key.pem
```

Returns a hex signature string.

### Step 3 - Login with the signature

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"wallet_address\": \"$WALLET\",
    \"signature\": \"01abcdef...hex_signature_from_step_2\"
  }"
```

Response example:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "...", "role": "tenant" }
}
```

### Step 4 - Use the token

```bash
export TOKEN=eyJhbGciOi...token_from_step_3

curl http://localhost:8080/api/v1/ico/balance/ec91fa80...account_hash \
  -H "Authorization: Bearer $TOKEN"
```

> **Note:** Some endpoints are public and don't require a token:
> `GET /api/v1/ico/progress`, `GET /api/v1/transactions/token/big`,
> `GET /api/v1/transactions/account/{address}`.

## Project structure

```
crates/
  api/       - Axum HTTP server (auth, ICO, tax, analytics, transactions)
  indexer/   - Blockchain event indexer (backfill + streaming)
supabase/
  migrations/ - PostgreSQL migrations
docs/         - Project documentation
```

## Available make targets

```bash
make help
```
