# LeaseFi Platform Architecture

## Overview

LeaseFi is a comprehensive real estate management platform built with React, TypeScript, and modern web technologies. The platform facilitates property leasing, management, and transactions across multiple user roles.

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context API (18 contexts)
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: Custom component library with shadcn/ui
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest + Testing Library

## Project Structure

```
src/
├── components/       # Reusable UI components (79 components)
├── contexts/        # Global state management (18 contexts)
├── hooks/           # Custom React hooks (52 hooks)
├── pages/           # Route-level page components (81 pages)
├── services/        # API integration layer (67 services)
├── types/           # TypeScript type definitions (49 type files)
├── utils/           # Helper functions and utilities (22 utilities)
├── lib/             # Third-party library configurations (40 lib files)
├── layouts/         # Page layout components
├── providers/       # Context provider wrappers
├── data/            # Static data and constants
├── config/          # App configuration
└── styles/          # Global styles
```

## User Roles

The platform supports **31 distinct user roles** across the real estate transaction lifecycle:

### Core Roles (6)
- **Buyer**: Property purchasers
- **Seller**: Property sellers
- **Agent**: Real estate agents
- **Broker**: Real estate brokers
- **Landlord**: Property owners/landlords
- **Tenant**: Property renters

### Act I: Pre-Offer Professionals (9)
- Mortgage Broker
- CPA (Certified Public Accountant)
- Real Estate Attorney
- Insurance Agent
- Stager
- Photographer
- Contractor
- Listing Attorney
- HOA Manager

### Act II: Post-Offer Professionals (15)
- Appraiser
- Home Inspector
- Pest Inspector
- Surveyor
- Environmental Specialist
- Buyer Attorney
- Seller Attorney
- Title Officer
- Escrow Officer
- Notary

### Administrative (1)
- Admin

## Key Features

### 1. Multi-Role Dashboards
Each user role has a customized dashboard with role-specific functionality:
- Tenant: Lease management, payments, maintenance requests
- Landlord: Property management, tenant screening, financial tracking
- Agent/Broker: Lead management, transaction tracking, commission tracking
- Service Providers: Job assignments, vendor management

### 2. Property Management
- Property search and discovery
- Listing creation and management
- Property viewing scheduling
- Favorites and saved searches

### 3. Lease Lifecycle Management
- Lease creation wizard with templates
- Digital lease signing (e-signature integration)
- Lease renewal workflows
- Lease termination processing

### 4. Application Processing
- Tenant application submission
- Background check integration
- Application scoring system
- Document verification

### 5. Payment Processing
- Rent payment collection
- Payment method management
- Late fee automation
- Financial reporting and analytics

### 6. Maintenance Management
- Maintenance request submission
- Vendor assignment and tracking
- Photo documentation
- Cost tracking and budgeting

### 7. Communication
- In-app messaging system
- Multi-channel notifications (email, SMS, push)
- Notification preferences
- Communication center

### 8. Document Management
- Document storage and versioning
- Folder organization
- Document sharing
- PDF generation

### 9. Financial Operations
- Payment processing (Stripe integration)
- Financial dashboards
- Tax preparation tools
- Receipt management
- Budget tracking

### 10. Advanced Features
- AI-powered recommendations
- Predictive analytics
- Workflow automation
- Bulk operations
- Real-time updates (WebSocket)
- Export functionality

## Routing Architecture

The application uses client-side routing with React Router v6:

- **Public Routes**: Landing pages, property search, authentication
- **Protected Routes**: Role-based dashboard and feature access
- **Lazy Loading**: All pages are code-split for optimal performance
- **Route Guards**: `ProtectedRoute` component enforces authentication

## Performance Optimizations

1. **Code Splitting**: All pages lazy-loaded with React.lazy()
2. **Query Caching**: TanStack Query caches API responses
3. **Service Layer Caching**: Custom cache service for frequent operations
4. **Memoization**: Strategic use of useMemo/useCallback
5. **Virtual Scrolling**: For large lists
6. **Image Optimization**: Lazy loading, responsive images

## Security Features

1. **Authentication**: JWT-based auth with refresh tokens
2. **Authorization**: Role-based access control (RBAC)
3. **MFA Support**: Two-factor authentication
4. **Input Validation**: Zod schemas for all forms
5. **XSS Protection**: React's built-in escaping + sanitization
6. **CSRF Protection**: Token-based protection

## Integration Points

### External Services
- **Payment Processing**: Stripe
- **E-Signatures**: Digital signature service
- **Background Checks**: Third-party screening API
- **SMS**: SMS gateway integration
- **Email**: Email service provider
- **Storage**: Cloud storage for documents/images
- **Real-time**: WebSocket for live updates

### Backend API
The frontend communicates with a REST API backend. All API calls are centralized in the `services/` directory.

## Development Workflow

1. **TypeScript Strict Mode**: Full type safety enabled
2. **ESLint**: Code quality enforcement
3. **Prettier**: Code formatting
4. **Git Hooks**: Pre-commit linting
5. **Testing**: Unit tests with Vitest

## Deployment

- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Environment**: Variables managed via `.env` files

## Key Architectural Decisions

### Why Context API instead of Redux?
- Simpler state management for medium-complexity app
- Better TypeScript integration
- Reduced boilerplate
- Sufficient for current scale

### Why TanStack Query?
- Automatic caching and invalidation
- Built-in loading/error states
- Optimistic updates
- Pagination and infinite scroll support

### Why Vite instead of Create React App?
- Faster dev server (ESBuild)
- Faster builds
- Better tree-shaking
- Modern tooling

## Scalability Considerations

- **Context Performance**: Large contexts split into smaller, focused contexts
- **Bundle Size**: Lazy loading keeps initial bundle small
- **API Calls**: Query caching reduces redundant requests
- **Monitoring**: Error logging service integration ready
- **Analytics**: Query monitoring service tracks performance

## Known Limitations

1. **Context Re-renders**: Some contexts may trigger unnecessary re-renders (optimization needed)
2. **Type Coverage**: Some third-party libraries have incomplete types
3. **Test Coverage**: Test suite is in early stages
4. **Documentation**: Component documentation incomplete

## Future Enhancements

1. **State Management**: Consider migrating to Zustand or Jotai for better performance
2. **GraphQL**: Evaluate GraphQL for more efficient data fetching
3. **Mobile App**: React Native app sharing business logic
4. **Offline Support**: PWA with offline capabilities
5. **Internationalization**: i18n support for multiple languages

## Getting Started

See [README.md](../README.md) for installation and setup instructions.

## Additional Documentation

- [State Management Guide](./STATE_MANAGEMENT.md)
- [API Services Reference](./API_SERVICES.md)
