# Services

Frontend service layer — wraps backend endpoints, third-party SDKs, and
local utilities. Each module exports a focused API the rest of the app
imports via `@/services/<name>`. The `ico/` subdirectory documents its
own files in `ico/readme.md`.

## Responsibility Table

| File | Responsibility |
|------|----------------|
| agentService.ts | Real-estate agent CRUD and assignment workflow |
| aiService.ts | AI-powered suggestions (lease clauses, listing copy) |
| analyticsService.ts | Frontend event + metric tracking pipeline |
| applicationScoringService.ts | Score tenant applications against landlord criteria |
| applicationService.ts | Rental-application CRUD (submit, list, status) |
| authService.ts | Legacy/back-compat auth flows (wallet + supabase) |
| automationService.ts | Rule-driven automations (reminders, status transitions) |
| backgroundCheckService.ts | Tenant background-check integration |
| brokerService.ts | Broker entity CRUD + commission tracking |
| bulkOperationsService.ts | Batch operations across leases/properties/users |
| buyerService.ts | Buyer profile + saved-search CRUD |
| cacheService.ts | Cross-call cache primitives (TTL, in-memory store) |
| collaborationService.ts | Multi-user collaboration (presence, comments) |
| conversationService.ts | Threaded messaging conversations |
| dashboardService.ts | Aggregate dashboard data (KPIs, recent activity) |
| documentService.ts | Document CRUD (metadata + content) |
| documentSharingService.ts | Document access grants + revocation |
| documentStorageService.ts | File-blob storage and signed URL handout |
| documentVersionService.ts | Document version history + diffs |
| eSignatureService.ts | High-level e-signature orchestration |
| emailService.ts | Outbound email notifications |
| errorHandlingService.ts | Centralized error normalization + reporting |
| exportService.ts | Data export (CSV, XLSX, PDF) |
| favoriteService.ts | Tenant property favorites |
| financialDataService.ts | Financial KPI/timeseries data fetch |
| folderService.ts | Document folder tree CRUD |
| integrationService.ts | Third-party integration registry + config |
| lateFeeService.ts | Late-fee calculation + posting |
| leaseApi.ts | Thin REST client for lease endpoints |
| leaseGenerationService.ts | Generate lease documents from templates |
| leaseManagementService.ts | Lease lifecycle orchestration (draft → active → terminated) |
| leaseRenewalService.ts | Lease renewal workflow |
| leaseStorageService.ts | Persist lease drafts + binary documents |
| leaseTemplateEngine.ts | Template rendering with clauses + variables |
| loggingService.ts | Structured logging facade |
| maintenanceCostService.ts | Maintenance cost tracking + budgeting |
| maintenancePhotoService.ts | Photo upload + verification for maintenance entries |
| maintenanceService.ts | Maintenance request CRUD + status updates |
| matchingService.ts | Property ↔ tenant/buyer matching engine |
| messageService.ts | Direct messages (1:1) |
| notificationPreferencesService.ts | Per-user channel/topic notification settings |
| notificationService.ts | In-app + push notification dispatch |
| paymentReminderService.ts | Schedule and send rent payment reminders |
| paymentService.ts | Rent / deposit / fee payment operations |
| pdfGenerator.ts | PDF generation helper (leases, receipts) |
| predictiveService.ts | Predictive analytics (churn, late-payment risk) |
| profileService.ts | Generic profile CRUD (non-auth) |
| propertyActionsService.ts | Property-level actions (list, archive, share) |
| propertyService.ts | Property CRUD + search |
| queryMonitorService.ts | Query performance monitoring |
| realtimeService.ts | WebSocket / realtime channel subscriptions |
| receiptService.ts | Payment receipt generation + retrieval |
| renewalReminderService.ts | Schedule and send lease-renewal reminders |
| renewalService.ts | Lease renewal record CRUD |
| reportService.ts | Tenant / landlord / portfolio reports |
| sellerService.ts | Seller profile + listing flow |
| signatureAuditService.ts | Audit trail for signature events |
| signatureService.ts | Signature capture + persistence |
| signatureWorkflowService.ts | Multi-party signature workflow orchestration |
| smsService.ts | Outbound SMS notifications |
| stripeService.ts | Stripe integration (checkout, subscriptions, payouts) |
| taxService.ts | Tax calculation + 1099/tax-form data |
| templateService.ts | Generic template CRUD (non-lease) |
| userProfileService.ts | `GET` / `PATCH` `/users/me`, avatar upload |
| vendorAssignmentService.ts | Assign vendors to maintenance requests |
| vendorRatingService.ts | Vendor rating + review CRUD |
| vendorService.ts | Vendor CRUD + directory |
| workflowService.ts | Generic workflow engine (state machines) |

The `ico/` subdirectory documents its own service files in its own `readme.md`.
