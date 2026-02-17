# LeaseFi Backend Service

High-performance Rust microservice for the KeyChain/LeaseFi Real Estate Platform.
Handles authentication, property management analytics, and tax calculations.

## 🚀 Prerequisites

- **Docker & Docker Compose**
- **Rust** (v1.92.0+)
- **Supabase CLI** (v1.x+)
- **SQLx CLI** (`cargo install sqlx-cli`)

## 🛠️ Setup & Running

### 1. Initialize Infrastructure
Start the local Supabase instance (Postgres + Storage + Auth):
```bash
supabase start
```
*Note: This will automatically apply migrations located in `supabase/migrations`.*

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Update `DATABASE_URL` with the output from `supabase start`.

### 3. Prepare SQLx Metadata
Since we use `SQLX_OFFLINE=true` for Docker builds, you must regenerate metadata whenever SQL queries change:

```bash
cargo sqlx prepare
```


### 4. Run with Docker
```bash
docker-compose up --build
```
The API will be available at `http://localhost:8080`.

## 🧪 Testing

Check if the service is running:
```bash
curl http://localhost:8080/health
```

## 📂 Project Structure

- `/src` - Rust source code (Axum handlers, models, DB layer).
- `/supabase` - Database migrations and Edge Functions.
- `/docs` - Project documentation and specifications.