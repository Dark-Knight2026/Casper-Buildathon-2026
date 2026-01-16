# LeaseFi Documentation

Welcome to the LeaseFi platform documentation. This directory contains architectural documentation and developer guides.

## Documentation Index

### 🚨 Start Here (Important!)

**[PROJECT_STATUS.md](./PROJECT_STATUS.md)** ⚠️ **READ THIS FIRST**
   - Current project state (active refactoring)
   - Backend migration in progress
   - Known issues and why they exist
   - Code review guidelines
   - What to focus on vs. what to ignore

### Core Documentation

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)**
   - High-level system overview
   - Tech stack and project structure
   - User roles and key features
   - Performance optimizations
   - Security features
   - Integration points
   - Architectural decisions

2. **[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)**
   - Context API architecture
   - 18 context providers explained
   - State management patterns
   - Performance optimization strategies
   - Best practices and testing

3. **[API_SERVICES.md](./API_SERVICES.md)**
   - Complete reference of 67 service modules
   - Service architecture patterns
   - Integration map
   - Error handling
   - Testing guidelines

### Migration & Planning

4. **[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)**
   - Backend migration strategy
   - Phased rollout plan
   - Timeline and dependencies
   - Risk management

5. **[VALIDATION_LAYER_PLAN.md](./VALIDATION_LAYER_PLAN.md)**
   - TYPE-1 issue explanation
   - Why validation is delayed
   - Implementation plan
   - When it will be fixed

## Quick Start

### For Code Reviewers

⚠️ **MUST READ FIRST**: [PROJECT_STATUS.md](./PROJECT_STATUS.md)

This explains:
- Why some things aren't implemented yet
- What to focus on in code review
- What issues are known and planned

### For New Developers

Read in this order:

1. **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** ← Start here to understand current state
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** ← System overview
3. **[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)** ← How state works
4. **[API_SERVICES.md](./API_SERVICES.md)** ← API integration (note: being migrated)
5. **[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)** ← What's changing and when

## Project Statistics

- **Lines of Code**: 347,000+
- **Components**: 79
- **Pages**: 81
- **Services**: 67
- **Contexts**: 18
- **Custom Hooks**: 52
- **Type Definitions**: 49
- **Utilities**: 22
- **User Roles**: 31

## Key Technologies

- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router v6
- **State**: Context API + TanStack Query
- **UI**: Custom components + shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Payments**: Stripe
- **E-Signature**: DocuSign/HelloSign
- **Communication**: Twilio (SMS), SendGrid/SES (Email)

## Getting Help

- For setup instructions, see [../README.md](../README.md)
- For TypeScript strict mode, see tsconfig files
- For environment variables, see [../.env.example](../.env.example)

## Contributing

When adding new features:

1. Follow existing patterns documented here
2. Update relevant documentation
3. Add TypeScript types
4. Write tests
5. Update this README if adding new doc files

## Documentation Maintenance

This documentation was created on 2026-01-16. It should be updated when:

- Major architectural changes are made
- New contexts or services are added
- Integration points change
- Tech stack is upgraded

## Future Documentation

Consider adding:

- Authentication flow diagrams
- Data model documentation
- Deployment guide
- ADRs (Architectural Decision Records) directory
- Component library documentation
- API endpoint documentation
- Testing strategy guide
