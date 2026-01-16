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
- **API Client**: Supabase Client
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

2. Configure your environment variables in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
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

### End-to-End Tests

```bash
# Run E2E tests
pnpm run test:e2e

# Run E2E tests with UI
pnpm run test:e2e:ui

# Run E2E tests in headed mode
pnpm run test:e2e:headed

# Debug E2E tests
pnpm run test:e2e:debug
```

### Integration Tests

```bash
pnpm run test:integration
```

## Key Features

### Role-Based Dashboards
- **Landlord Dashboard**: Property management, lease tracking, financial reports
- **Tenant Dashboard**: Lease information, payment history, maintenance requests
- **Agent Dashboard**: Listings management, client interactions, commission tracking
- **Broker Dashboard**: Team oversight, performance analytics, marketplace access

### Core Functionality
- Property listing and management
- Lease creation and tracking
- Payment processing and history
- Maintenance request system
- Document storage and e-signatures
- Real-time notifications
- Analytics and reporting
- Tax center integration
- Agent marketplace

## Backend Integration

This frontend application integrates with backend services through API calls.

### API Documentation
See [docs/api/rust_service.md](docs/api/rust_service.md) for backend API endpoint documentation.

### Key Integration Points
- **Supabase**: Database, authentication, real-time subscriptions, storage
- **Rust Microservice**: Tax calculations, complex analytics
- **Edge Functions**: Email/SMS notifications, payment processing, workflows

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

## Deployment

### Vercel Deployment

The project is configured for Vercel deployment with [vercel.json](vercel.json).

```bash
# Deploy to Vercel
vercel deploy

# Deploy to production
vercel --prod
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

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
- [Supabase Documentation](https://supabase.com/docs)

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
