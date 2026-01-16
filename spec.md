# LeaseFi Real Estate CRM - Frontend Specification

**Version:** 1.0
**Last Updated:** 2026-01-16
**Project Size:** ~250,000+ lines of code
**Status:** Production-Ready

---

## 1. EXECUTIVE SUMMARY

### 1.1 Project Overview

LeaseFi is a comprehensive real estate Customer Relationship Management (CRM) platform designed to streamline property management, lease agreements, tenant relations, and agent operations. The frontend application provides role-based dashboards for five distinct user types: Tenants, Landlords, Agents, Brokers, and Administrators.

### 1.2 Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | React | 18.3.1 |
| **Language** | TypeScript | 5.7.3 |
| **Build Tool** | Vite | 6.4.1 |
| **UI Library** | shadcn/ui (Radix UI) | Latest |
| **Styling** | Tailwind CSS | 3.4.17 |
| **Routing** | React Router | 7.1.3 |
| **State Management** | React Context + React Query | 5.62.11 |
| **Form Handling** | React Hook Form + Zod | Latest |
| **Backend/API** | Supabase | 2.48.1 |
| **Testing** | Vitest + Playwright | Latest |

### 1.3 Project Statistics

- **82+ Pages** covering all user journeys
- **79+ Components** organized by feature domain
- **21 Context Providers** for state management
- **53 Custom Hooks** for business logic encapsulation
- **70 Service Modules** for API and business operations
- **51+ Type Definition Files** for complete type safety
- **22 Utility Functions** for common operations

---

## 2. FUNCTIONAL REQUIREMENTS

### 2.1 User Roles & Access Control

#### Role Definitions

| Role | Primary Use Case | Access Level |
|------|-----------------|--------------|
| **Tenant** | View properties, pay rent, submit maintenance requests, manage leases | Basic: Own data only |
| **Landlord** | Manage properties, create leases, review applications, track finances | Elevated: Owns properties and associated data |
| **Agent** | Manage clients, track sales pipeline, earn commissions | Elevated: Client and transaction data |
| **Broker** | Oversee agent teams, access marketplace, view analytics | Admin: Team and organization data |
| **Administrator** | System configuration, user management | Super Admin: Full system access |

#### Authentication & Authorization

**Requirements:**
- Email/password authentication with Supabase Auth
- OAuth2 integration (Google, GitHub)
- Multi-Factor Authentication (MFA) support
- Role-Based Access Control (RBAC)
- Session management with auto-refresh (5-minute intervals)
- Password reset and recovery flows
- Session expiration monitoring

**Implementation:**
- Location: `src/contexts/AuthContext.tsx`
- Pages: `src/pages/auth/`
- Protected routes via `ProtectedRoute` component

---

### 2.2 Core Feature Domains

#### 2.2.1 Lease Management

**Purpose:** Complete lifecycle management of lease agreements from creation to renewal.

**Functional Requirements:**

1. **Lease Creation**
   - AI-powered 10-step wizard
   - State-specific templates (50+ templates)
   - Custom clause creation
   - Multi-tenant support
   - Agent commission configuration
   - Compliance validation against state laws

2. **AI Clause Suggestions**
   - Context-aware clause recommendations
   - Legal compliance checking
   - Industry best practices integration
   - Custom clause library

3. **Collaborative Editing**
   - Real-time document collaboration
   - Version control and history tracking
   - Change tracking and annotations
   - Role-based editing permissions

4. **E-Signature Integration**
   - Multi-party signing workflow
   - Signature tracking (pending, signed, rejected)
   - Email notifications for signing requests
   - Legal audit trail

5. **Lease Renewal**
   - Automated renewal reminders (90/60/30 days)
   - Rent increase calculations
   - Renewal offer generation
   - Tenant acceptance/rejection workflow

6. **Amendment Management**
   - Lease modification tracking
   - Amendment history
   - Re-signature workflows

**Data Models:**
```typescript
interface LeaseAgreement {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantIds: string[];
  agentId?: string;
  type: 'fixed' | 'month-to-month' | 'sublease' | 'commercial';
  status: 'draft' | 'pending_signatures' | 'active' | 'expired' | 'terminated';
  monthlyRent: number;
  securityDeposit: number;
  startDate: Date;
  endDate: Date;
  clauses: LeaseClause[];
  signatureStatus: 'pending' | 'signed';
  signatureProgress: SignatureProgress;
  complianceScore: number;
  versionHistory: LeaseVersion[];
  agentCommission?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- Landlords can create lease agreements in < 5 minutes
- AI suggestions load in < 2 seconds
- 100% compliance validation accuracy for supported states
- Real-time collaboration with < 200ms latency
- Signature workflows complete in < 5 steps

**Components:**
- `LeaseAgreementGenerator.tsx` (42.6KB)
- `LeaseRenewalWorkflow.tsx` (33.5KB)
- `LeaseTemplateMarketplace.tsx` (40.6KB)
- `EnhancedLeaseWizard.tsx` (15.4KB)
- `AIClauseSuggestionEngine.tsx` (19.3KB)
- `ComplianceChecker.tsx` (17.3KB)
- `CollaborativeLeaseEditor.tsx` (18.2KB)

---

#### 2.2.2 Property Management

**Purpose:** Comprehensive property listing, tracking, and management for landlords.

**Functional Requirements:**

1. **Property Listing**
   - CRUD operations for properties
   - Multi-image upload (10+ images per property)
   - Property details (bedrooms, bathrooms, sq ft, rent)
   - Amenities tracking (pool, gym, parking, etc.)
   - Pet policies and parking information
   - Geographic coordinates for mapping

2. **Property Status Management**
   - Status tracking: active, pending, rented, inactive
   - Availability calendars
   - Occupancy tracking

3. **Property Search**
   - Full-text search across properties
   - Advanced filtering (price, location, bedrooms, amenities)
   - Saved searches
   - Search analytics

4. **Property Comparison**
   - Side-by-side property comparison tool
   - Comparison metrics

**Data Models:**
```typescript
interface Property {
  id: string;
  landlordId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  rent: number;
  securityDeposit: number;
  propertyType: 'apartment' | 'house' | 'condo' | 'townhouse' | 'commercial';
  images: string[];
  amenities: string[];
  utilities: string[];
  petPolicy: string;
  parking: string;
  status: 'active' | 'pending' | 'rented' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- Property listing creation in < 3 minutes
- Image upload supports 10+ images
- Search returns results in < 1 second
- Property status updates reflected in real-time
- 100% data validation on required fields

---

#### 2.2.3 Payment Processing

**Purpose:** Secure rent payment processing and financial tracking.

**Functional Requirements:**

1. **Payment Collection**
   - Stripe integration for payment processing
   - Multiple payment methods (credit, debit, bank transfer, digital wallets)
   - One-time and recurring payments
   - Payment scheduling

2. **Payment History**
   - Complete transaction history
   - Receipt generation (PDF)
   - Payment status tracking (pending, processing, completed, failed, refunded)
   - Late payment identification

3. **Late Fee Management**
   - Automatic late fee calculation
   - Configurable late fee rules
   - Late fee notifications

4. **Financial Reporting**
   - Revenue tracking
   - Expense categorization
   - Profit/loss statements
   - Tax-ready reports

**Data Models:**
```typescript
interface Payment {
  id: string;
  tenantId: string;
  leaseId: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentType: 'rent' | 'security_deposit' | 'utility' | 'late_fee';
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet';
  stripePaymentId?: string;
  receipt_url?: string;
  lateFee?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- Payment processing in < 5 seconds
- 99.9% uptime for payment gateway
- Automatic receipt generation
- Late fee calculation accuracy: 100%
- PCI DSS compliance for payment data

---

#### 2.2.4 Tenant Management

**Purpose:** Tenant dashboard and self-service portal.

**Functional Requirements:**

1. **Tenant Dashboard**
   - At-a-glance lease status
   - Upcoming payment due dates
   - Maintenance request status
   - Notification center

2. **Payment Management**
   - Pay rent online
   - View payment history
   - Manage payment methods
   - Set up auto-pay

3. **Maintenance Requests**
   - Submit maintenance requests with photos
   - Track request status
   - Communicate with landlord/maintenance team
   - Rate completed services

4. **Lease Information**
   - View current lease terms
   - Download lease documents
   - Track lease expiration
   - Respond to renewal offers

5. **Property Search**
   - Browse available properties
   - Save favorite properties
   - Submit rental applications
   - Track application status

**Pages:**
- `TenantDashboard.tsx`
- `TenantLeases.tsx`
- `TenantPayments.tsx`
- `TenantMaintenance.tsx`
- `TenantRenewals.tsx`
- `PropertySearch.tsx`

**Acceptance Criteria:**
- Dashboard loads in < 2 seconds
- Payment submission in < 5 seconds
- Maintenance request submission in < 2 minutes
- Real-time status updates for requests

---

#### 2.2.5 Landlord Management

**Purpose:** Comprehensive landlord portal for property and tenant management.

**Functional Requirements:**

1. **Landlord Dashboard**
   - Property portfolio overview
   - Financial summary (revenue, expenses, profit)
   - Tenant status tracking
   - Upcoming lease expirations
   - Maintenance request queue

2. **Property Management**
   - Add, edit, delete properties
   - Upload property images
   - Manage property listings
   - Track property status

3. **Tenant Management**
   - View tenant profiles
   - Track tenant payment history
   - Manage tenant communications
   - Tenant screening and background checks

4. **Application Review**
   - Review tenant applications
   - Application scoring system
   - Accept/reject applications
   - Request additional documentation

5. **Lease Management**
   - Create new leases
   - Track lease status
   - Manage renewals
   - Generate lease amendments

6. **Financial Tracking**
   - Revenue and expense tracking
   - Profit/loss reporting
   - Tax preparation assistance
   - Financial analytics

7. **Maintenance Coordination**
   - Review maintenance requests
   - Assign to contractors
   - Track maintenance costs
   - Maintenance history per property

**Pages:**
- `LandlordDashboard.tsx`
- `LandlordProperties.tsx`
- `LandlordLeases.tsx`
- `LandlordTenants.tsx`
- `LandlordPayments.tsx`
- `ApplicationList.tsx`
- `LeaseCreationWizard.tsx`

**Acceptance Criteria:**
- Dashboard loads portfolio data in < 3 seconds
- Application scoring accuracy > 90%
- Lease creation wizard completion < 5 minutes
- Real-time financial data updates

---

#### 2.2.6 Agent/Broker CRM

**Purpose:** Sales and client relationship management for real estate agents and brokers.

**Functional Requirements:**

1. **Agent Dashboard**
   - Client pipeline overview
   - Active listings
   - Deal status tracking
   - Performance metrics

2. **Lead Management**
   - Lead capture and scoring
   - Lead prioritization (low, medium, high, critical)
   - AI-powered lead recommendations
   - Lead conversion tracking

3. **Client Management**
   - Client profiles and contact information
   - Interaction history
   - Client preferences
   - Client segmentation

4. **Transaction Pipeline**
   - Deal stages: lead → showing → offer → negotiation → closed
   - Deal health scoring
   - Transaction milestones
   - Commission tracking

5. **Commission Management**
   - Commission calculation
   - Payment tracking
   - Commission reports

6. **Performance Analytics**
   - Sales volume
   - Conversion rates
   - Client satisfaction scores
   - Ranking and leaderboards

7. **Broker Features**
   - Team management
   - Team performance analytics
   - Agent marketplace access
   - Commission structure configuration

**Data Models:**
```typescript
interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'agent' | 'senior-agent' | 'team-lead';
  performance: {
    totalSales: number;
    activeListings: number;
    closedDeals: number;
    clientSatisfactionScore: number;
    conversionRate: number;
  };
  assignedClients: string[];
  commissionStructure: CommissionStructure;
}

interface AgentLead {
  id: string;
  agentId: string;
  leadStatus: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'hot' | 'cold' | 'converted' | 'lost';
  overallScore: number;
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedConversionProbability?: number;
  aiRecommendations?: string;
  nextBestAction?: string;
}
```

**Components:**
- Agent dashboard components in `src/components/agent/`
- Broker dashboard components
- Lead management UI
- Transaction pipeline visualizations

**Acceptance Criteria:**
- Lead scoring accuracy > 85%
- Deal health calculation updates in real-time
- Commission calculations 100% accurate
- Performance metrics update daily

---

#### 2.2.7 Maintenance Request System

**Purpose:** Track and manage property maintenance requests from submission to completion.

**Functional Requirements:**

1. **Request Submission**
   - Tenant-initiated requests
   - Category selection (plumbing, electrical, HVAC, appliance, structural, pest control, other)
   - Priority levels (low, medium, high, urgent)
   - Photo attachments (multiple images)
   - Detailed description

2. **Request Tracking**
   - Status tracking: submitted → acknowledged → scheduled → in_progress → completed
   - Real-time status updates
   - Estimated completion date
   - Assigned contractor/maintenance team

3. **Cost Management**
   - Estimated cost entry
   - Actual cost tracking
   - Cost comparison reports

4. **Communication**
   - Internal notes (landlord-only)
   - Tenant updates
   - Contractor communication

5. **Completion & Feedback**
   - Tenant rating (1-5 stars)
   - Tenant feedback
   - Maintenance history per property

**Data Models:**
```typescript
interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest_control' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed';
  attachments: MaintenanceAttachment[];
  assignedTo?: string;
  scheduledDate?: Date;
  completedDate?: Date;
  estimatedCost?: number;
  actualCost?: number;
  notes: MaintenanceNote[];
  tenantRating?: number;
  tenantFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Acceptance Criteria:**
- Request submission < 2 minutes
- Photo upload supports 5+ images
- Real-time status updates
- Urgent requests flagged automatically
- Average response time < 24 hours

---

#### 2.2.8 Document Management & E-Signatures

**Purpose:** Secure document storage and electronic signature workflows.

**Functional Requirements:**

1. **Document Storage**
   - Upload documents (PDF, DOC, DOCX, images)
   - Supabase Storage integration
   - Folder organization
   - Document tagging
   - Version control

2. **Document Sharing**
   - Permission-based sharing
   - Encrypted temporary links
   - Access logging
   - Link expiration

3. **E-Signature Workflow**
   - Multi-party signing support
   - Email notifications for signature requests
   - Signature tracking dashboard
   - Legal audit trail
   - Signature verification

4. **PDF Generation**
   - Auto-generate PDFs from lease data
   - Receipt generation
   - Report generation

**Services:**
- `documentStorageService.ts` (29KB)
- `eSignatureService.ts` (29KB)
- `documentSharingService.ts`
- `documentVersionService.ts`

**Acceptance Criteria:**
- Document upload < 10 seconds for 10MB files
- E-signature completion in < 5 clicks
- 99.9% uptime for document storage
- Legally compliant electronic signatures (ESIGN Act)

---

#### 2.2.9 Communication & Messaging

**Purpose:** In-app messaging and notification system.

**Functional Requirements:**

1. **In-App Messaging**
   - Direct messaging between users (tenant ↔ landlord, agent ↔ client)
   - Message threads
   - Read receipts
   - Message search

2. **Notification Center**
   - Unified notification view
   - Notification categories (payments, maintenance, leases, messages)
   - Mark as read/unread
   - Notification filtering

3. **Notification Preferences**
   - User-configurable notification settings
   - Channel preferences (email, SMS, in-app)
   - Notification frequency settings

4. **External Notifications**
   - Email notifications (Resend integration)
   - SMS notifications (Twilio integration)
   - Push notifications (PWA)

**Contexts:**
- `MessagingContext.tsx`
- `NotificationContext.tsx`

**Acceptance Criteria:**
- Message delivery in < 2 seconds
- Real-time message updates
- Email delivery rate > 95%
- SMS delivery rate > 98%
- User notification preferences persist correctly

---

#### 2.2.10 Search & Discovery

**Purpose:** Advanced search capabilities across all data types.

**Functional Requirements:**

1. **Full-Text Search**
   - Search properties, tenants, leases, documents
   - Fuzzy matching for typo tolerance
   - Relevance scoring
   - Autocomplete suggestions

2. **Advanced Filtering**
   - Multi-criteria filtering
   - Price range filters
   - Location-based filters
   - Amenity filters
   - Date range filters

3. **Saved Searches**
   - Save search queries
   - Search alerts (email notifications for new matches)
   - Reuse saved searches

4. **Search Analytics**
   - Track search behavior
   - Popular searches
   - Search conversion rates

**Context:**
- `SearchContext.tsx` - Global search state management

**Acceptance Criteria:**
- Search results in < 1 second
- Fuzzy matching handles 1-2 character typos
- Autocomplete suggestions load in < 200ms
- Saved searches persist across sessions

---

#### 2.2.11 Analytics & Reporting

**Purpose:** Business intelligence and data visualization.

**Functional Requirements:**

1. **Property Analytics**
   - Occupancy rates
   - Vacancy rates
   - Property appreciation
   - Rent trends

2. **Financial Reports**
   - Revenue reports
   - Expense reports
   - Profit/loss statements
   - Cash flow analysis

3. **Tenant Analytics**
   - Tenant retention rates
   - Demographics
   - Payment behavior
   - Satisfaction scores

4. **Agent Performance**
   - Sales volume
   - Conversion rates
   - Commission earned
   - Client acquisition cost

5. **Market Intelligence**
   - Market trends
   - Comparable properties
   - Pricing recommendations

6. **Dashboard Widgets**
   - Customizable analytics widgets
   - Real-time data visualization (Recharts)
   - Export reports (CSV, PDF)

**Services:**
- `analyticsService.ts` (18KB)
- `dealHealthService.ts` (12KB)
- `agentPerformanceService.ts`
- `marketTrends.ts`

**Acceptance Criteria:**
- Dashboard loads analytics in < 3 seconds
- Reports generate in < 5 seconds
- 100% data accuracy
- Export formats: CSV, PDF

---

#### 2.2.12 Tax Preparation Center

**Purpose:** Simplified tax preparation for landlords.

**Functional Requirements:**

1. **Income Tracking**
   - Monthly rent collection summary
   - Other income sources
   - Year-to-date totals

2. **Expense Categorization**
   - Mortgage interest
   - Property tax
   - Insurance
   - Utilities
   - Maintenance and repairs
   - Management fees
   - Depreciation

3. **Deduction Calculation**
   - Automatic deduction calculation
   - Depreciation schedules
   - Itemized deductions

4. **Tax Report Generation**
   - Schedule E preparation
   - Tax summary reports
   - Export to tax software (TurboTax, TaxAct)

**Context:**
- `TaxPreparationContext.tsx`

**Services:**
- `landlordTaxService.ts`

**Acceptance Criteria:**
- Categorize 100% of expenses correctly
- Depreciation calculations per IRS guidelines
- Tax reports match accounting standards
- Export to tax software without errors

---

#### 2.2.13 Automation & Workflows

**Purpose:** Automated business processes and reminders.

**Functional Requirements:**

1. **Automated Notifications**
   - Payment due reminders (7, 3, 1 day before)
   - Lease expiration reminders (90, 60, 30 days)
   - Maintenance escalation (overdue requests)
   - Application status updates

2. **Scheduled Tasks**
   - Recurring payment processing
   - Late fee application
   - Report generation

3. **Bulk Operations**
   - Bulk property updates
   - Bulk tenant notifications
   - Batch processing

**Services:**
- `automationService.ts`

**Acceptance Criteria:**
- Notifications sent on schedule with 100% reliability
- Late fees applied accurately at configured times
- Bulk operations process 100+ records efficiently

---

#### 2.2.14 Advanced Features

##### A. Blockchain Integration (Casper Network)

**Purpose:** Decentralized payments, lease agreements, and immutable contract signing via Casper Blockchain.

**Status:** Production-Ready Integration

**Location:** `src/lib/blockchain/`, `src/types/blockchain.ts`

**Technology Stack:**
- **Blockchain:** Casper Network
- **Wallet Integration:** CSPR.click SDK (Casper Wallet)
- **SDK:** casper-js-sdk (JavaScript/TypeScript SDK)
- **API:** CSPR.cloud API for transaction submission and monitoring
- **Backend Integration:** Rust + Casper SDK for event indexing

---

#### Blockchain Features

**1. Wallet Connection**
- **Implementation:** Frontend via CSPR.click SDK
- **User Flow:**
  - User clicks "Connect Wallet"
  - CSPR.click browser extension opens
  - User authorizes connection
  - Public key and account hash stored in app state

**Supported Wallets:**
- Casper Wallet (CSPR.click)
- Casper Signer
- Ledger hardware wallet support

**2. Blockchain Payments**
- **Use Case:** Pay rent, security deposits, and fees using CSPR tokens
- **Implementation:** Frontend initiates payment via casper-js-sdk
- **Flow:**
  1. User selects "Pay with Crypto" option
  2. Amount converted from USD to CSPR (live exchange rate)
  3. Transaction created and signed via wallet
  4. Deploy submitted to Casper Node via CSPR.cloud API
  5. Frontend monitors transaction status via WebSocket
  6. Backend indexer captures event and updates payment record

**Transaction Types:**
- Native CSPR transfers (rent payments)
- Smart contract calls (complex payment logic)
- Multi-signature payments (co-tenant rent splitting)

**3. Blockchain Lease Signing**
- **Use Case:** Immutable, decentralized lease agreement signatures
- **Implementation:**
  - Lease document hash stored on-chain
  - Signatures recorded as blockchain transactions
  - Timestamped proof of signing

**Workflow:**
  1. Landlord creates lease agreement (off-chain)
  2. Document hash (SHA-256) generated
  3. Hash submitted to Casper smart contract
  4. Tenant receives signing request
  5. Tenant signs via Casper Wallet
  6. Signature transaction recorded on-chain
  7. All parties receive immutable proof

**4. Smart Contract Interactions**
- **Lease Registry Contract:** Store lease hashes and signatures
- **Payment Escrow Contract:** Hold security deposits in escrow
- **Multi-sig Contract:** Require multiple parties for actions

**5. Transaction Monitoring**
- **Frontend:** Real-time status via CSPR.cloud WebSocket
- **Backend:** Polling Casper Node RPC for job completion
- **Status Tracking:** pending → processing → success/failed
- **Transaction Explorer:** Link to Casper blockchain explorer

#### User Experience Flow

**Example: Paying Rent with CSPR**

1. **Tenant Dashboard:**
   - Sees "Rent Due: $1,200"
   - Clicks "Pay Now"
   - Selects "Pay with Crypto (CSPR)"

2. **Payment Screen:**
   - Shows: "1,200 USD = 15,000 CSPR" (live rate)
   - Displays estimated gas fee: "~2.5 CSPR"
   - Button: "Connect Wallet"

3. **Wallet Connection:**
   - CSPR.click extension opens
   - User authorizes connection
   - Balance displayed: "25,000 CSPR available"

4. **Transaction Confirmation:**
   - User reviews payment details
   - Clicks "Confirm Payment"
   - Wallet prompts for signature
   - User signs transaction

5. **Processing:**
   - "Transaction submitted to Casper Network"
   - Shows deploy hash with explorer link
   - Real-time status updates via WebSocket
   - Progress: Pending → Processing → Confirmed

6. **Completion:**
   - ✅ "Payment confirmed! (3 confirmations)"
   - Receipt generated with blockchain proof
   - Landlord receives notification
   - Payment marked as paid in database

**Example: Signing Lease on Blockchain**

1. **Landlord creates lease** (traditional flow)
2. **Lease ready for signatures**
3. **Tenant receives notification:** "Sign lease on blockchain"
4. **Tenant clicks "Sign with Blockchain":**
   - Document hash shown: `0x7f8a3b2c...`
   - Blockchain signature provides:
     - Immutability (cannot be altered)
     - Timestamped proof
     - Public verifiability
5. **Wallet prompts signature**
6. **Transaction submitted** → On-chain signature recorded
7. **All parties receive blockchain proof** with explorer link

---

#### Components

**Blockchain Components:**
- `WalletConnectButton.tsx` - Wallet connection UI
- `BlockchainPaymentForm.tsx` - Crypto payment interface
- `TransactionMonitor.tsx` - Real-time TX status
- `BlockchainSignatureWidget.tsx` - On-chain signing UI
- `CasperExplorerLink.tsx` - Link to blockchain explorer
- `GasFeeEstimator.tsx` - Display estimated fees
- `ExchangeRateDisplay.tsx` - USD ↔ CSPR conversion

**Services:**
- `casperWalletService.ts` - Wallet connection and signing
- `blockchainPaymentService.ts` - Payment processing
- `blockchainLeaseService.ts` - Lease signature on-chain
- `casperExchangeRateService.ts` - Live price feeds
- `gasFeeEstimator.ts` - Gas calculation

**Hooks:**
- `useCasperWallet()` - Wallet state management
- `useBlockchainTransaction()` - Transaction tracking
- `useExchangeRate()` - Live CSPR/USD rate
- `useGasFee()` - Estimate transaction costs

---

#### Acceptance Criteria

**Wallet Integration:**
- ✅ Users can connect Casper Wallet in < 3 clicks
- ✅ Wallet balance displays correctly
- ✅ Connection persists across page refreshes
- ✅ Disconnection clears all wallet data

**Blockchain Payments:**
- ✅ Payment creation in < 10 seconds
- ✅ Real-time transaction status updates
- ✅ 99%+ transaction success rate (excluding user rejections)
- ✅ Accurate USD ↔ CSPR conversion (±1% accuracy)
- ✅ Gas fee estimation within 10% of actual cost

**Lease Signatures:**
- ✅ Document hash generated correctly (SHA-256)
- ✅ Signature recorded on-chain within 2 minutes
- ✅ Blockchain proof visible to all parties
- ✅ Explorer link functional

**Backend Indexer:**
- ✅ Event indexing latency < 60 seconds
- ✅ 100% event capture accuracy
- ✅ Database synchronized with blockchain state
- ✅ Full sync completes within 48 hours

##### B. AI Features

**Purpose:** AI-driven insights and recommendations.

**Features:**
- AI clause suggestions for leases
- Lead scoring with machine learning
- Market trend prediction
- Compliance checking

**Components:**
- `AIClauseSuggestionEngine.tsx`

##### C. Progressive Web App (PWA)

**Purpose:** Mobile-friendly, installable web application.

**Features:**
- Offline functionality
- Install prompt
- Service worker caching
- Push notifications

**Configuration:** `vite.config.ts` (VitePWA plugin)

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### 3.1 Performance

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Page Load Time** | < 2 seconds | < 3 seconds |
| **API Response Time** | < 500ms | < 1 second |
| **Search Results** | < 1 second | < 2 seconds |
| **Payment Processing** | < 5 seconds | < 10 seconds |
| **Dashboard Refresh** | < 3 seconds | < 5 seconds |
| **Real-time Updates** | < 200ms latency | < 500ms |
| **File Upload** | < 10s for 10MB | < 20s |

**Optimization Strategies:**
- Code splitting and lazy loading
- React Query caching
- Image optimization
- Bundle size optimization (vendor chunking)
- Service worker caching (5MB cache limit)

### 3.2 Scalability

**Current Capacity:**
- Support 10,000+ concurrent users
- Handle 1,000+ properties per landlord
- Process 100,000+ transactions per month

**Scalability Considerations:**
- Horizontal scaling via Vercel edge functions
- Database query optimization (Supabase)
- CDN for static assets
- Lazy loading for large data sets
- Pagination and virtual scrolling

### 3.3 Security

**Authentication:**
- PKCE OAuth flow
- Session auto-refresh (5-minute intervals)
- MFA support
- Secure session storage

**Data Security:**
- HTTPS/TLS for all communications
- Input validation with Zod schemas
- SQL injection prevention (Supabase RLS)
- XSS protection (React's built-in escaping)
- CORS configuration

**Document Security:**
- Encrypted document links
- Permission-based access control
- Access logging
- Time-limited document URLs

**Compliance:**
- ESIGN Act compliant e-signatures
- GDPR considerations (data export, deletion)
- PCI DSS compliance for payments (Stripe)

### 3.4 Usability

**Design Principles:**
- Mobile-first responsive design
- Intuitive navigation
- Consistent UI patterns (shadcn/ui)
- Contextual help and tooltips

**Accessibility (WCAG 2.1 AA):**
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Focus management
- ARIA labels and descriptions
- Skip navigation links

**Browser Support:**
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

### 3.5 Maintainability

**Code Quality:**
- TypeScript strict mode
- ESLint configuration
- Consistent code style
- Modular architecture

**Documentation:**
- Inline code comments
- README documentation
- API documentation
- Type definitions serve as documentation

**Testing:**
- Unit tests with Vitest
- E2E tests with Playwright
- Component testing with React Testing Library
- Test coverage target: > 70%

## 4. SYSTEM ARCHITECTURE

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐          │
│  │   Pages    │  │ Components │  │   Contexts   │          │
│  │  (Routes)  │  │   (UI)     │  │   (State)    │          │
│  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘          │
│        │                │                 │                   │
│  ┌─────▼────────────────▼─────────────────▼───────┐         │
│  │              Custom Hooks Layer                 │         │
│  └─────┬───────────────────────────────────────────┘         │
│        │                                                      │
│  ┌─────▼────────────────────────────────────────────┐       │
│  │           Service Layer (Business Logic)         │       │
│  └─────┬────────────────────────────────────────────┘       │
│        │                                                      │
└────────┼──────────────────────────────────────────────────┘
         │
┌────────▼─────────────────────────────────────────────────┐
│              API & Integration Layer                      │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Supabase │  │  Stripe  │  │  Twilio  │  │  Resend  │ │
│  │Auth/DB  │  │ Payment  │  │   SMS    │  │  Email   │ │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Component Architecture

**Layer 1: Pages** (`src/pages/`)
- Route-level components
- Page-specific logic
- Layout composition

**Layer 2: Feature Components** (`src/components/`)
- Business logic components
- Feature-specific UI
- Reusable feature modules

**Layer 3: UI Components** (`src/components/ui/`)
- Primitive components (shadcn/ui)
- Design system components
- No business logic

**Layer 4: Hooks** (`src/hooks/`)
- Reusable business logic
- State management
- Side effects

**Layer 5: Contexts** (`src/contexts/`)
- Global state management
- Cross-component state sharing

**Layer 6: Services** (`src/services/`)
- API calls
- Business logic
- Data transformations

### 4.3 State Management Architecture

**Client State:**
- React Context API for global UI state
- Component state (useState) for local state
- Custom hooks for shared logic

**Server State:**
- React Query (TanStack Query) for API data caching
- Automatic refetching
- Optimistic updates
- Cache invalidation

**Real-time State:**
- Supabase real-time subscriptions
- WebSocket connections
- Live updates for notifications, messages, maintenance requests

### 4.4 Data Flow

```
User Interaction
      ↓
   Component
      ↓
Custom Hook (useAuth, useLease, etc.)
      ↓
Service Layer (leaseManagementService)
      ↓
API Client (Supabase, Stripe, etc.)
      ↓
Backend API
      ↓
Database / External Service
      ↓
Response → Service → Hook → Component → UI Update
```

### 4.5 API Integration Architecture

**Primary API:** Supabase

**Authentication:**
- Supabase Auth with PKCE flow
- Session management
- Auto-refresh tokens

**Database:**
- PostgreSQL via Supabase
- Row-Level Security (RLS)
- Type-safe queries

**Storage:**
- Supabase Storage for documents/images
- Signed URLs for secure access

**Real-time:**
- Supabase real-time channels
- Database change listeners

**External APIs:**
- Stripe (payments)
- Twilio (SMS)
- Resend (email)
- Google Maps (location)

---

## 5. TECHNICAL SPECIFICATIONS

### 5.1 Project Structure

```
2025_anthony_leasefi_frontend/
├── src/
│   ├── components/          # 79+ feature components
│   │   ├── ui/             # 30+ shadcn/ui primitives
│   │   ├── lease/          # Lease management components
│   │   ├── dashboard/      # Dashboard layouts
│   │   ├── payment/        # Payment processing
│   │   ├── property/       # Property management
│   │   ├── tenant/         # Tenant-specific
│   │   ├── landlord/       # Landlord-specific
│   │   ├── agent/          # Agent CRM
│   │   ├── messaging/      # Communication
│   │   ├── maintenance/    # Maintenance requests
│   │   ├── documents/      # Document management
│   │   ├── signatures/     # E-signatures
│   │   ├── tax/            # Tax center
│   │   └── [15+ other domains]
│   ├── pages/              # 82+ page components
│   │   ├── auth/           # Authentication
│   │   ├── tenant/         # Tenant pages
│   │   ├── landlord/       # Landlord pages
│   │   ├── dashboard/      # Dashboard pages
│   │   └── [other routes]
│   ├── contexts/           # 21 React Context providers
│   ├── hooks/              # 53 custom hooks
│   ├── services/           # 70 service modules
│   ├── types/              # 51+ TypeScript types
│   ├── lib/                # Core libraries
│   │   ├── supabase/       # Supabase client
│   │   ├── api/            # API layer
│   │   ├── auth/           # Auth utilities
│   │   ├── blockchain/     # Blockchain (optional)
│   │   └── utils/          # Utilities
│   ├── utils/              # 22 utility functions
│   ├── layouts/            # Layout components
│   ├── providers/          # Provider setup
│   ├── styles/             # Global CSS
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── docs/                   # Documentation
├── tests/                  # Integration tests
├── e2e/                    # Playwright E2E tests
├── index.html              # HTML entry
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind config
├── package.json            # Dependencies
└── vercel.json             # Vercel config
```

## 6. TESTING REQUIREMENTS

### 6.1 Testing Strategy

**Test Pyramid:**
```
        E2E Tests (10%)
       ──────────────
      Integration Tests (20%)
     ─────────────────────────
    Unit Tests (70%)
   ───────────────────────────────
```

### 6.2 Unit Testing

**Framework:** Vitest + React Testing Library

**Coverage Targets:**
- Overall: > 70%
- Critical paths: > 90%
- Services: > 80%
- Hooks: > 75%
- Components: > 60%

**Test Locations:**
- `src/components/__tests__/`
- `src/hooks/__tests__/`
- `src/services/__tests__/`
- `src/contexts/__tests__/`

**Commands:**
```bash
pnpm run test:unit         # Run all tests
pnpm run test:watch        # Watch mode
pnpm run test:ui           # Vitest UI dashboard
pnpm run test:coverage     # Coverage report
```

### 6.3 End-to-End Testing

**Framework:** Playwright

**Test Coverage:**
- Critical user flows (login, payment, lease creation)
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile responsive testing

**Test Locations:**
- `tests/`
- `playwright-report/`

**Commands:**
```bash
pnpm run test:e2e          # Run E2E tests
pnpm run test:e2e:ui       # Playwright UI
pnpm run test:e2e:headed   # Headed mode
pnpm run test:e2e:debug    # Debug mode
```

### 6.4 Integration Testing

**Framework:** Vitest

**Focus:**
- API integration tests
- Context provider tests
- Service layer tests

**Command:**
```bash
pnpm run test:integration
```

### 6.5 Manual Testing

**Required for:**
- Payment processing flows
- E-signature workflows
- File uploads
- Real-time notifications

**Test Checklist:**
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness (iOS, Android)
- Accessibility (keyboard navigation, screen readers)
- Performance (Lighthouse audits)

---

## 8. SCOPE BOUNDARIES

### 8.1 In Scope

**Core Features:**
- ✅ Lease management (creation, signing, renewal)
- ✅ Property management (listings, CRUD)
- ✅ Payment processing (Stripe integration)
- ✅ Tenant portal (dashboard, payments, maintenance)
- ✅ Landlord portal (properties, tenants, finances)
- ✅ Agent/Broker CRM (leads, deals, commissions)
- ✅ Maintenance request system
- ✅ Document management and e-signatures
- ✅ Communication and messaging
- ✅ Search and discovery
- ✅ Analytics and reporting
- ✅ Tax preparation center
- ✅ Automation and workflows

**Technical Features:**
- ✅ Role-based access control
- ✅ Real-time updates (Supabase)
- ✅ PWA support
- ✅ Mobile responsive design
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ TypeScript type safety
- ✅ Unit and E2E testing

### 8.2 Out of Scope

**Not Included:**
- ❌ Native mobile apps (iOS, Android)
- ❌ Backend development (separate project)
- ❌ Database schema design (Supabase handles)
- ❌ Multi-language support (i18n not implemented)
- ❌ Blockchain features (optional, not production-ready)
- ❌ AI model training (uses pre-built AI services)
- ❌ Marketing website (separate project)
- ❌ Admin panel for system configuration (limited admin features)
- ❌ Offline-first architecture (partial offline support only)

### 8.3 Future Enhancements

**Phase 2 (Planned):**
- Advanced analytics with business intelligence
- AI features expansion (predictive analytics)
- Blockchain integration (production-ready)
- Multi-language support (i18n)
- Native mobile apps

**Phase 3 (Future):**
- API marketplace for third-party integrations
- White-label solution for property management companies
- Multi-tenant architecture
- Enterprise features (SSO, audit logs)
