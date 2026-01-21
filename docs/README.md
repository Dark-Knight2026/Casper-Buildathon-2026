# LeaseFi Module Responsibility Table

This document provides a clear mapping of modules, their responsibilities, and ownership within the LeaseFi frontend codebase.

## Directory Structure Overview

| Directory | Purpose | File Count |
|-----------|---------|------------|
| `src/components/` | Reusable UI components | 79 |
| `src/pages/` | Route-level page components | 81 |
| `src/contexts/` | React Context providers for state management | 18 |
| `src/services/` | API and business logic services | 67 |
| `src/hooks/` | Custom React hooks | 52 |
| `src/types/` | TypeScript type definitions | 49 |
| `src/utils/` | Utility functions | 22 |
| `src/lib/` | Third-party integrations and libraries | 40 |
| `src/layouts/` | Page layout components | 5 |
| `src/config/` | Configuration files | 5 |
| `src/data/` | Static data and constants | 7 |

## Context Providers Responsibility Table

| Context | File | Responsibility |
|---------|------|----------------|
| AgentContext | `contexts/AgentContext.tsx` | Agent user state and operations |
| AuthContext | `contexts/AuthContext.tsx` | Authentication state, login/logout, session management |
| ClientContext | `contexts/ClientContext.tsx` | Client data and operations |
| ClientLandlordContext | `contexts/ClientLandlordContext.tsx` | Client-landlord relationship management |
| DashboardPreferencesContext | `contexts/DashboardPreferencesContext.tsx` | User dashboard customization preferences |
| FavoritesContext | `contexts/FavoritesContext.tsx` | Property favorites/bookmarks |
| LandlordManagementContext | `contexts/LandlordManagementContext.tsx` | Landlord-specific operations |
| LeaseContext | `contexts/LeaseContext.tsx` | Current lease state |
| LeaseManagementContext | `contexts/LeaseManagementContext.tsx` | Lease CRUD operations |
| ListingContext | `contexts/ListingContext.tsx` | Property listing state |
| MessagingContext | `contexts/MessagingContext.tsx` | In-app messaging state |
| NotificationContext | `contexts/NotificationContext.tsx` | User notifications |
| OnboardingContext | `contexts/OnboardingContext.tsx` | User onboarding flow state |
| SearchContext | `contexts/SearchContext.tsx` | Property search filters and results |
| TaxPreparationContext | `contexts/TaxPreparationContext.tsx` | Tax document preparation |
| TenantDashboardContext | `contexts/TenantDashboardContext.tsx` | Tenant-specific dashboard state |
| UsernameSearchContext | `contexts/UsernameSearchContext.tsx` | Username lookup functionality |

## Services Responsibility Table

### Authentication & Users

| Service | File | Responsibility |
|---------|------|----------------|
| authService | `services/authService.ts` | User authentication, registration, password reset |
| profileService | `services/profileService.ts` | User profile management |

### Property & Listings

| Service | File | Responsibility |
|---------|------|----------------|
| propertyService | `services/propertyService.ts` | Property CRUD operations |
| propertyActionsService | `services/propertyActionsService.ts` | Property-specific actions |
| favoriteService | `services/favoriteService.ts` | Property favorites management |
| matchingService | `services/matchingService.ts` | Tenant-property matching algorithm |

### Lease Management

| Service | File | Responsibility |
|---------|------|----------------|
| leaseApi | `services/leaseApi.ts` | Lease API endpoints |
| leaseManagementService | `services/leaseManagementService.ts` | Lease lifecycle management |
| leaseGenerationService | `services/leaseGenerationService.ts` | Lease document generation |
| leaseRenewalService | `services/leaseRenewalService.ts` | Lease renewal workflows |
| leaseStorageService | `services/leaseStorageService.ts` | Lease document storage |
| leaseTemplateEngine | `services/leaseTemplateEngine.ts` | Lease template processing |
| renewalService | `services/renewalService.ts` | General renewal operations |
| renewalReminderService | `services/renewalReminderService.ts` | Renewal notification scheduling |

### Documents & Signatures

| Service | File | Responsibility |
|---------|------|----------------|
| documentService | `services/documentService.ts` | Document management |
| documentSharingService | `services/documentSharingService.ts` | Document sharing permissions |
| documentStorageService | `services/documentStorageService.ts` | Document file storage |
| documentVersionService | `services/documentVersionService.ts` | Document version control |
| eSignatureService | `services/eSignatureService.ts` | Electronic signature integration |
| signatureService | `services/signatureService.ts` | Signature operations |
| signatureAuditService | `services/signatureAuditService.ts` | Signature audit trail |
| signatureWorkflowService | `services/signatureWorkflowService.ts` | Signature workflow management |
| pdfGenerator | `services/pdfGenerator.ts` | PDF document generation |
| templateService | `services/templateService.ts` | Document template management |
| folderService | `services/folderService.ts` | Document folder organization |

### Payments & Financial

| Service | File | Responsibility |
|---------|------|----------------|
| paymentService | `services/paymentService.ts` | Payment processing |
| paymentReminderService | `services/paymentReminderService.ts` | Payment reminder notifications |
| stripeService | `services/stripeService.ts` | Stripe payment integration |
| lateFeeService | `services/lateFeeService.ts` | Late fee calculation and management |
| financialDataService | `services/financialDataService.ts` | Financial reporting data |
| receiptService | `services/receiptService.ts` | Payment receipt generation |
| taxService | `services/taxService.ts` | Tax document management |

### Maintenance

| Service | File | Responsibility |
|---------|------|----------------|
| maintenanceService | `services/maintenanceService.ts` | Maintenance request management |
| maintenanceCostService | `services/maintenanceCostService.ts` | Maintenance cost tracking |
| maintenancePhotoService | `services/maintenancePhotoService.ts` | Maintenance photo uploads |
| vendorService | `services/vendorService.ts` | Vendor management |
| vendorAssignmentService | `services/vendorAssignmentService.ts` | Vendor job assignment |
| vendorRatingService | `services/vendorRatingService.ts` | Vendor rating system |

### Communication

| Service | File | Responsibility |
|---------|------|----------------|
| messageService | `services/messageService.ts` | In-app messaging |
| conversationService | `services/conversationService.ts` | Conversation threads |
| notificationService | `services/notificationService.ts` | Push/in-app notifications |
| notificationPreferencesService | `services/notificationPreferencesService.ts` | Notification settings |
| emailService | `services/emailService.ts` | Email sending (SendGrid/SES) |
| smsService | `services/smsService.ts` | SMS sending (Twilio) |

### Applications & Screening

| Service | File | Responsibility |
|---------|------|----------------|
| applicationService | `services/applicationService.ts` | Rental application management |
| applicationScoringService | `services/applicationScoringService.ts` | Application scoring algorithm |
| backgroundCheckService | `services/backgroundCheckService.ts` | Background check integration |

### User Roles

| Service | File | Responsibility |
|---------|------|----------------|
| agentService | `services/agentService.ts` | Agent-specific operations |
| brokerService | `services/brokerService.ts` | Broker operations |
| buyerService | `services/buyerService.ts` | Buyer operations |
| sellerService | `services/sellerService.ts` | Seller operations |

### Analytics & Reporting

| Service | File | Responsibility |
|---------|------|----------------|
| analyticsService | `services/analyticsService.ts` | Usage analytics |
| dashboardService | `services/dashboardService.ts` | Dashboard data aggregation |
| reportService | `services/reportService.ts` | Report generation |
| exportService | `services/exportService.ts` | Data export functionality |
| predictiveService | `services/predictiveService.ts` | Predictive analytics |

### Infrastructure

| Service | File | Responsibility |
|---------|------|----------------|
| cacheService | `services/cacheService.ts` | Client-side caching |
| errorHandlingService | `services/errorHandlingService.ts` | Error handling and reporting |
| loggingService | `services/loggingService.ts` | Application logging |
| realtimeService | `services/realtimeService.ts` | Supabase realtime subscriptions |
| queryMonitorService | `services/queryMonitorService.ts` | Query performance monitoring |
| integrationService | `services/integrationService.ts` | Third-party integrations |

### AI & Automation

| Service | File | Responsibility |
|---------|------|----------------|
| aiService | `services/aiService.ts` | AI-powered features |
| automationService | `services/automationService.ts` | Workflow automation |
| workflowService | `services/workflowService.ts` | Business workflow management |
| bulkOperationsService | `services/bulkOperationsService.ts` | Bulk data operations |
| collaborationService | `services/collaborationService.ts` | Multi-user collaboration |

## User Roles (31 roles)

The system supports 31 distinct user roles. Key roles include:

| Role Category | Examples |
|---------------|----------|
| Property Owners | Landlord, Property Manager, Owner |
| Tenants | Tenant, Applicant, Co-signer |
| Agents | Real Estate Agent, Broker, Leasing Agent |
| Service Providers | Vendor, Maintenance Tech, Contractor |
| Administrative | Admin, Super Admin, Support |

## Related Documentation

- [README.md](./README.md) - Documentation navigation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - Context API patterns
- [API_SERVICES.md](./API_SERVICES.md) - Complete service reference
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current project state
