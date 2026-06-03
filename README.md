# LeaseFi Real Estate CRM - Frontend

Modern real estate CRM platform built with React, TypeScript, and shadcn/ui.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router
- **Forms**: React Hook Form + Zod validation
- **API Client**: custom HTTP client (`src/lib/api-client.ts`) against the project's Rust backend. Supabase is **legacy** — never fully wired in production and being phased out as endpoints land on the Rust side.
- **Auth / Wallet**: CSPR.click SDK (transparent wallet provisioning via social login — Google / Apple)
- **Testing**: Vitest (unit tests) + Playwright (E2E tests)

## Project Structure

```
2025_anthony_leasefi_frontend/
├── src/
│   ├── components/      # Reusable UI components (79+ components)
│   ├── pages/          # Page components (82+ pages)
│   ├── contexts/       # React Context providers (21 contexts)
│   ├── hooks/          # Custom React hooks (53 hooks)
│   ├── services/       # API service layers (70 services)
│   ├── utils/          # Utility functions (22 utilities)
│   ├── types/          # TypeScript type definitions (51+ types)
│   ├── layouts/        # Layout components
│   ├── providers/      # Provider components
│   ├── styles/         # Global styles
│   └── main.tsx        # Application entry point
├── public/             # Static assets
├── docs/               # Documentation
├── e2e/                # End-to-end tests
├── tests/              # Integration tests
└── index.html          # HTML entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# or with npm
npm install
```

### Environment Setup

1. Copy the environment example file:
```bash
cp .env.example .env
```

2. Configure your environment variables in `.env` (the canonical list is in `.env.example`):
```env
# Rust backend (real source of truth for auth, profile, future endpoints)
VITE_BACKEND_URL=https://leasefi.testingservernginx.win

# CSPR.click — auth + wallet
VITE_APP_ID=…
VITE_CSPR_CLOUD_API_KEY=…
VITE_CASPER_NETWORK=casper-test
VITE_CASPER_RPC_URL=https://node.testnet.casper.network/rpc

# Optional
VITE_GOOGLE_MAPS_API_KEY=…

# Legacy — Supabase was never wired in production. The vars exist only so
# service files that still import the Supabase client compile during the
# phase-out. Safe to point at any project URL; no real reads happen.
VITE_SUPABASE_URL=…
VITE_SUPABASE_ANON_KEY=…
```

See [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) for detailed setup instructions.

## Development

### Run Development Server

```bash
pnpm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
pnpm run build
```

### Preview Production Build

```bash
pnpm run preview
```

### Type Checking

```bash
pnpm run type-check
```

### Linting

```bash
pnpm run lint
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm run test:unit

# Run tests in watch mode
pnpm run test:watch

# Run tests with UI
pnpm run test:ui

# Generate coverage report
pnpm run test:coverage
```

### Integration Tests

```bash
pnpm run test:integration
```

## MVP Scope

The frontend is mid-rebuild against the project's own Rust backend. Older roles
(Agent / Broker / various service-professional dashboards) live in the codebase
as legacy scaffolding but are **not in the MVP scope** (see
[`docs/LEASEFI_MVP_SPEC_2026-07-15.md`](docs/LEASEFI_MVP_SPEC_2026-07-15.md) §3).

### MVP roles
- **Tenant** — lease, payments, recommendations, profile.
- **Landlord** — properties, leases, dashboard, profile.
- **Property Manager** — aggregated landlord-style view (in progress).

### Out of MVP
- Agent / Broker / service-professional dashboards (legacy scaffolding only).
- Marketplace / equities / public buy-in (Phase 2 — blocked on legal,
  see `CLIENT_FEEDBACK_BACKLOG.md` Task 16).
- Casper-name purchase (moved to Phase 2 on 2026-05-20).

## Current Implementation Status (2026-05-27)

### Ready in production
- **Auth & registration** — CSPR.click social login (Google / Apple),
  fully wired to the Rust backend `/api/v1/auth/*`.
- **User profile** — read/update + avatar upload via `/api/v1/users/me*`.
  `RoleSwitchDialog` wired with reauth gate.
- **Tenant Dashboard** — overview screen (UI complete; lease/payment data
  still runs on `MOCK_*` fixtures until backend endpoints land).
- **Landlord layout + nav** — shared header for every landlord route.
- **Landlord Dashboard** — overview page with KPI tiles + recent-activity
  feed, driven by `src/data/landlordMockData.ts`.
- **Properties (landlord)** — list page with filters, add-property
  multi-step form, edit page. Currently against mock data; service-layer
  Supabase imports remain only to satisfy TypeScript and are inert.
- **Landlord Profile** — identity (name/email/phone/bio/avatar) is real via
  `/api/v1/users/me*`; the portfolio overview card still runs on
  `MOCK_LANDLORD_DASHBOARD_STATS` until the backend stats endpoint lands.

### Not yet wired to the real backend
Properties CRUD/search, leases (create/sign/finalize/terminate), payments
& Stripe, dashboard data (rent received, paid/overdue/partial), KYC,
disputes, audit trail, termination. Every surface above either runs on
intentional mock fixtures (demo mode) or shows a `<ComingSoon/>` panel
behind a feature flag. See
[`docs/FRONTEND_MVP_TASKS.md`](docs/FRONTEND_MVP_TASKS.md) for the
per-section status (🟢 REAL / 🟠 MOCK / 🟡 SUPABASE→REWIRE / 🔴 MISSING /
⛔ BE-BLOCKED).

## Backend Integration

The application is being migrated to a **custom Rust backend**. Supabase
was the original integration target but **never reached production wiring**;
it is treated as legacy and removed file-by-file as Rust endpoints arrive.

### Real backend (Rust)
- Base URL: `leasefi.testingservernginx.win`
  (hardcoded in `vercel.json`'s `/api/v1/*` rewrite — the "testing" prefix
  is a legacy naming artifact; this is the production target across all
  Vercel environments).
- HTTP client: `src/lib/api-client.ts` (typed wrapper with retry logic).
- Auth client: `src/services/ico/backendAuthService.ts`
- Profile client: `src/services/userProfileService.ts`
- **Currently shipped endpoints:** `/api/v1/auth/*`, `/api/v1/users/me*`
  (read / patch / avatar / email-change / role-switch).
- Everything else is ⛔ BE-BLOCKED — UIs render mock data behind feature
  flags until the contract lands.

> `vercel.json` does not support environment variable substitution, so the
> backend URL is hardcoded intentionally. To change the backend target,
> update `vercel.json` directly.

### CSPR.click (auth + wallet)
- Transparent wallet provisioning via social login. The user does **not**
  see "connect wallet" UI — the wallet is provisioned during sign-up.
- Provider list configured via the CSPR.click app dashboard (currently
  Google / Apple per the registration UI). Keep copy provider-agnostic
  per [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md).

### Supabase (legacy — being removed)
Some service files (`propertyService.ts`, `leaseManagementService.ts`,
`eSignatureService.ts`, etc.) still import `@supabase/supabase-js`. These
files exist for compile-time only — the imports are inert in production
because the corresponding UI runs on mocks behind feature flags. As each
endpoint lands on the Rust side, the matching service file is rewritten
and the Supabase import is dropped.

### API Documentation
See [docs/api/rust_service.md](docs/api/rust_service.md) for backend API
endpoint documentation.

## Architecture

### Frontend Architecture
See [unified_dashboard_arch.plantuml](unified_dashboard_arch.plantuml) for visual architecture diagram.

**Key Architectural Patterns:**
- Component-based architecture with shadcn/ui
- Custom hooks for business logic encapsulation
- Context API for global state management
- Service layer pattern for API calls
- Route-based code splitting

### Component Organization
- **UI Components** (`@/components/ui`): Reusable shadcn/ui primitives
- **Feature Components** (`@/components/*`): Business logic components
- **Page Components** (`@/pages/*`): Route-level components
- **Layout Components** (`@/layouts/*`): Page structure templates

## Documentation

- [Environment Setup](docs/ENVIRONMENT_SETUP.md) - Environment configuration guide
- [Google Maps Setup](docs/GOOGLE_MAPS_SETUP.md) - Google Maps API integration
- [Testing Guide](docs/TESTING_GUIDE.md) - Comprehensive testing documentation
- [API Documentation](docs/api/rust_service.md) - Backend API reference
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions

## Useful Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [CSPR.click Documentation](https://docs.cspr.click/)

## Development Notes

### Path Alias
The `@/` path alias points to the `src/` directory for cleaner imports:
```typescript
import { Button } from '@/components/ui/button'
```

### Styling Guidelines
- Use Tailwind CSS utility classes for styling
- Global styles are in `src/index.css`
- Component-specific styles use CSS modules when needed
- Follow the design system tokens in `tailwind.config.js`

### Code Quality
- TypeScript strict mode enabled
- ESLint configured for React and TypeScript
- Prettier for code formatting (if configured)
- Pre-commit hooks (if configured with husky)

## Contributing

1. Create a feature branch from `main`
2. Make your changes with proper tests
3. Run `pnpm run type-check` and `pnpm run lint`
4. Submit a pull request

## License

Private project - All rights reserved

## Support

For issues or questions, please refer to the project documentation in the `/docs` folder.
