# Testing Guide

## Overview

This document provides comprehensive guidelines for testing the Property Management System application.

## Table of Contents

1. [Testing Stack](#testing-stack)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Coverage](#test-coverage)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Testing Stack

### Unit & Integration Testing
- **Vitest** - Fast unit test framework
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom matchers for DOM elements

### E2E Testing
- **Playwright** - End-to-end testing framework
- Tests run in Chromium, Firefox, and WebKit browsers
- Mobile viewport testing included

### Coverage
- **V8** - Code coverage provider
- **Istanbul/c8** - Coverage reporting
- HTML, JSON, and LCOV reports generated

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test:unit src/services/__tests__/paymentService.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests in headed mode (see browser)
pnpm test:e2e:headed

# Run E2E tests in debug mode
pnpm test:e2e:debug

# Run specific test file
pnpm exec playwright test e2e/auth.spec.ts
```

### All Tests

```bash
# Run all tests (unit + E2E)
pnpm test

# Run tests in CI mode
CI=true pnpm test
```

---

## Writing Tests

### Unit Tests

#### Service Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import { paymentService } from '../paymentService';

vi.mock('@/lib/supabase/client');

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a payment', async () => {
    const mockPayment = { id: 'payment-123', amount: 1500 };
    
    (supabase.from as any).mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPayment, error: null }),
    });

    const result = await paymentService.createPayment({
      leaseId: 'lease-123',
      tenantId: 'tenant-123',
      amount: 1500,
      paymentMethod: 'credit_card',
    });

    expect(result).toBeDefined();
    expect(result.amount).toBe(1500);
  });
});
```

#### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import { PaymentForm } from '../PaymentForm';

describe('PaymentForm', () => {
  it('should render payment form', () => {
    render(
      <PaymentForm
        amount={1500}
        customerId="customer-123"
        leaseId="lease-123"
        onSuccess={() => {}}
      />
    );

    expect(screen.getByText(/payment amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(
      <PaymentForm
        amount={1500}
        customerId="customer-123"
        leaseId="lease-123"
        onSuccess={() => {}}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/required/i)).toBeInTheDocument();
  });
});
```

#### Hook Tests

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  it('should initialize with null user', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should handle sign in', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(result.current.user).toBeDefined();
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });
});
```

---

## Test Coverage

### Coverage Thresholds

The project enforces minimum coverage thresholds:

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 65%
- **Statements**: 70%

### Viewing Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage by Module

| Module | Target Coverage |
|--------|----------------|
| Services | 80%+ |
| Hooks | 80%+ |
| Components | 70%+ |
| Utilities | 80%+ |
| Pages | 60%+ |

---

## Mocking Strategy for ICO Blockchain Service Tests

### When to use `importOriginal` instead of a full `vi.mock()` factory

`vi.mock()` is the standard approach throughout the test suite. However, for modules that mix **pure utility functions** with **network-calling functions** (such as `@/services/ico/casperClient`), a full mock factory has a specific pitfall: re-implementing the pure functions inside the factory creates a hidden copy of the logic that diverges from the real code. If a bug is introduced in `hexToBytes` or `readU64LE`, the tests will not catch it because they run against the copied version.

For these modules, use `importOriginal` to spread the real module and override **only** the functions that make network or SDK calls:

```typescript
// Use this pattern when the module mixes pure utilities with RPC calls
vi.mock('@/services/ico/casperClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ico/casperClient')>();
  return {
    ...actual,                            // real hexToBytes, readU64LE, clValueToBigInt …
    queryOdraState: mockQueryOdraState,   // only stub what makes a network call
    clValueListU8ToHex: mockClValueListU8ToHex,
  };
});

// Avoid this — re-implementing real functions hides bugs
vi.mock('@/services/ico/casperClient', () => ({
  hexToBytes: (hex) => { /* copy of real implementation */ },
  readU64LE: (bytes, offset) => { /* copy of real implementation */ },
  queryOdraState: mockQueryOdraState,
}));
```

This pattern is applied in:
- `tests/services/icoContractService.test.ts`
- `tests/services/cep18Service.test.ts`
- `tests/services/proxyCallerService.test.ts`
- `tests/services/icoPurchaseService.test.ts`

All other test files — component tests, hook tests, and tests for chart-heavy views — use standard `vi.mock()` factories, which is correct for those cases (router context, recharts SVG renderers, sub-component isolation).

---

## Best Practices

### General

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Avoid testing internal implementation details

2. **Keep Tests Simple**
   - One assertion per test when possible
   - Clear test names that describe the behavior

3. **Use AAA Pattern**
   - **Arrange**: Set up test data and conditions
   - **Act**: Execute the code being tested
   - **Assert**: Verify the results

4. **Mock External Dependencies**
   - Mock API calls, database queries, and external services
   - Use consistent mock data across tests

### Unit Tests

1. **Test Edge Cases**
   - Empty inputs
   - Null/undefined values
   - Maximum/minimum values
   - Error conditions

2. **Test Async Code Properly**
   ```typescript
   it('should handle async operations', async () => {
     const result = await asyncFunction();
     expect(result).toBeDefined();
   });
   ```

3. **Clean Up After Tests**
   ```typescript
   beforeEach(() => {
     vi.clearAllMocks();
   });

   afterEach(() => {
     cleanup();
   });
   ```

### Component Tests

1. **Test User Interactions**
   ```typescript
   fireEvent.click(button);
   fireEvent.change(input, { target: { value: 'test' } });
   ```

2. **Test Accessibility**
   ```typescript
   expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
   ```

3. **Test Loading and Error States**
   ```typescript
   expect(screen.getByText(/loading/i)).toBeInTheDocument();
   expect(screen.getByText(/error/i)).toBeInTheDocument();
   ```

### E2E Tests

1. **Use Page Object Model**
   - Encapsulate page interactions in reusable functions
   - Keep tests DRY (Don't Repeat Yourself)

2. **Wait for Elements**
   ```typescript
   await expect(page.getByText(/welcome/i)).toBeVisible();
   ```

3. **Test Critical User Flows**
   - Focus on happy paths and common error scenarios
   - Don't test every edge case in E2E tests

4. **Use Test Data Isolation**
   - Create fresh test data for each test
   - Clean up after tests

---

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

**Problem**: Tests fail with timeout errors

**Solutions**:
- Increase timeout in test configuration
- Check for missing `await` keywords
- Verify mock data is returned correctly

```typescript
it('should complete within timeout', async () => {
  // Increase timeout for this specific test
  const result = await longRunningFunction();
  expect(result).toBeDefined();
}, 10000); // 10 second timeout
```

#### 2. Flaky Tests

**Problem**: Tests pass sometimes and fail other times

**Solutions**:
- Add proper waits for async operations
- Use `waitFor` for dynamic content
- Avoid testing implementation details

```typescript
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument();
});
```

#### 3. Mock Not Working

**Problem**: Mocked functions are not being called

**Solutions**:
- Verify mock is set up before test runs
- Check mock path matches actual import
- Clear mocks between tests

```typescript
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signIn: vi.fn(),
    },
  },
}));
```

#### 4. Coverage Not Accurate

**Problem**: Coverage report shows incorrect numbers

**Solutions**:
- Exclude test files from coverage
- Run coverage with clean cache
- Check coverage configuration

```bash
# Clear cache and run coverage
pnpm test:coverage --coverage.clean
```

#### 5. E2E Tests Failing Locally

**Problem**: E2E tests work in CI but fail locally

**Solutions**:
- Ensure dev server is running
- Check for port conflicts
- Verify browser installation

```bash
# Reinstall Playwright browsers
pnpm exec playwright install --with-deps
```

### Getting Help

1. **Check Test Output**
   - Read error messages carefully
   - Look for stack traces

2. **Use Debug Mode**
   ```bash
   # Debug unit tests
   pnpm test:watch --ui

   # Debug E2E tests
   pnpm test:e2e:debug
   ```

3. **Check Documentation**
   - [Vitest Docs](https://vitest.dev/)
   - [Testing Library Docs](https://testing-library.com/)
   - [Playwright Docs](https://playwright.dev/)

---

## Test Organization

```
src/
├── services/
│   ├── __tests__/
│   │   ├── paymentService.test.ts
│   │   ├── leaseManagementService.test.ts
│   │   └── maintenanceService.test.ts
│   └── ...
├── hooks/
│   ├── __tests__/
│   │   ├── useAuth.test.tsx
│   │   └── useMaintenanceRealtime.test.tsx
│   └── ...
├── components/
│   ├── payments/
│   │   ├── __tests__/
│   │   │   └── PaymentForm.test.tsx
│   │   └── PaymentForm.tsx
│   └── ...
└── test/
    ├── setup.ts
    └── utils.tsx

e2e/
├── auth.spec.ts
├── payment.spec.ts
├── maintenance.spec.ts
└── lease.spec.ts
```

---

## Continuous Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Before deployment

### CI Pipeline

1. **Unit Tests** - Run all unit tests with coverage
2. **E2E Tests** - Run end-to-end tests in multiple browsers
3. **Lint** - Check code style and types
4. **Build** - Verify application builds successfully

### Coverage Reports

- Coverage reports are uploaded to Codecov
- Pull requests show coverage diff
- Minimum coverage thresholds enforced

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2026-01-08  
**Maintained By**: Engineering Team