# API Services Reference

## Overview

The LeaseFi frontend has **67 service modules** that handle all backend communication. All services are located in [src/services/](../src/services/) and follow a consistent pattern.

## Service Architecture

### Standard Service Pattern

```typescript
/**
 * Service Name
 * Description of what this service does
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/supabase';

// Type definitions
export interface EntityType {
  id: string;
  // fields
}

// API functions
export async function getEntity(id: string): Promise<EntityType> {
  try {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapToEntityType(data);
  } catch (error) {
    logger.error('Error fetching entity', error);
    throw error;
  }
}
```

## Core Services

### Authentication & Authorization

#### 1. authService.ts
**Purpose**: Handles user authentication with Supabase Auth

**Key Functions**:
- `login(data: LoginData)`: User login
- `register(data: RegisterData)`: User registration
- `logout()`: User logout
- `resetPassword(email: string)`: Password reset request
- `updatePassword(newPassword: string)`: Update user password
- `setupMFA(data: MFASetupData)`: Multi-factor authentication setup
- `verifyMFA(data: MFAVerifyData)`: MFA verification
- `getSession()`: Get current session
- `refreshSession()`: Refresh session token

**Integration**: Supabase Auth

---

### Property Management

#### 2. propertyService.ts
**Purpose**: Property CRUD operations and search

**Key Functions**:
- `getProperties(params: PropertySearchParams)`: Search properties with filters
- `getProperty(id: string)`: Get single property
- `createProperty(data: PropertyFormData)`: Create new property
- `updateProperty(id: string, data: PropertyFormData)`: Update property
- `deleteProperty(id: string)`: Delete property
- `getPropertyStatistics(id: string)`: Get property analytics
- `uploadPropertyImages(id: string, files: File[])`: Upload property photos

**Related Types**: [src/types/property.ts](../src/types/property.ts)

---

#### 3. propertyActionsService.ts
**Purpose**: Property-related actions (views, tours, applications)

**Key Functions**:
- `scheduleViewing(data: ViewingRequest)`: Schedule property viewing
- `cancelViewing(id: string)`: Cancel viewing
- `recordPropertyView(propertyId: string)`: Track property views
- `getPropertyViewings(propertyId: string)`: Get scheduled viewings

---

### Lease Management

#### 4. leaseApi.ts
**Purpose**: Core lease operations

**Key Functions**:
- `getLeases()`: Get all leases for current user
- `getLease(id: string)`: Get single lease
- `createLease(data: LeaseData)`: Create new lease
- `updateLease(id: string, data: LeaseData)`: Update lease
- `signLease(id: string)`: Sign lease agreement
- `terminateLease(id: string)`: Terminate lease

**Related Types**: [src/types/lease.ts](../src/types/lease.ts)

---

#### 5. leaseManagementService.ts
**Purpose**: Advanced lease management operations

**Key Functions**:
- `getExpiringLeases(days: number)`: Get leases expiring in N days
- `sendLeaseReminder(leaseId: string)`: Send reminder notifications
- `exportLeaseData(leaseId: string)`: Export lease to PDF/CSV

---

#### 6. leaseRenewalService.ts
**Purpose**: Lease renewal workflow

**Key Functions**:
- `createRenewalOffer(data: RenewalOfferData)`: Create renewal offer
- `acceptRenewal(offerId: string)`: Accept renewal offer
- `rejectRenewal(offerId: string)`: Reject renewal offer
- `negotiateRenewal(offerId: string, terms: Terms)`: Counter-offer

---

#### 7. leaseGenerationService.ts
**Purpose**: Dynamic lease document generation

**Key Functions**:
- `generateLeaseDocument(data: LeaseData)`: Generate lease PDF
- `getLeaseTemplates()`: Get available templates
- `applyTemplate(templateId: string, data: Data)`: Apply template

---

#### 8. leaseStorageService.ts
**Purpose**: Lease document storage

**Key Functions**:
- `uploadLease(leaseId: string, file: File)`: Upload signed lease
- `downloadLease(leaseId: string)`: Download lease document

---

#### 9. leaseTemplateEngine.ts
**Purpose**: Lease template processing engine

---

### Payment Processing

#### 10. paymentService.ts
**Purpose**: Payment processing with Stripe

**Key Functions**:
- `createPaymentIntent(params: CreatePaymentParams)`: Create Stripe payment intent
- `processPayment(data: PaymentData)`: Process payment
- `getPaymentHistory(tenantId: string)`: Get payment history
- `refundPayment(paymentId: string)`: Process refund
- `getPaymentMethods(userId: string)`: Get saved payment methods
- `addPaymentMethod(data: PaymentMethodData)`: Add new payment method
- `deletePaymentMethod(methodId: string)`: Remove payment method

**Integration**: Stripe API

---

#### 11. stripeService.ts
**Purpose**: Direct Stripe API integration

**Key Functions**:
- `createCustomer(data: CustomerData)`: Create Stripe customer
- `attachPaymentMethod(customerId: string, methodId: string)`: Attach payment method
- `createSubscription(data: SubscriptionData)`: Create subscription

**Integration**: Stripe API

---

#### 12. paymentReminderService.ts
**Purpose**: Automated payment reminders

**Key Functions**:
- `scheduleReminder(leaseId: string)`: Schedule payment reminder
- `sendPaymentReminder(tenantId: string)`: Send reminder notification

---

#### 13. lateFeeService.ts
**Purpose**: Late fee calculation and application

**Key Functions**:
- `calculateLateFee(paymentId: string)`: Calculate late fee
- `applyLateFee(paymentId: string)`: Apply late fee to payment

---

#### 14. receiptService.ts
**Purpose**: Payment receipt generation

**Key Functions**:
- `generateReceipt(paymentId: string)`: Generate receipt PDF
- `emailReceipt(paymentId: string, email: string)`: Email receipt

---

### Tenant Application & Screening

#### 15. applicationService.ts
**Purpose**: Tenant application management

**Key Functions**:
- `submitApplication(data: ApplicationData)`: Submit tenant application
- `getApplications(propertyId: string)`: Get applications for property
- `updateApplicationStatus(id: string, status: Status)`: Update status
- `approveApplication(id: string)`: Approve application
- `rejectApplication(id: string)`: Reject application

---

#### 16. applicationScoringService.ts
**Purpose**: Automated application scoring

**Key Functions**:
- `scoreApplication(applicationId: string)`: Calculate application score
- `getScoreBreakdown(applicationId: string)`: Get detailed score breakdown

---

#### 17. backgroundCheckService.ts
**Purpose**: Background check integration

**Key Functions**:
- `initiateBackgroundCheck(applicantId: string)`: Start background check
- `getBackgroundCheckStatus(checkId: string)`: Get check status
- `getBackgroundCheckResults(checkId: string)`: Get results

**Integration**: Third-party background check API

---

### Maintenance Management

#### 18. maintenanceService.ts
**Purpose**: Maintenance request management

**Key Functions**:
- `createMaintenanceRequest(data: RequestData)`: Create maintenance request
- `getMaintenanceRequests(filters: Filters)`: Get requests with filters
- `updateMaintenanceStatus(id: string, status: Status)`: Update status
- `assignVendor(requestId: string, vendorId: string)`: Assign vendor

---

#### 19. maintenancePhotoService.ts
**Purpose**: Maintenance photo uploads

**Key Functions**:
- `uploadMaintenancePhoto(requestId: string, file: File)`: Upload photo
- `getMaintenancePhotos(requestId: string)`: Get photos for request

---

#### 20. maintenanceCostService.ts
**Purpose**: Maintenance cost tracking

**Key Functions**:
- `recordMaintenanceCost(data: CostData)`: Record cost
- `getMaintenanceCosts(filters: Filters)`: Get cost history

---

### Vendor Management

#### 21. vendorService.ts
**Purpose**: Vendor directory and management

**Key Functions**:
- `getVendors(filters: VendorFilters)`: Search vendors
- `getVendor(id: string)`: Get vendor details
- `addVendor(data: VendorData)`: Add new vendor
- `updateVendor(id: string, data: VendorData)`: Update vendor

---

#### 22. vendorAssignmentService.ts
**Purpose**: Vendor work assignment

**Key Functions**:
- `assignVendorToJob(jobId: string, vendorId: string)`: Assign vendor
- `getVendorAssignments(vendorId: string)`: Get vendor's jobs

---

#### 23. vendorRatingService.ts
**Purpose**: Vendor rating and reviews

**Key Functions**:
- `rateVendor(vendorId: string, rating: Rating)`: Submit rating
- `getVendorRatings(vendorId: string)`: Get vendor ratings

---

### Communication

#### 24. messageService.ts
**Purpose**: In-app messaging

**Key Functions**:
- `sendMessage(data: MessageData)`: Send message
- `getMessages(conversationId: string)`: Get conversation messages
- `markAsRead(messageId: string)`: Mark message as read

---

#### 25. conversationService.ts
**Purpose**: Conversation management

**Key Functions**:
- `createConversation(participants: string[])`: Create conversation
- `getConversations(userId: string)`: Get user's conversations
- `deleteConversation(id: string)`: Delete conversation

---

#### 26. emailService.ts
**Purpose**: Email notifications

**Key Functions**:
- `sendEmail(data: EmailData)`: Send email
- `sendBulkEmail(data: BulkEmailData)`: Send bulk emails

**Integration**: Email service provider (SendGrid/SES)

---

#### 27. smsService.ts
**Purpose**: SMS notifications

**Key Functions**:
- `sendSMS(phone: string, message: string)`: Send SMS
- `sendBulkSMS(data: BulkSMSData)`: Send bulk SMS

**Integration**: SMS gateway (Twilio)

---

#### 28. notificationService.ts
**Purpose**: Multi-channel notifications

**Key Functions**:
- `sendNotification(data: NotificationData)`: Send notification
- `getNotifications(userId: string)`: Get user notifications
- `markNotificationAsRead(id: string)`: Mark as read

---

#### 29. notificationPreferencesService.ts
**Purpose**: Notification settings management

**Key Functions**:
- `getPreferences(userId: string)`: Get user preferences
- `updatePreferences(userId: string, prefs: Prefs)`: Update preferences

---

### Document Management

#### 30. documentService.ts
**Purpose**: Document CRUD operations

**Key Functions**:
- `uploadDocument(file: File, metadata: Metadata)`: Upload document
- `getDocument(id: string)`: Get document
- `deleteDocument(id: string)`: Delete document
- `shareDocument(id: string, userId: string)`: Share document

---

#### 31. documentStorageService.ts
**Purpose**: Cloud storage integration

**Key Functions**:
- `uploadToStorage(bucket: string, file: File)`: Upload to storage
- `downloadFromStorage(bucket: string, path: string)`: Download file
- `deleteFromStorage(bucket: string, path: string)`: Delete file

**Integration**: Supabase Storage

---

#### 32. documentVersionService.ts
**Purpose**: Document versioning

**Key Functions**:
- `createVersion(documentId: string, file: File)`: Create new version
- `getVersions(documentId: string)`: Get version history
- `restoreVersion(versionId: string)`: Restore old version

---

#### 33. documentSharingService.ts
**Purpose**: Document sharing and permissions

**Key Functions**:
- `shareDocument(documentId: string, userId: string, permissions: Perms)`: Share
- `revokeAccess(documentId: string, userId: string)`: Revoke access

---

#### 34. folderService.ts
**Purpose**: Document folder organization

**Key Functions**:
- `createFolder(name: string, parentId: string)`: Create folder
- `moveDocument(docId: string, folderId: string)`: Move document

---

### E-Signature

#### 35. signatureService.ts
**Purpose**: Document signing

**Key Functions**:
- `requestSignature(documentId: string, signers: Signer[])`: Request signatures
- `signDocument(documentId: string, signature: Signature)`: Sign document
- `getSignatureStatus(documentId: string)`: Get signing status

---

#### 36. eSignatureService.ts
**Purpose**: E-signature provider integration

**Key Functions**:
- `createEnvelope(document: Document, signers: Signer[])`: Create signing envelope
- `sendEnvelope(envelopeId: string)`: Send for signing

**Integration**: DocuSign/HelloSign

---

#### 37. signatureWorkflowService.ts
**Purpose**: Multi-party signature workflows

**Key Functions**:
- `createWorkflow(steps: Step[])`: Create signature workflow
- `getWorkflowStatus(workflowId: string)`: Get workflow status

---

#### 38. signatureAuditService.ts
**Purpose**: Signature audit trail

**Key Functions**:
- `getAuditTrail(documentId: string)`: Get audit trail
- `exportAuditTrail(documentId: string)`: Export audit log

---

### Financial Services

#### 39. financialDataService.ts
**Purpose**: Financial data aggregation

**Key Functions**:
- `getFinancialSummary(userId: string)`: Get financial overview
- `getIncomeStatement(landlordId: string, period: Period)`: Get income statement
- `getCashFlow(landlordId: string)`: Get cash flow data

---

#### 40. taxService.ts
**Purpose**: Tax calculation and reporting

**Key Functions**:
- `calculateTaxes(data: TaxData)`: Calculate taxes
- `generateTaxReport(year: number)`: Generate tax report
- `export1099(landlordId: string, year: number)`: Generate 1099 form

---

#### 41. reportService.ts
**Purpose**: Report generation

**Key Functions**:
- `generateReport(type: ReportType, params: Params)`: Generate report
- `scheduleReport(type: ReportType, schedule: Schedule)`: Schedule recurring report

---

#### 42. exportService.ts
**Purpose**: Data export functionality

**Key Functions**:
- `exportToCSV(data: any[], filename: string)`: Export to CSV
- `exportToPDF(data: any, template: string)`: Export to PDF
- `exportToExcel(data: any[], filename: string)`: Export to Excel

---

#### 43. analyticsService.ts
**Purpose**: Analytics and metrics

**Key Functions**:
- `trackEvent(event: Event)`: Track analytics event
- `getAnalytics(filters: Filters)`: Get analytics data
- `getDashboardMetrics(userId: string)`: Get dashboard metrics

---

#### 44. dashboardService.ts
**Purpose**: Dashboard data aggregation

**Key Functions**:
- `getDashboardData(userId: string, role: Role)`: Get role-specific dashboard
- `getWidgetData(widgetId: string)`: Get widget data

---

### Agent & Broker Services

#### 45. agentService.ts
**Purpose**: Agent-specific operations

**Key Functions**:
- `getAgentProfile(id: string)`: Get agent profile
- `getAgentListings(agentId: string)`: Get agent listings
- `getAgentClients(agentId: string)`: Get agent clients

---

#### 46. brokerService.ts
**Purpose**: Broker-specific operations

**Key Functions**:
- `getBrokerTeam(brokerId: string)`: Get broker's team
- `getTeamPerformance(brokerId: string)`: Get team metrics

---

#### 47. sellerService.ts
**Purpose**: Seller operations

---

#### 48. buyerService.ts
**Purpose**: Buyer operations

---

### Search & Discovery

#### 49. matchingService.ts
**Purpose**: Property-tenant matching algorithm

**Key Functions**:
- `findMatches(preferences: Preferences)`: Find matching properties
- `getRecommendations(userId: string)`: Get personalized recommendations

---

#### 50. favoriteService.ts
**Purpose**: Favorite properties management

**Key Functions**:
- `addFavorite(userId: string, propertyId: string)`: Add to favorites
- `removeFavorite(userId: string, propertyId: string)`: Remove from favorites
- `getFavorites(userId: string)`: Get user favorites

---

### Advanced Features

#### 51. aiService.ts
**Purpose**: AI-powered features

**Key Functions**:
- `getPropertyRecommendations(userId: string)`: AI recommendations
- `analyzeTenantProfile(profileId: string)`: AI profile analysis
- `predictMaintenanceCosts(propertyId: string)`: Predictive maintenance

---

#### 52. predictiveService.ts
**Purpose**: Predictive analytics

**Key Functions**:
- `predictRenewalProbability(leaseId: string)`: Predict renewal likelihood
- `predictPaymentRisk(tenantId: string)`: Predict payment risk

---

#### 53. automationService.ts
**Purpose**: Workflow automation

**Key Functions**:
- `createAutomation(workflow: Workflow)`: Create automation
- `executeAutomation(automationId: string)`: Execute automation

---

#### 54. workflowService.ts
**Purpose**: Business process workflows

**Key Functions**:
- `createWorkflow(definition: Definition)`: Create workflow
- `executeWorkflow(workflowId: string, data: Data)`: Execute workflow

---

#### 55. bulkOperationsService.ts
**Purpose**: Bulk operations

**Key Functions**:
- `bulkUpdateProperties(ids: string[], updates: Updates)`: Bulk update
- `bulkSendNotifications(userIds: string[], message: Message)`: Bulk notify

---

#### 56. realtimeService.ts
**Purpose**: Real-time updates via WebSocket

**Key Functions**:
- `subscribe(channel: string, callback: Callback)`: Subscribe to channel
- `unsubscribe(channel: string)`: Unsubscribe
- `broadcast(channel: string, data: Data)`: Broadcast message

**Integration**: WebSocket/Supabase Realtime

---

### Utilities & Infrastructure

#### 57. cacheService.ts
**Purpose**: Client-side caching

**Key Functions**:
- `set(key: string, value: any, ttl: number)`: Cache value
- `get(key: string)`: Get cached value
- `invalidate(key: string)`: Invalidate cache

---

#### 58. errorHandlingService.ts
**Purpose**: Global error handling

**Key Functions**:
- `handleError(error: Error)`: Handle and log error
- `reportError(error: Error)`: Report to error tracking service

---

#### 59. loggingService.ts
**Purpose**: Application logging

**Key Functions**:
- `log(level: Level, message: string, data: Data)`: Log message
- `flush()`: Flush logs to server

---

#### 60. queryMonitorService.ts
**Purpose**: Query performance monitoring

**Key Functions**:
- `trackQuery(query: Query, duration: number)`: Track query performance
- `getSlowQueries()`: Get slow queries report

---

#### 61. profileService.ts
**Purpose**: User profile management

**Key Functions**:
- `getProfile(userId: string)`: Get user profile
- `updateProfile(userId: string, data: ProfileData)`: Update profile

---

#### 62. templateService.ts
**Purpose**: Document template management

**Key Functions**:
- `getTemplates(type: TemplateType)`: Get templates
- `renderTemplate(templateId: string, data: Data)`: Render template

---

#### 63. pdfGenerator.ts
**Purpose**: PDF generation utility

**Key Functions**:
- `generatePDF(html: string, options: Options)`: Generate PDF from HTML

---

#### 64. integrationService.ts
**Purpose**: Third-party integrations

**Key Functions**:
- `connectService(service: Service, credentials: Credentials)`: Connect service
- `syncData(service: Service)`: Sync data with external service

---

#### 65. collaborationService.ts
**Purpose**: Real-time collaboration features

---

#### 66. renewalService.ts
**Purpose**: General renewal operations

---

#### 67. renewalReminderService.ts
**Purpose**: Renewal reminder automation

---

## Service Integration Map

```
┌─────────────────┐
│   React Query   │ ← TanStack Query handles caching
└────────┬────────┘
         │
┌────────▼────────┐
│   Services      │ ← 67 service modules
└────────┬────────┘
         │
┌────────▼────────┐
│   Supabase      │ ← Backend API
│   (PostgreSQL)  │
└─────────────────┘

External Integrations:
├── Stripe (payments)
├── DocuSign/HelloSign (e-signature)
├── Twilio (SMS)
├── SendGrid/SES (email)
└── Background Check API
```

## Error Handling Pattern

All services follow this error handling pattern:

```typescript
try {
  // API call
  const { data, error } = await supabase.from('table').select();

  if (error) throw error;

  return data;
} catch (error) {
  logger.error('Operation failed', error);
  throw error; // Re-throw for component-level handling
}
```

## Testing Services

```typescript
import { vi } from 'vitest';
import { myService } from './myService';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: mockData, error: null }))
    }))
  }
}));

test('service function', async () => {
  const result = await myService.getData();
  expect(result).toEqual(mockData);
});
```

## Best Practices

1. **Always use TypeScript types** from [src/types/](../src/types/)
2. **Always log errors** using the logger utility
3. **Handle errors gracefully** - don't let errors crash the app
4. **Use try-catch blocks** for all async operations
5. **Validate input data** before making API calls
6. **Use TanStack Query** for caching and state management
7. **Document complex logic** with JSDoc comments

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [State Management](./STATE_MANAGEMENT.md)
