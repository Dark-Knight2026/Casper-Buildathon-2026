# Tests Directory

This directory contains all test files for the LeaseFi application, organized by the type of code being tested.

## Responsibility Table

| File/Directory | Responsibility |
|----------------|----------------|
| `fixtures/` | Test data files and mock assets for integration and E2E tests (PDFs, images, text files) |
| `hooks/` | Unit tests for custom React hooks |
| `hooks/useFinancialDashboard.test.ts` | Tests for commission and financial summary calculations |
| `hooks/useMaintenanceRealtime.test.tsx` | Tests for real-time maintenance data synchronization |
| `lib/` | Unit tests for library utilities and helper functions |
| `lib/utils/taxCalculations.test.ts` | Tests for tax calculation utilities (depreciation, net income, tax liability) |
| `services/` | Unit tests for service layer (API interactions, data fetching) |
| `services/sellerService.test.ts` | Tests for seller-related service methods (listings, offers, showings, documents, market analytics) |

## Test Structure

- **Unit Tests**: Individual functions and hooks tested in isolation
- **Integration Tests**: Multiple components working together (using fixtures)
- **Mocking**: External dependencies (Supabase, APIs) are mocked using Vitest

## Running Tests

```bash
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Run tests with Vitest UI
```
