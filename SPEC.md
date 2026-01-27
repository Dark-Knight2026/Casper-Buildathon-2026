# Project Specification: LeaseFi Backend

## 1. Overview
Backend service for processing high-load real estate operations, including tax calculations and property performance analytics.

## 2. API Contract

### Health Check
- **GET** `/health`
- **Response:** `200 OK` `{ "status": "ok", "redis": "connected", "database": "connected" }`

### Tax Center
- **POST** `/api/v1/tax/calculate-liability`
- **Input:** JSON with `fiscal_year`, `property_ids`
- **Output:** Calculated tax report (Income, Deductions, Estimated Tax)
- **Status:** *Mock Implementation (Phase 1)*

### Analytics
- **POST** `/api/v1/analytics/property-performance`
- **Input:** Date range, Property IDs
- **Output:** ROI, Occupancy Rate, Net Income
- **Status:** *Mock Implementation (Phase 1)*

### Authentication
- **GET** `/api/v1/auth/nonce`
  - **Query:** `wallet_address` (Hex string)
  - **Response:** `{ "nonce": "...", "message": "Sign this..." }`
  
- **POST** `/api/v1/auth/login`
  - **Input:** `{ "wallet_address": "...", "signature": "..." }`
  - **Response:** `{ "token": "jwt...", "user": { ... } }`

## 3. Security Requirements
- **Authentication:** JWT Bearer Token (Supabase).
- **Validation:** Signature verification using HS256.
- **Database:** No direct SQL injection (checked via SQLx).

## 4. Performance Goals
- Docker container size < 150MB.
- SQLx compile-time verification enabled.