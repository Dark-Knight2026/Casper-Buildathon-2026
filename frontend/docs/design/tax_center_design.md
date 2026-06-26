# Tax Center System Design

## 1. Overview

The Tax Center is a multi-role feature designed to assist Buyers, Sellers, Landlords, and Tenants in managing their real estate-related tax obligations. It provides tools for tracking income, calculating deductions, estimating liabilities, and managing tax documents.

## 2. System Architecture

The system follows a layered architecture pattern, currently implemented as a client-side service with mock data, designed to scale into a full client-server model.

### 2.1 Frontend Layer
- **UI Components**: Located in `src/components/dashboard/tax/`. Built using Shadcn-ui for consistency.
  - `TaxSummaryCard`: High-level financial overview.
  - `DeductionTracker`: CRUD interface for tax deductions.
  - `TaxDocumentUploader`: File management interface.
  - `TaxCalendar`: Temporal visualization of tax events.
  - `TaxSavingsCalculator`: Interactive estimation tool.
- **Integration**: Embedded into role-specific dashboards (`BuyerOverview`, `SellerOverview`, etc.) via the `App.tsx` routing and layout structure.

### 2.2 Service Layer
- **Core Service**: `src/services/taxService.ts`
- **Responsibilities**:
  - Abstraction of business logic (Calculations for depreciation, capital gains, etc.).
  - Data fetching and state management (currently mocking API responses).
  - Type definitions for data consistency.

### 2.3 Backend Layer (Proposed)
To support the production deployment, the backend should expose RESTful or GraphQL endpoints corresponding to the service methods:
- `GET /api/v1/tax/{year}/summary`
- `POST /api/v1/tax/documents/upload`
- `GET /api/v1/tax/deductions`

## 3. Data Structures & Interfaces

The system relies on strict TypeScript interfaces to ensure data integrity.

### Core Entities
- **TaxSummary**: Aggregates income, deductions, and estimated taxes for a specific `taxYear`.
- **TaxDocument**: Metadata for uploaded files (W2, 1099, Receipts).
- **TaxDeduction**: Individual deduction records with status tracking ('pending', 'approved').
- **Role-Specific Data**:
  - `RentalIncomeData` (Landlord): Income/Expense breakdown per property.
  - `CapitalGainsData` (Seller): Purchase/Sale metrics.
  - `MortgageInterestData` (Buyer): Loan amortization details.

## 4. Security Design

Given the sensitivity of tax data (PII and Financial Information), security is paramount.

### 4.1 Data Protection
- **Encryption at Rest**: All sensitive fields (SSN, Income amounts) in the database must be encrypted (e.g., AES-256).
- **Encryption in Transit**: TLS 1.3 for all client-server communications.
- **Document Storage**: Uploaded tax documents should be stored in a secure object storage (e.g., AWS S3) with:
  - Private access policies (No public URLs).
  - Server-side encryption (SSE-S3 or SSE-KMS).
  - Pre-signed URLs with short expiration times for viewing.

### 4.2 Access Control
- **RBAC (Role-Based Access Control)**:
  - Users can only access their own tax data.
  - `Landlord` role cannot view `Tenant` tax data even if they are linked by a lease, unless explicitly shared.
  - `Admin` access should be strictly audited.

### 4.3 Compliance
- **Audit Logs**: All actions (View Summary, Download Document, Delete Deduction) must be logged for compliance.
- **Data Retention**: Automated policies to retain or purge data based on tax law requirements (typically 3-7 years).

## 5. Data Flow

### 5.1 Document Upload Flow
1. **User Action**: Drags file to `TaxDocumentUploader`.
2. **Frontend**: Validates file type (PDF/IMG) and size.
3. **Service**: Calls `uploadTaxDocument`.
4. **Backend**: 
   - Authenticates user.
   - Generates secure upload URL.
   - Streams file to Object Storage.
   - Scans for malware.
   - Saves metadata to Database.
5. **UI Update**: Adds new document to the list with "Uploaded" status.

### 5.2 Tax Calculation Flow
1. **User Action**: Enters data into `TaxSavingsCalculator` or adds a `TaxDeduction`.
2. **Service**: Aggregates local state or fetches updated totals.
3. **Logic**: Applies tax rules (e.g., 27.5 years depreciation for residential rental).
4. **UI Update**: Re-renders `TaxSummaryCard` with new estimates.

## 6. Scalability Strategy

### 6.1 Handling Multiple Tax Years
- **Database Schema**: All tax-related tables must include a `tax_year` column and be indexed by `(user_id, tax_year)`.
- **UI/UX**: The `TaxService` methods accept `taxYear` arguments, allowing the UI to easily switch contexts (e.g., viewing 2023 returns while planning 2024).

### 6.2 increasing Document Loads
- **Pagination**: The `getTaxDocuments` method should support pagination to handle users with hundreds of receipts.
- **CDN**: Serve static assets and cached non-sensitive data via CDN.
- **Asynchronous Processing**: Heavy calculations (e.g., portfolio-wide depreciation for 100+ properties) should be offloaded to background workers.

## 7. Future Considerations
- **OCR Integration**: Auto-extract data from uploaded receipts to populate `TaxDeduction` entries.
- **Third-Party Integration**: API connectors for TurboTax, H&R Block, or QuickBooks.
- **Regulatory Updates**: A "Rules Engine" to update tax rates and brackets without code changes.