# Code Review: LeaseFi Frontend

Date: 2026-01-29 Reviewer: Ivan Kinder Perspective: Backend Developer Environment: TBD DeploymentMethod: Vercel (vercel.json present)
CompletionStatus: completed

---

## Table of Contents

1. [Review Methodology](#review-methodology)
2. [Overview](#overview)
3. [Deviations from Standards (ST)](#deviations-from-standards-st)
4. [Code Style Issues (CS)](#code-style-issues-cs)
5. [Security Concerns (SC)](#security-concerns-sc)
6. [Architecture Issues (AR)](#architecture-issues-ar)
7. [Testing (TS)](#testing-ts)
8. [Recommendations](#recommendations)
9. [Prioritized Action Plan](#prioritized-action-plan)

---

## Review Methodology

### How Findings Were Gathered

This review was conducted through:

1. **Manual code inspection** - review of configuration files, services, and key components
2. **Static analysis** - `grep`/`rg` searches for common antipatterns (`any`, `console.log`, `TODO`)
3. **Dependency audit** - `package.json` analysis
4. **Configuration review** - ESLint, TypeScript, Vite configs

### Verification Commands Used

```bash
# Check for any types
grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l

# Check for console.log statements
grep -rn "console\.\(log\|warn\|error\)" src/ --include="*.ts" --include="*.tsx"

# Check for TODO/FIXME comments
grep -rn "TODO\|FIXME\|XXX\|HACK" src/

# Count files
find src/ -name "*.tsx" -o -name "*.ts" | wc -l
```

### Confidence Levels

| Category           | Confidence | Notes                                              |
|--------------------|------------|----------------------------------------------------|
| ST (Standards)     | High       | Verified against file system and package.json      |
| CS (Code Style)    | High       | Direct code inspection with line numbers           |
| SC (Security)      | High       | Verified vulnerable patterns with line numbers     |
| AR (Architecture)  | High       | File sizes verified via wc -l                      |
| TS (Testing)       | High       | Verified via npx vitest run and file counts        |

### Verification Disclaimer

> **Note:** This review is conducted from a backend developer's perspective. Some frontend-specific best practices may not be covered. Readers should independently verify findings before implementing fixes.

---

## Overview

| Parameter        | Value                                     |
|------------------|-------------------------------------------|
| Language         | TypeScript 5.6.3                          |
| Framework        | React 18.3.1                              |
| Build Tool       | Vite 6.4.1                                |
| UI Library       | shadcn/ui (Radix UI + Tailwind CSS)       |
| State Management | React Context (17 contexts) + React Query |
| Backend          | Supabase (PostgreSQL + Auth + Realtime)   |
| Files Count      | ~1094 TypeScript/TSX files                |
| Source Size      | ~12 MB                                    |
| Package Name     | "shadcnui" (incorrect)                    |

### Tech Stack

- **React 18.3.1** + **React Router 7.1.3** — SPA routing
- **TanStack React Query 5.62.11** — Server state management
- **React Hook Form 7.54.2** + **Zod 3.24.1** — Form handling and validation
- **Tailwind CSS 3.4.17** — Styling
- **Stripe** — Payment processing
- **Supabase** — Backend as a Service (Auth, DB, Realtime)

---

## Deviations from Standards (ST)

### Deviation ST-001: Incorrect Package Name

**Observation:** The `package.json` has a generic placeholder name instead of the actual project name.

**Evidence:** `package.json:2`

```json
{
	"name": "shadcnui",
	"private": true,
	"version": "0.0.0",
```

**Problem:**

- Name doesn't reflect the project (LeaseFi/KeyChain Real Estate)
- Version is `0.0.0` instead of a meaningful version

**Action Item:** Update to proper project name and version:

```json
{
	"name": "leasefi-frontend",
	"private": true,
	"version": "1.0.0",
```

---

### Deviation ST-002: Missing CI/CD Configuration

**Observation:** No automated CI/CD pipeline configuration exists.

**Evidence:** No `.github/workflows/*.yml` files or equivalent.

**Action Item:** Add GitHub Actions workflow with:

- `pnpm install`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`

Example workflow:

```yaml
name: CI
on: [ push, pull_request ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build
```

---

### Deviation ST-003: Missing `codestyle.md`

**Observation:** Repository lacks a `codestyle.md` file documenting project-specific coding standards.

**Evidence:** No `codestyle.md` in repository root.

**Action Item:** Create `codestyle.md` in repository root following company template.

---

### Deviation ST-004: Hardcoded `default-landlord-id` (CRITICAL - Data Integrity Bug)

**Observation:** Multiple components use hardcoded `default-landlord-id` placeholder that will cause data corruption in production.

**Evidence:**

```typescript
// src/components/property/ScheduleViewingModal.tsx:38
landlordId = 'default-landlord-id', // TODO: Get from property data

// src/components/property/ContactLandlordModal.tsx:32
landlordId = 'default-landlord-id', // TODO: Get from property data

// src/pages/tenant/ApplicationForm.tsx:24
const landlordId = 'default-landlord-id'; // TODO: Get from property data
```

**Problem:**

- This is NOT a "code style" issue - it's a **data corruption bug**
- Production code creates records with invalid foreign key `'default-landlord-id'`
- Database constraints may fail, or worse, orphaned records created
- All tenant applications/viewings/contacts will have incorrect landlordId

**Action Item:** Implement proper landlordId resolution or fail loudly:

```typescript
// Option 1: Pass from parent component
<ContactLandlordModal
  landlordId={property.landlordId}
  propertyId={property.id}
/>

// Option 2: Query property data
const { data: property } = useQuery({
  queryKey: ['property', propertyId],
  queryFn: () => propertyService.getById(propertyId)
});

if (!property?.landlordId) {
  throw new Error('Property must have a valid landlordId');
}

// Option 3: Runtime validation
if (landlordId === 'default-landlord-id') {
  throw new Error('Invalid landlordId: placeholder value detected');
}
```

**Verification:**

```bash
# After fix, verify all instances removed:
grep -r "default-landlord-id" src/
# Should return 0 results
```

---

## Code Style Issues (CS)

### Deviation CS-001: Use of `any` Type

**Observation:** The codebase contains **32** usages of the `any` type, reducing TypeScript's type safety benefits.

**Verification:**

```bash
grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l
# Result: 32
```

**Evidence:** Multiple files in `src/services/`

```typescript
// src/services/brokerService.ts:806
private mapAgentRowToAgent(row: any): BrokerAgent {

// src/services/agentService.ts:1019
private mapClientRowToClient(row: any): AgentClient {

// src/services/buyerService.ts:666
private mapFavoriteRow(row: any): BuyerFavorite {
```

**Complete inventory (sample):**

| File               | Count | Example                               |
|--------------------|-------|---------------------------------------|
| `brokerService.ts` | 6     | `mapAgentRowToAgent(row: any)`        |
| `agentService.ts`  | 10    | `subscribeToClients(callback: any)`   |
| `sellerService.ts` | 8     | `mapListingRow(row: any)`             |
| `buyerService.ts`  | 7     | `subscribeToFavorites(callback: any)` |

**Action Item:** Replace `any` with proper types. Since Supabase is used, leverage generated types:

```typescript
// Instead of:
private mapAgentRowToAgent(row: any): BrokerAgent {

// Use:
import type { Database } from '@/types/supabase';
type AgentRow = Database['public']['Tables']['agents']['Row'];

private mapAgentRowToAgent(row: AgentRow): BrokerAgent {
```

---

### Deviation CS-002: Console Statements in Production Code

**Observation:** Multiple `console.log`, `console.warn`, and `console.error` calls throughout services.

**Verification:**

```bash
grep -rn "console\.\(log\|warn\|error\)" src/ --include="*.ts" --include="*.tsx" | wc -l
# Result: 494
```

**Evidence:** Found in multiple service files:

```typescript
// src/services/bulkOperationsService.ts:50
console.log(`Updating status to ${status} for ${ids.length} items`);

// src/services/realtimeService.ts:63
console.log(`Subscribed to ${channelName}`);

// src/services/automationService.ts:103
console.log(`Renewal offer ${offerId} sent to tenant`);
```

**Mitigating Factor:** Vite config has `drop_console: true` for production builds (`vite.config.ts:90`).

**Action Item:** Replace console statements with the existing logger service:

```typescript
// Instead of:
console.log(`Subscribed to ${channelName}`);

// Use:
import {logger} from '@/utils/logger';

logger.info(`Subscribed to ${channelName}`);
```

---

### Deviation CS-003: Unresolved TODO Comments

**Observation:** Multiple TODO comments indicate incomplete functionality.

**Verification:**

```bash
grep -rn "TODO\|FIXME\|XXX\|HACK" src/ --include="*.ts" --include="*.tsx" | wc -l
# Result: 43
```

**Evidence:**

| Location                          | TODO Description                              |
|-----------------------------------|-----------------------------------------------|
| `signatureService.ts:176`         | Implement document hash verification          |
| `applicationService.ts:114`       | Send notification emails                      |
| `smsService.ts:3`                 | SMS functionality will be handled by backend  |
| `analyticsService.ts:354,364,386` | Calculate actual values (hardcoded currently) |
| `documentVersionService.ts:188`   | Delete the file from storage                  |
| `documentStorageService.ts:467`   | Delete files from storage                     |
| `loggingService.ts:105`           | Integrate with monitoring service (Sentry)    |
| `CustomDashboard.tsx:129`         | Implement save dashboard config               |
| `FinancialDashboard.tsx:102`      | Implement export functionality                |
| `ApplicationList.tsx:89`          | Implement CSV export                          |
| `LeaseCreationWizard.tsx:74`      | Implement draft saving to database            |
| `ReviewPreviewStep.tsx:27`        | Implement PDF generation                      |
| `ScheduleViewingModal.tsx:38`     | Get landlordId from property data             |
| `ContactLandlordModal.tsx:32`     | Get landlordId from property data             |
| `ApplicationDetail.tsx:60`        | Fetch actual property rent from property data |
| `ApplicationForm.tsx:24`          | Get landlordId from property data             |
| `alerts.ts:418`                   | Integrate with monitoring service             |
| `errorLogger.ts:89`               | Integrate with error tracking service         |
| `utils/logger.ts:58`              | Integrate with error tracking service         |
| `documentSharingService.ts:30`    | Send email notification if requested          |

**Action Item:** Create issues/tickets for each TODO and either implement or remove them. Critical items:

1. Document hash verification (security)
2. Monitoring integration (observability)
3. Proper landlordId resolution (data integrity)

---

### Deviation CS-004: Incorrect Environment Variable Pattern

**Observation:** Two files use Next.js environment variable patterns in a Vite project.

**Evidence:**

`src/services/matchingService.ts:107-108`

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

`src/hooks/useTaxData.ts:7-8`

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
```

**Problem:**

- This is a Vite project that uses `import.meta.env.VITE_*` convention
- `process.env.NEXT_PUBLIC_*` variables are Next.js-specific and will be `undefined` at runtime
- This code will fail silently or cause runtime errors

**Action Item:** Update both files to Vite environment variable convention:

```typescript
// Instead of:
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Affected files:**
- `src/services/matchingService.ts:107-108`
- `src/hooks/useTaxData.ts:7-8`

---

## Security Concerns (SC)

### Deviation SC-001: Unused Twilio Dependency

**Observation:** Twilio package is included in dependencies but the SMS functionality comment suggests it's not used.

**Verification:**

```bash
# Check if twilio is in dependencies
grep "twilio" package.json

# Check if twilio is imported anywhere in src
grep -r "from ['\"]twilio" src/ --include="*.ts" --include="*.tsx" | wc -l
# Result: 0
```

**Evidence:**

`package.json:89`:

```json
"twilio": "^5.11.1",
```

`src/services/smsService.ts:3`:

```typescript
* TODO: SMS functionality will be handled by backend API
```

**Problem:**

- Twilio is a **server-side** package with credentials
- Including it in frontend bundle is a security risk (even if not used)
- Increases bundle size unnecessarily

**Action Item:** Remove Twilio from frontend dependencies immediately:

```bash
pnpm remove twilio
```

If SMS is needed, it should be handled by the backend API.

---

### Deviation SC-002: Missing Content Security Policy

**Observation:** No CSP headers configured in `vercel.json` or index.html.

**Evidence:** `vercel.json` doesn't include security headers.

**Action Item:** Add security headers to `vercel.json`:

```json
{
	"headers": [
		{
			"source": "/(.*)",
			"headers": [
				{
					"key": "X-Content-Type-Options",
					"value": "nosniff"
				},
				{
					"key": "X-Frame-Options",
					"value": "DENY"
				},
				{
					"key": "Referrer-Policy",
					"value": "strict-origin-when-cross-origin"
				}
			]
		}
	]
}
```

---

### Deviation SC-003: Lodash Prototype Pollution Vulnerability

**Observation:** `npm audit` reveals a moderate severity prototype pollution vulnerability in lodash.

**Verification:**

```bash
npm audit
# Shows: lodash 4.0.0 - 4.17.21 | Moderate | Prototype Pollution | GHSA-xxjr-mmjv-4gpg
```

**Evidence:** Lodash versions 4.0.0 through 4.17.21 are affected by prototype pollution vulnerability (GHSA-xxjr-mmjv-4gpg).

**Problem:**

- Prototype pollution can lead to property injection attacks
- Attackers could potentially modify object prototypes
- May affect application behavior in unexpected ways

**Action Item:** Run security audit and fix vulnerabilities:

```bash
npm audit fix
# or update lodash to a patched version if available
pnpm update lodash
```

If no fix is available, consider:
1. Monitoring for lodash updates
2. Evaluating if lodash can be replaced with native JavaScript methods
3. Using lodash-es with tree-shaking to minimize attack surface

---

### Deviation SC-004: Resend API Key Exposed in Frontend Bundle (CRITICAL)

**Observation:** The email service uses a Resend API key that is exposed in the frontend JavaScript bundle.

**Evidence:** `src/services/emailService.ts:15`

```typescript
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);
```

**Problem:**

- `VITE_*` environment variables are embedded in the built JavaScript bundle
- Anyone can extract this API key using browser DevTools
- Attacker can send emails on your behalf, potentially:
  - Sending spam/phishing emails
  - Exhausting your Resend quota
  - Damaging domain reputation
- This is a **billing and reputation risk**

**Action Item:** Move email functionality to backend immediately:

```typescript
// Frontend: Call backend API
async function sendEmail(data: EmailData) {
  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Backend: Use Resend with server-side env var
// The API key should be in backend-only environment
```

**Verification:**

```bash
# After fix, verify no API keys in frontend:
grep -r "VITE_RESEND" src/
# Should return 0 results
```

---

### Deviation SC-005: XSS via dangerouslySetInnerHTML Without Sanitization (CRITICAL)

**Observation:** HTML content is rendered directly without sanitization, creating XSS vulnerability.

**Evidence:**

`src/components/common/HelpModal.tsx:349`

```tsx
<div dangerouslySetInnerHTML={{ __html: helpContent.description }} />
```

`src/components/ui/chart.tsx:70` (shadcn/ui library — lower risk)

```tsx
<style dangerouslySetInnerHTML={{ __html: Object.entries(THEMES)... }} />
```

**Problem:**

- `dangerouslySetInnerHTML` renders raw HTML without escaping
- If `helpContent.description` comes from database or user input, attackers can inject malicious scripts
- XSS attacks can steal session tokens, perform actions on behalf of users, redirect to phishing sites
- **DOMPurify is already installed** but not used here
- The `chart.tsx` instance is from shadcn/ui and uses internally generated CSS, so the risk is lower

**Action Item:** Sanitize HTML content using DOMPurify:

```typescript
import DOMPurify from 'dompurify';

// Instead of:
<div dangerouslySetInnerHTML={{ __html: helpContent.description }} />

// Use:
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(helpContent.description)
}} />
```

**Verification:**

```bash
# Find all dangerouslySetInnerHTML usages:
grep -rn "dangerouslySetInnerHTML" src/

# Verify each one uses DOMPurify.sanitize()
```

---

## Architecture Issues (AR)

### Deviation AR-001: Massive Component Files Violate Single Responsibility

**Observation:** 7 files exceed 1,000 lines of code, violating the Single Responsibility Principle and making maintenance difficult.

**Verification:**

```bash
find src/ \( -name "*.tsx" -o -name "*.ts" \) -exec wc -l {} + | sort -rn | head -10
```

**Evidence:**

| File | Lines | Concern |
|------|-------|---------|
| `src/pages/LandlordDashboard.tsx` | 1,693 | Dashboard combines analytics, property management, tenant overview |
| `src/services/agentService.ts` | 1,236 | Service with multiple responsibilities |
| `src/services/documentStorageService.ts` | 1,132 | Document handling with embedded business logic |
| `src/types/lease.ts` | 1,097 | Type definitions - may be acceptable for shared types |
| `src/components/lease/LeaseAgreementGenerator.tsx` | 1,066 | Complex lease generation logic |
| `src/components/lease/LeaseTemplateMarketplace.tsx` | 1,053 | Marketplace with inline data processing |
| `src/components/property/AddPropertyWizard.tsx` | 1,038 | Multi-step wizard in single component |

**Problem:**

- Files over 500 lines become difficult to navigate and understand
- Multiple concerns in single file = multiple reasons to change
- Testing becomes complex when logic is tightly coupled
- Code reuse is hindered
- Developer onboarding is slower

**Action Item:** Refactor large components using composition pattern:

```typescript
// Instead of monolithic LandlordDashboard.tsx (1,693 lines):
// src/components/landlord/LandlordDashboard.tsx (~100 lines)
export function LandlordDashboard() {
  return (
    <DashboardLayout>
      <PropertyOverviewSection />
      <TenantSummarySection />
      <FinancialMetricsSection />
      <RecentActivitySection />
      <QuickActionsPanel />
    </DashboardLayout>
  );
}

// Each section as separate component:
// src/components/landlord/sections/PropertyOverviewSection.tsx
// src/components/landlord/sections/TenantSummarySection.tsx
// src/components/landlord/hooks/useDashboardData.ts
// src/components/landlord/hooks/usePropertyMetrics.ts
```

**Target:** All component files under 500 lines.

---

## Testing (TS)

### Deviation TS-001: Critically Low Test Coverage

**Observation:** The project has minimal test coverage with only 4 test files for 1,094 source files.

**Verification:**

```bash
# Count test files
find . -name "*.test.ts" -o -name "*.test.tsx" | grep -v node_modules | wc -l
# Result: 4

# Count source files
find src/ \( -name "*.ts" -o -name "*.tsx" \) | wc -l
# Result: 1094

# Run tests
npx vitest run
# Test Files: 4 passed (4)
# Tests: 47 passed (47)
```

**Evidence:**

| Metric | Value |
|--------|-------|
| Test files | 4 |
| Source files | 1,094 |
| File coverage | 0.37% |
| Total tests | 47 |
| Passing tests | 47 (100%) |

**Existing test files:**

| File | Description |
|------|-------------|
| `tests/hooks/useFinancialDashboard.test.ts` | Financial dashboard hook tests |
| `tests/hooks/useMaintenanceRealtime.test.tsx` | Maintenance realtime hook tests |
| `tests/lib/utils/taxCalculations.test.ts` | Tax calculation utility tests |
| `tests/services/sellerService.test.ts` | Seller service tests |

**Test infrastructure:**

- **Vitest v4.0.17** is installed and configured
- Test infrastructure is functional (all 47 tests pass)
- The problem is **test authoring**, not tooling

**Untested critical areas:**

| Area | Risk Level | Notes |
|------|------------|-------|
| Authentication (authService.ts) | Critical | No tests for login, logout, session handling |
| Payment processing (Stripe integration) | Critical | No tests for payment flows |
| Lease management services | High | Core business logic untested |
| Form validation (Zod schemas) | Medium | User input validation untested |
| API error handling | Medium | Error states not verified |

**Action Item:** Prioritize testing for critical paths:

1. Add authentication flow tests
2. Add payment processing tests (mock Stripe)
3. Add lease creation/management tests
4. Add form validation tests for user-facing forms

**Target:** Minimum 60% coverage for critical services before production deployment.

---

## Recommendations

### Critical

| ID     | Recommendation                                | Rationale                                |
|--------|-----------------------------------------------|------------------------------------------|
| ST-004 | Fix hardcoded `default-landlord-id` values    | Data corruption in production            |
| SC-004 | Move Resend API to backend                    | API key exposed in frontend bundle       |
| SC-005 | Sanitize dangerouslySetInnerHTML with DOMPurify | XSS vulnerability                      |
| SC-001 | Remove Twilio from dependencies               | Server-side package in frontend bundle   |
| CS-004 | Fix environment variable pattern              | Runtime failure in matchingService.ts and useTaxData.ts |

### High Priority

| ID     | Recommendation                        | Rationale                    |
|--------|---------------------------------------|------------------------------|
| TS-001 | Add tests for critical paths          | Zero coverage on auth/payment |
| AR-001 | Refactor large files (>1000 LOC)      | Maintainability              |
| ST-002 | Add CI/CD configuration               | Quality automation           |
| CS-001 | Replace `any` types with proper types | Type safety                  |
| CS-003 | Resolve or track TODO comments        | Technical debt visibility    |
| SC-002 | Add security headers                  | Security hardening           |
| SC-003 | Fix lodash prototype pollution        | Security vulnerability       |

### Medium Priority

| ID     | Recommendation               | Rationale              |
|--------|------------------------------|------------------------|
| ST-001 | Fix package name and version | Project identification |

### Low Priority

| ID     | Recommendation                | Rationale     |
|--------|-------------------------------|---------------|
| ST-003 | Add codestyle.md              | Documentation |
| CS-002 | Replace console.* with logger | Consistency   |

---

## Prioritized Action Plan

### Phase 1: Critical Security & Data Integrity Fixes

* Fix hardcoded `default-landlord-id` values (ST-004) — **data corruption risk**
* Move Resend email sending to backend (SC-004) — **API key exposure**
* Sanitize all dangerouslySetInnerHTML with DOMPurify (SC-005) — **XSS vulnerability**
* Remove Twilio dependency (SC-001)
* Fix environment variable pattern in matchingService.ts and useTaxData.ts (CS-004)
* Fix lodash prototype pollution vulnerability (SC-003)
* Add security headers to vercel.json (SC-002)

### Phase 2: Testing & Architecture

* Add tests for authentication flows (TS-001)
* Add tests for payment processing (TS-001)
* Add tests for lease management services (TS-001)
* Refactor 7 large files (>1000 LOC) into smaller modules (AR-001)
* Fix package.json name and version (ST-001)
* Add GitHub Actions CI/CD workflow (ST-002)
* Add codestyle.md (ST-003)

### Phase 3: Code Quality

* Replace `any` types with proper Supabase types (CS-001)
* Replace console.* calls with logger service (CS-002)
* Create issues for all TODO comments (CS-003)
