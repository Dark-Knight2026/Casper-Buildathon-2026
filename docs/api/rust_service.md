# Rust Microservice API Documentation

This document outlines the API endpoints provided by the Rust microservice for the KeyChain Real Estate CRM Platform. This service handles high-performance tasks such as tax calculations and complex analytics.

## Getting Started

### Prerequisites
- Rust (latest stable version)
- PostgreSQL database (Supabase)

### Running Locally

1.  Navigate to the service directory:
    ```bash
    cd rust-service
    ```

2.  Create a `.env` file based on `.env.example`:
    ```env
    DATABASE_URL=postgres://postgres:password@db.supabase.co:5432/postgres
    SUPABASE_JWT_SECRET=your-supabase-jwt-secret
    RUST_LOG=info
    PORT=8080
    ```

3.  Run the service:
    ```bash
    cargo run
    ```
    The server will start on `http://0.0.0.0:8080`.

## API Endpoints

All endpoints are prefixed with `/api/v1`.
Authentication is required via the `Authorization: Bearer <token>` header (Supabase JWT).

### 1. Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Checks if the service is running.
- **Response**: `200 OK`

### 2. Tax Liability Calculation
- **URL**: `/api/v1/tax/calculate-liability`
- **Method**: `POST`
- **Description**: Calculates estimated tax liability based on property income and expenses.
- **Request Body**:
    ```json
    {
      "fiscal_year": 2023,
      "property_ids": ["uuid-1", "uuid-2"],
      "include_depreciation": true
    }
    ```
- **Response**:
    ```json
    {
      "total_taxable_income": "105000.00",
      "total_deductions": "45000.00",
      "estimated_tax": "25200.00",
      "breakdown": [
        {
          "category": "Property Tax",
          "amount": "15000.00"
        },
        ...
      ]
    }
    ```

### 3. Property Performance Analytics
- **URL**: `/api/v1/analytics/property-performance`
- **Method**: `POST`
- **Description**: Calculates key performance indicators (KPIs) like ROI and occupancy rates.
- **Request Body**:
    ```json
    {
      "start_date": "2023-01-01T00:00:00Z",
      "end_date": "2023-12-31T23:59:59Z",
      "property_ids": ["uuid-1", "uuid-2"]
    }
    ```
- **Response**:
    ```json
    {
      "total_revenue": "240000.00",
      "total_expenses": "80000.00",
      "net_operating_income": "160000.00",
      "roi_percentage": "16.0",
      "occupancy_rate": "95.5"
    }
    ```

## Frontend Integration

The frontend connects to this service using the `rustApi` client defined in `src/lib/rust-api.ts`.

### Configuration
Ensure the `VITE_RUST_SERVICE_URL` environment variable is set in your frontend `.env` file (defaults to `http://localhost:8080/api/v1` if not set).

### Usage Example
```typescript
import { rustApi } from '@/lib/rust-api';

// Calculate Tax
const taxReport = await rustApi.tax.calculateLiability({
  fiscal_year: 2023,
  property_ids: ['p1', 'p2'],
  include_depreciation: true
});

// Get Analytics
const analytics = await rustApi.analytics.getPropertyPerformance({
  start_date: '2023-01-01...',
  end_date: '2023-12-31...',
  property_ids: ['p1', 'p2']
});
```

### Integrated Components
The following components have been updated to use the Rust API:
1.  **`src/components/landlord/TaxDashboard.tsx`**: Fetches tax liability data.
2.  **`src/components/analytics/AdvancedAnalyticsDashboard.tsx`**: Fetches property performance metrics.