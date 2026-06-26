# Rust Microservice Architecture Design

## 1. Overview
This document outlines the architecture for a new high-performance Rust microservice integrated into the KeyChain Real Estate CRM Platform. This service complements the existing Next.js + Supabase stack by handling computationally intensive tasks such as complex tax calculations and heavy analytics processing.

## 2. Technology Stack
- **Language**: Rust (2021 edition)
- **Web Framework**: **Axum** (Ergonomic, modular, based on Tokio)
- **Async Runtime**: **Tokio**
- **Database Interface**: **SQLx** (Async, compile-time checked queries)
- **Serialization**: **Serde** (JSON handling)
- **Authentication**: **jsonwebtoken** (Validation of Supabase JWTs)
- **Error Handling**: **thiserror** / **anyhow**
- **Logging/Tracing**: **tracing** + **tracing-subscriber**

## 3. Architecture & Integration

### 3.1. System Context
The Rust microservice acts as a specialized worker node.
- **Frontend (Next.js)**: Sends requests to the Rust service for specific high-load operations.
- **Supabase (PostgreSQL)**: Shared database. The Rust service connects directly to the Supabase DB connection pool.
- **Auth**: The Rust service validates the `Authorization: Bearer <token>` header using the Supabase JWT secret.

### 3.2. Authentication Flow
1. User logs in via Next.js (Supabase Auth).
2. Frontend receives JWT (`access_token`).
3. Frontend includes this token in the header of requests to the Rust service.
4. Rust Middleware intercepts the request:
   - Decodes the JWT using the shared `SUPABASE_JWT_SECRET`.
   - Validates expiration and signature.
   - Extracts `sub` (User ID) and `role`.
   - Passes context to the handler or returns 401 Unauthorized.

## 4. API Structure

Base URL: `/api/v1`

### 4.1. Tax Center Endpoints
**POST** `/tax/calculate-liability`
- **Purpose**: Calculate complex tax liabilities based on income, deductions, and depreciation schedules.
- **Input**:
  ```json
  {
    "fiscal_year": 2024,
    "properties": ["uuid1", "uuid2"],
    "include_depreciation": true
  }
  ```
- **Output**: Detailed tax breakdown JSON.

**POST** `/tax/optimize-deductions`
- **Purpose**: AI-driven or algorithmic suggestion for deduction optimization.

### 4.2. Analytics Endpoints
**POST** `/analytics/property-performance`
- **Purpose**: Aggregates historical data (rent, maintenance, vacancy) to compute ROI, Cap Rate, and Cash-on-Cash return over time.
- **Input**: Date range, Property IDs.

**GET** `/health`
- **Purpose**: Kubernetes/Docker health check.

## 5. Data Models (Rust Structs)

### 5.1. Shared Models
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // User UUID
    pub role: String,
    pub exp: usize,
}
```

### 5.2. Tax Models
```rust
use uuid::Uuid;
use rust_decimal::Decimal;

#[derive(Debug, Deserialize)]
pub struct TaxCalculationRequest {
    pub fiscal_year: i32,
    pub property_ids: Vec<Uuid>,
    // Additional fields for specific scenarios
}

#[derive(Debug, Serialize)]
pub struct TaxReport {
    pub total_taxable_income: Decimal,
    pub total_deductions: Decimal,
    pub estimated_tax: Decimal,
    pub breakdown: Vec<TaxCategory>,
}

#[derive(Debug, Serialize)]
pub struct TaxCategory {
    pub category: String,
    pub amount: Decimal,
}
```

## 6. Database Interaction
The service will use `sqlx` to interact with the existing Supabase PostgreSQL instance.
- **Connection Pooling**: Managed by SQLx.
- **Environment**: `DATABASE_URL` provided via env vars (Transaction pooler port 6543 recommended).

## 7. Deployment Strategy
- **Containerization**: Dockerfile (Multi-stage build: `cargo chef` -> `cargo build --release` -> `distroless` or `debian-slim`).
- **Hosting**: Can be deployed on Fly.io, AWS Fargate, or DigitalOcean App Platform.
- **Environment Variables**:
  - `DATABASE_URL`: Connection string to Supabase Postgres.
  - `SUPABASE_JWT_SECRET`: Secret to verify JWT tokens.
  - `PORT`: Service port (default 8080).
  - `RUST_LOG`: Log level (e.g., `info`).

## 8. Implementation Steps
1. **Initialize Project**: Create `rust-service` directory and initialize Cargo.
2. **Dependencies**: Add `axum`, `tokio`, `serde`, `sqlx`, `jsonwebtoken`.
3. **Core Setup**: Setup main entry point and HTTP server.
4. **Auth Middleware**: Implement JWT verification.
5. **Database**: Configure SQLx connection pool.
6. **Handlers**: Implement Tax and Analytics logic.
7. **Docker**: Create Dockerfile for deployment.