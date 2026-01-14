# Landlord Tax Preparation Features - Technical Specification

**Version:** 1.0  
**Date:** December 3, 2024  
**Author:** Engineering Team  
**Status:** Draft - Awaiting Approval

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Data Models & Type Definitions](#3-data-models--type-definitions)
4. [Component Specifications](#4-component-specifications)
5. [API & Integration Layer](#5-api--integration-layer)
6. [Security & Compliance](#6-security--compliance)
7. [Implementation Phases](#7-implementation-phases)
8. [Testing Strategy](#8-testing-strategy)
9. [Performance Considerations](#9-performance-considerations)
10. [Deployment Plan](#10-deployment-plan)

---

## 1. Executive Summary

### 1.1 Purpose
Add comprehensive tax preparation capabilities to the Landlord Dashboard, enabling landlords to organize rental income and expenses, generate IRS-compliant tax documents, track depreciation, and collaborate with tax professionals—all while maintaining full backward compatibility with existing features.

### 1.2 Goals
- **Automate** income and expense categorization using IRS Schedule E categories
- **Generate** tax documents (Schedule E, Form 8825, Form 1099) with one-click export
- **Track** depreciation schedules and capital improvements for each property
- **Provide** AI-powered tax guidance and deduction optimization
- **Enable** secure collaboration with CPAs and accountants
- **Maintain** 100% backward compatibility with existing dashboard features

### 1.3 Success Metrics
- 90%+ reduction in manual tax data entry time
- 95%+ accuracy in automated expense categorization
- 100% IRS compliance for generated tax documents
- Zero regression bugs in existing dashboard functionality
- 80%+ user adoption rate within 3 months of launch

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Landlord Dashboard                        │
│  ┌──────────┬──────────┬──────────┬─────────────────────┐  │
│  │ Overview │ Analytics│ Predictive│  ... (8 more tabs)  │  │
│  └──────────┴──────────┴──────────┴─────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            NEW: Tax Preparation Tab                    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Tax Dashboard (Main Hub)                       │  │  │
│  │  │  - Year-end summary                             │  │  │
│  │  │  - Quick actions                                │  │  │
│  │  │  - Deduction tracker                            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  Sub-tabs:                                              │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┐        │  │
│  │  │ Income & │Documents │Deprecia- │ AI       │        │  │
│  │  │ Expenses │          │tion      │Assistant │        │  │
│  │  └──────────┴──────────┴──────────┴──────────┘        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Tax Preparation Context                     │
│  - State management for tax data                             │
│  - Tax calculation engine                                    │
│  - Document generation orchestration                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Existing Data Layer (Enhanced)                  │
│  ┌─────────────────────┬──────────────────────────────┐    │
│  │ LandlordManagement  │  Property & Expense Data     │    │
│  │ Context (Extended)  │  (Enhanced with tax fields)  │    │
│  └─────────────────────┴──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ IRS API  │ OCR      │ AI/ML    │ Export   │ Bank     │  │
│  │ (Future) │ Service  │ Models   │ Services │ Feeds    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Hierarchy

```
src/
├── components/
│   └── landlord/                    # NEW: Tax preparation components
│       ├── TaxDashboard.tsx         # Main tax hub
│       ├── IncomeExpenseTracker.tsx # Transaction management
│       ├── TaxDocumentGenerator.tsx # Form generation
│       ├── DepreciationCalculator.tsx
│       ├── TaxDeductionOptimizer.tsx
│       ├── ReceiptScanner.tsx
│       ├── TaxReportExporter.tsx
│       ├── PropertyTaxCalendar.tsx
│       ├── CPACollaborationPortal.tsx
│       ├── TaxComplianceChecker.tsx
│       ├── TaxEducationCenter.tsx
│       └── AITaxAssistant.tsx
│
├── contexts/
│   ├── LandlordManagementContext.tsx # ENHANCED: Add tax methods
│   └── TaxPreparationContext.tsx     # NEW: Tax-specific state
│
├── types/
│   ├── clientLandlord.ts            # ENHANCED: Add tax fields
│   └── landlordTax.ts               # NEW: Tax type definitions
│
├── lib/
│   ├── taxCalculations.ts           # NEW: Tax calculation utilities
│   ├── scheduleEGenerator.ts        # NEW: Schedule E logic
│   ├── form1099Generator.ts         # NEW: Form 1099 logic
│   └── depreciationEngine.ts        # NEW: Depreciation calculations
│
└── pages/
    └── LandlordDashboard.tsx        # ENHANCED: Add Tax Prep tab
```

### 2.3 Data Flow

```
User Action (e.g., "Generate Schedule E")
    │
    ▼
TaxDocumentGenerator Component
    │
    ├──> TaxPreparationContext.generateScheduleE()
    │       │
    │       ├──> Fetch property data from LandlordManagementContext
    │       ├──> Fetch income/expense data (filtered by tax year)
    │       ├──> Apply tax categorization rules
    │       ├──> Calculate depreciation (depreciationEngine.ts)
    │       ├──> Run compliance checks
    │       │
    │       ▼
    │    scheduleEGenerator.ts
    │       │
    │       ├──> Build IRS-compliant Schedule E structure
    │       ├──> Populate line items (income, expenses, depreciation)
    │       ├──> Calculate totals and net income
    │       │
    │       ▼
    │    PDF Generation Service
    │       │
    │       └──> Return PDF blob
    │
    ▼
Display/Download PDF to User
```

---

## 3. Data Models & Type Definitions

### 3.1 New Type Definitions (`src/types/landlordTax.ts`)

```typescript
// ============================================================================
// Tax Categories (IRS Schedule E)
// ============================================================================

export type ScheduleECategory =
  | 'advertising'
  | 'auto-travel'
  | 'cleaning-maintenance'
  | 'commissions'
  | 'insurance'
  | 'legal-professional'
  | 'management-fees'
  | 'mortgage-interest'
  | 'other-interest'
  | 'repairs'
  | 'supplies'
  | 'taxes'
  | 'utilities'
  | 'depreciation'
  | 'other';

export interface TaxCategory {
  id: string;
  name: string;
  scheduleELine: number; // Line number on Schedule E
  description: string;
  examples: string[];
  isDeductible: boolean;
  requiresDocumentation: boolean;
}

// ============================================================================
// Tax Documents
// ============================================================================

export interface TaxDocument {
  id: string;
  landlordId: string;
  taxYear: number;
  documentType: TaxDocumentType;
  status: TaxDocumentStatus;
  
  // Content
  data: ScheduleEData | Form1099Data | Form8825Data;
  pdfUrl?: string;
  
  // Metadata
  generatedAt: Date;
  generatedBy: string;
  lastModified: Date;
  version: number;
  
  // Export tracking
  exportedTo?: ('turbotax' | 'quickbooks' | 'xero' | 'hrblock')[];
  exportedAt?: Date;
}

export type TaxDocumentType = 
  | 'schedule-e'
  | 'form-1099-misc'
  | 'form-1099-nec'
  | 'form-8825'
  | 'depreciation-schedule'
  | 'tax-summary';

export type TaxDocumentStatus =
  | 'draft'
  | 'ready-for-review'
  | 'reviewed'
  | 'filed'
  | 'amended';

// ============================================================================
// Schedule E Data Structure
// ============================================================================

export interface ScheduleEData {
  taxYear: number;
  landlordInfo: {
    name: string;
    ssn: string;
    address: string;
  };
  
  properties: ScheduleEProperty[];
  
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalDepreciation: number;
    netIncome: number;
  };
  
  // Multi-property summary
  summary: {
    numberOfProperties: number;
    totalRentalDays: number;
    personalUseDays: number;
  };
}

export interface ScheduleEProperty {
  propertyId: string;
  address: string;
  propertyType: 'single-family' | 'multi-family' | 'condo' | 'townhouse' | 'other';
  
  // Income (Line 3)
  income: {
    rentsReceived: number;
    royaltiesReceived: number;
  };
  
  // Expenses (Lines 5-19)
  expenses: {
    advertising: number;
    auto: number;
    cleaning: number;
    commissions: number;
    insurance: number;
    legal: number;
    management: number;
    mortgageInterest: number;
    otherInterest: number;
    repairs: number;
    supplies: number;
    taxes: number;
    utilities: number;
    depreciation: number;
    other: { description: string; amount: number }[];
  };
  
  // Calculations
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  
  // Days rented
  daysRented: number;
  personalUseDays: number;
  fairRentalDays: number;
}

// ============================================================================
// Form 1099 Data Structure
// ============================================================================

export interface Form1099Data {
  taxYear: number;
  landlordInfo: {
    name: string;
    ein: string;
    address: string;
    phone: string;
  };
  
  recipients: Form1099Recipient[];
}

export interface Form1099Recipient {
  id: string;
  recipientType: '1099-MISC' | '1099-NEC';
  
  // Recipient info
  name: string;
  ssn: string;
  address: string;
  
  // Payment info
  totalPayments: number;
  paymentCategory: 'rent' | 'services' | 'other-income';
  
  // Box assignments (for 1099-MISC)
  box1Rents?: number;
  box3OtherIncome?: number;
  
  // Box assignments (for 1099-NEC)
  box1NonemployeeCompensation?: number;
  
  // Tracking
  payments: {
    date: Date;
    amount: number;
    description: string;
  }[];
  
  status: 'draft' | 'ready-to-file' | 'filed';
  filedDate?: Date;
}

// ============================================================================
// Depreciation Tracking
// ============================================================================

export interface DepreciationSchedule {
  id: string;
  propertyId: string;
  assetType: 'building' | 'improvement' | 'equipment' | 'furniture';
  
  // Asset details
  description: string;
  dateAcquired: Date;
  datePlacedInService: Date;
  
  // Cost basis
  originalCost: number;
  landValue: number; // Not depreciable
  depreciableBasis: number;
  
  // Depreciation method
  method: 'MACRS' | 'SL' | 'ADS';
  recoveryPeriod: number; // 27.5 years for residential rental
  convention: 'mid-month' | 'half-year' | 'mid-quarter';
  
  // Annual depreciation
  annualDepreciation: number;
  accumulatedDepreciation: number;
  remainingBasis: number;
  
  // Yearly breakdown
  yearlyDepreciation: {
    year: number;
    depreciation: number;
    accumulatedDepreciation: number;
    remainingBasis: number;
  }[];
  
  // Status
  isActive: boolean;
  disposalDate?: Date;
  disposalMethod?: 'sale' | 'exchange' | 'abandonment';
}

export interface CapitalImprovement {
  id: string;
  propertyId: string;
  
  // Improvement details
  description: string;
  category: 'roof' | 'hvac' | 'plumbing' | 'electrical' | 'structural' | 'landscaping' | 'other';
  
  // Cost tracking
  totalCost: number;
  dateCompleted: Date;
  datePlacedInService: Date;
  
  // Depreciation
  depreciationScheduleId: string;
  isDepreciable: boolean;
  
  // Documentation
  invoices: string[]; // Document IDs
  photos: string[];
  
  // Tax treatment
  isBonusDepreciationEligible: boolean;
  isSection179Eligible: boolean;
}

// ============================================================================
// Tax Deductions & Optimization
// ============================================================================

export interface TaxDeduction {
  id: string;
  category: ScheduleECategory;
  amount: number;
  description: string;
  
  // Source tracking
  propertyId?: string;
  expenseId?: string;
  
  // Documentation
  hasReceipt: boolean;
  receiptUrl?: string;
  
  // AI insights
  suggestedByAI: boolean;
  confidence?: number;
  reasoning?: string;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'needs-review';
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface TaxOptimizationSuggestion {
  id: string;
  type: 'missed-deduction' | 'categorization-error' | 'depreciation-opportunity' | 'timing-strategy';
  priority: 'high' | 'medium' | 'low';
  
  title: string;
  description: string;
  potentialSavings: number;
  
  // Action items
  actionRequired: string;
  implementationSteps: string[];
  
  // Related data
  relatedExpenseIds?: string[];
  relatedPropertyIds?: string[];
  
  // Status
  status: 'new' | 'in-progress' | 'completed' | 'dismissed';
  dismissedReason?: string;
}

// ============================================================================
// Tax Year Summary
// ============================================================================

export interface TaxYearSummary {
  landlordId: string;
  taxYear: number;
  
  // Income summary
  totalRentalIncome: number;
  totalOtherIncome: number;
  totalIncome: number;
  
  // Expense summary by category
  expensesByCategory: {
    category: ScheduleECategory;
    amount: number;
    transactionCount: number;
  }[];
  totalExpenses: number;
  
  // Depreciation
  totalDepreciation: number;
  
  // Net income
  netRentalIncome: number;
  
  // Property breakdown
  propertySummaries: {
    propertyId: string;
    address: string;
    income: number;
    expenses: number;
    depreciation: number;
    netIncome: number;
  }[];
  
  // Tax documents
  documentsGenerated: TaxDocument[];
  
  // Compliance
  complianceScore: number;
  outstandingIssues: string[];
  
  // Metadata
  lastUpdated: Date;
  isComplete: boolean;
}

// ============================================================================
// Tax Reminders & Calendar
// ============================================================================

export interface TaxReminder {
  id: string;
  landlordId: string;
  type: TaxReminderType;
  
  title: string;
  description: string;
  dueDate: Date;
  
  // Related entities
  propertyIds?: string[];
  taxYear?: number;
  
  // Status
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
  completedAt?: Date;
  
  // Notifications
  notificationsSent: Date[];
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    daysBefore: number[];
  };
}

export type TaxReminderType =
  | 'quarterly-estimated-tax'
  | 'property-tax-payment'
  | 'insurance-renewal'
  | 'tax-return-deadline'
  | 'document-collection'
  | 'depreciation-review'
  | '1099-filing-deadline';

// ============================================================================
// CPA Collaboration
// ============================================================================

export interface CPAAccess {
  id: string;
  landlordId: string;
  
  // CPA details
  cpaInfo: {
    name: string;
    email: string;
    phone: string;
    firm: string;
    licenseNumber: string;
  };
  
  // Access control
  permissions: {
    viewFinancials: boolean;
    viewDocuments: boolean;
    generateReports: boolean;
    editCategories: boolean;
    approveDeductions: boolean;
  };
  
  // Scope
  accessLevel: 'full' | 'limited' | 'view-only';
  propertyIds?: string[]; // If limited access
  taxYears?: number[]; // If limited access
  
  // Status
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  invitedAt: Date;
  acceptedAt?: Date;
  expiresAt?: Date;
  
  // Audit trail
  activityLog: {
    timestamp: Date;
    action: string;
    details: string;
  }[];
}

// ============================================================================
// Export & Integration
// ============================================================================

export interface TaxExportConfig {
  id: string;
  landlordId: string;
  
  exportType: 'turbotax' | 'quickbooks' | 'xero' | 'hrblock' | 'csv' | 'pdf';
  
  // Export settings
  includeAttachments: boolean;
  includeReceipts: boolean;
  format: 'standard' | 'detailed' | 'summary';
  
  // Field mapping (for accounting software)
  fieldMappings?: {
    sourceField: string;
    targetField: string;
  }[];
  
  // Last export
  lastExportDate?: Date;
  lastExportStatus?: 'success' | 'failed' | 'partial';
  lastExportError?: string;
}

// ============================================================================
// AI Tax Assistant
// ============================================================================

export interface TaxQuestion {
  id: string;
  landlordId: string;
  
  question: string;
  context?: {
    propertyId?: string;
    taxYear?: number;
    category?: ScheduleECategory;
  };
  
  answer: string;
  confidence: number;
  sources: string[];
  
  // Feedback
  wasHelpful?: boolean;
  feedback?: string;
  
  timestamp: Date;
}

export interface TaxKnowledgeBase {
  id: string;
  category: 'deductions' | 'depreciation' | 'compliance' | 'forms' | 'strategy';
  
  title: string;
  content: string;
  keywords: string[];
  
  // Applicability
  applicableStates?: string[];
  taxYears?: number[];
  
  // Metadata
  source: string;
  lastUpdated: Date;
  isVerified: boolean;
}
```

### 3.2 Enhanced Existing Types

```typescript
// ENHANCED: src/types/clientLandlord.ts

export interface PropertyExpense {
  id: string;
  type: 'maintenance' | 'insurance' | 'taxes' | 'utilities' | 'management' | 'other';
  amount: number;
  date: Date;
  description: string;
  recurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'annually';
  
  // NEW: Tax-related fields
  taxCategory?: ScheduleECategory;
  taxYear?: number;
  isDeductible?: boolean;
  isCapitalImprovement?: boolean;
  receiptUrl?: string;
  hasReceipt?: boolean;
  aiCategorized?: boolean;
  aiConfidence?: number;
}

export interface Property {
  id: string;
  landlordId: string;
  agentId: string;
  brokerId: string;
  tenantIds: string[];
  details: PropertyDetails;
  status: 'available' | 'rented' | 'sold' | 'pending' | 'maintenance';
  listingDate: Date;
  lastUpdated: Date;
  financialInfo: {
    monthlyIncome?: number;
    expenses: PropertyExpense[];
    taxInfo?: TaxInformation;
    
    // NEW: Enhanced tax tracking
    depreciationSchedules?: DepreciationSchedule[];
    capitalImprovements?: CapitalImprovement[];
    purchaseInfo?: {
      purchaseDate: Date;
      purchasePrice: number;
      landValue: number;
      closingCosts: number;
    };
  };
}

export interface TaxInformation {
  assessedValue: number;
  annualTaxes: number;
  exemptions: string[];
  lastAssessment: Date;
  
  // NEW: Enhanced tax fields
  taxYear?: number;
  depreciableBasis?: number;
  accumulatedDepreciation?: number;
  section179Deduction?: number;
  bonusDepreciation?: number;
}
```

---

## 4. Component Specifications

### 4.1 TaxDashboard.tsx (Main Hub)

**Purpose:** Central hub for all tax preparation activities with year-end summary and quick actions.

**Props:**
```typescript
interface TaxDashboardProps {
  landlordId: string;
  selectedTaxYear: number;
  onTaxYearChange: (year: number) => void;
}
```

**Key Features:**
1. **Tax Year Selector** - Dropdown to switch between tax years (current and past 7 years)
2. **Summary Cards** - Display key metrics:
   - Total rental income
   - Total deductible expenses
   - Net rental income
   - Estimated tax liability
   - Depreciation claimed
   - Number of properties
3. **Quick Actions** - Buttons for common tasks:
   - Generate Schedule E
   - Generate 1099 forms
   - Upload receipts
   - Run compliance check
   - Export to TurboTax
4. **Progress Tracker** - Visual indicator of tax prep completion:
   - Income recorded ✓
   - Expenses categorized ✓
   - Receipts uploaded (75%)
   - Documents generated (pending)
5. **Alerts & Reminders** - Display upcoming deadlines and action items

**State Management:**
```typescript
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [summary, setSummary] = useState<TaxYearSummary | null>(null);
const [reminders, setReminders] = useState<TaxReminder[]>([]);
const [loading, setLoading] = useState(false);
```

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Tax Preparation Dashboard - 2024                       │
│  [Year Selector: 2024 ▼]                    [Help]     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ Income   │  │ Expenses │  │ Net      │  │Deprec.  ││
│  │ $48,000  │  │ $18,500  │  │ $29,500  │  │ $8,200  ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
├─────────────────────────────────────────────────────────┤
│  Quick Actions:                                          │
│  [Generate Schedule E] [Generate 1099s] [Upload Receipt]│
│  [Run Compliance Check] [Export to TurboTax]            │
├─────────────────────────────────────────────────────────┤
│  Tax Prep Progress:  ████████░░ 80%                     │
│  ✓ Income recorded                                       │
│  ✓ Expenses categorized                                  │
│  ⚠ 5 receipts missing                                    │
│  ○ Documents not generated                               │
├─────────────────────────────────────────────────────────┤
│  Upcoming Deadlines:                                     │
│  • Q4 Estimated Tax Due - Jan 15, 2025 (42 days)       │
│  • Property Tax Payment - Dec 31, 2024 (28 days)       │
└─────────────────────────────────────────────────────────┘
```

### 4.2 IncomeExpenseTracker.tsx

**Purpose:** Manage and categorize all income and expenses with AI-powered suggestions.

**Props:**
```typescript
interface IncomeExpenseTrackerProps {
  landlordId: string;
  taxYear: number;
  properties: Property[];
  onExpenseUpdate: (expense: PropertyExpense) => void;
}
```

**Key Features:**
1. **Transaction List** - Tabular view of all transactions:
   - Date, Description, Amount, Category, Property, Receipt Status
   - Inline editing for quick updates
   - Bulk selection for batch operations
2. **Smart Categorization** - AI suggests categories based on:
   - Transaction description
   - Vendor name
   - Historical patterns
   - Similar transactions
3. **Filtering & Search**:
   - Filter by property, category, date range, receipt status
   - Search by description or vendor
   - Saved filter presets
4. **Category Breakdown** - Pie chart showing expense distribution
5. **Receipt Management** - Upload and link receipts to transactions

**State Management:**
```typescript
const [transactions, setTransactions] = useState<PropertyExpense[]>([]);
const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
const [filters, setFilters] = useState<ExpenseFilter>({});
const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
```

**AI Categorization Logic:**
```typescript
async function suggestCategory(expense: PropertyExpense): Promise<{
  category: ScheduleECategory;
  confidence: number;
  reasoning: string;
}> {
  // 1. Check for exact vendor matches in knowledge base
  // 2. Analyze description keywords
  // 3. Check historical categorization for similar transactions
  // 4. Apply ML model for final prediction
  // 5. Return suggestion with confidence score
}
```

### 4.3 TaxDocumentGenerator.tsx

**Purpose:** Generate IRS-compliant tax forms with one-click export.

**Props:**
```typescript
interface TaxDocumentGeneratorProps {
  landlordId: string;
  taxYear: number;
  onDocumentGenerated: (document: TaxDocument) => void;
}
```

**Key Features:**
1. **Document Type Selection**:
   - Schedule E (Supplemental Income and Loss)
   - Form 8825 (Rental Real Estate Income)
   - Form 1099-MISC (for property managers)
   - Form 1099-NEC (for contractors)
   - Depreciation Schedule (Form 4562)
2. **Data Validation** - Pre-generation checks:
   - All income recorded
   - Expenses categorized
   - Depreciation calculated
   - Required fields complete
3. **Preview Mode** - Show form before generating PDF
4. **Export Options**:
   - Download PDF
   - Export to TurboTax (.txf)
   - Export to QuickBooks (.iif)
   - Export to Excel (.xlsx)
5. **Version Control** - Track document versions and amendments

**Generation Flow:**
```typescript
async function generateScheduleE(
  landlordId: string,
  taxYear: number
): Promise<TaxDocument> {
  // 1. Fetch all properties for landlord
  const properties = await fetchProperties(landlordId);
  
  // 2. Fetch income/expense data for tax year
  const transactions = await fetchTransactions(landlordId, taxYear);
  
  // 3. Calculate depreciation for each property
  const depreciation = await calculateDepreciation(properties, taxYear);
  
  // 4. Build Schedule E data structure
  const scheduleEData = buildScheduleE(properties, transactions, depreciation);
  
  // 5. Run compliance checks
  const complianceIssues = await checkCompliance(scheduleEData);
  
  // 6. Generate PDF
  const pdfBlob = await generatePDF(scheduleEData, 'schedule-e-template');
  
  // 7. Save document record
  const document = await saveTaxDocument({
    landlordId,
    taxYear,
    documentType: 'schedule-e',
    data: scheduleEData,
    pdfUrl: await uploadPDF(pdfBlob),
    status: complianceIssues.length > 0 ? 'ready-for-review' : 'ready-to-file'
  });
  
  return document;
}
```

### 4.4 DepreciationCalculator.tsx

**Purpose:** Calculate and track depreciation for rental properties and improvements.

**Props:**
```typescript
interface DepreciationCalculatorProps {
  propertyId: string;
  taxYear: number;
  onScheduleUpdate: (schedule: DepreciationSchedule) => void;
}
```

**Key Features:**
1. **Property Basis Calculator**:
   - Purchase price input
   - Land value allocation
   - Closing costs
   - Depreciable basis calculation
2. **MACRS Depreciation**:
   - 27.5-year recovery period for residential
   - Mid-month convention
   - Automatic yearly depreciation calculation
3. **Capital Improvements Tracker**:
   - Add improvements with dates and costs
   - Separate depreciation schedules for each improvement
   - Track placed-in-service dates
4. **Depreciation Schedule Table**:
   - Year-by-year breakdown
   - Accumulated depreciation
   - Remaining basis
5. **Special Depreciation**:
   - Section 179 deduction calculator
   - Bonus depreciation eligibility checker

**Calculation Logic:**
```typescript
function calculateMACRSDepreciation(
  depreciableBasis: number,
  placedInServiceDate: Date,
  currentYear: number
): DepreciationSchedule {
  const recoveryPeriod = 27.5; // years for residential rental
  const convention = 'mid-month';
  
  // First year: mid-month convention
  const firstYearMonths = 12 - placedInServiceDate.getMonth() + 0.5;
  const firstYearDepreciation = (depreciableBasis / recoveryPeriod) * (firstYearMonths / 12);
  
  // Full years: straight-line depreciation
  const annualDepreciation = depreciableBasis / recoveryPeriod;
  
  // Build yearly schedule
  const schedule: DepreciationSchedule = {
    // ... populate fields
    yearlyDepreciation: []
  };
  
  let accumulated = 0;
  for (let year = 1; year <= recoveryPeriod; year++) {
    const yearDepreciation = year === 1 ? firstYearDepreciation : annualDepreciation;
    accumulated += yearDepreciation;
    
    schedule.yearlyDepreciation.push({
      year: placedInServiceDate.getFullYear() + year - 1,
      depreciation: yearDepreciation,
      accumulatedDepreciation: accumulated,
      remainingBasis: depreciableBasis - accumulated
    });
  }
  
  return schedule;
}
```

### 4.5 TaxDeductionOptimizer.tsx

**Purpose:** AI-powered analysis to identify missed deductions and optimization opportunities.

**Props:**
```typescript
interface TaxDeductionOptimizerProps {
  landlordId: string;
  taxYear: number;
  onSuggestionAccept: (suggestion: TaxOptimizationSuggestion) => void;
}
```

**Key Features:**
1. **Deduction Scanner**:
   - Analyze all expenses for potential deductions
   - Compare against IRS guidelines
   - Identify commonly missed deductions
2. **Opportunity Cards**:
   - Display each suggestion with:
     - Potential tax savings
     - Priority level (high/medium/low)
     - Action required
     - Implementation steps
3. **Category Analysis**:
   - Compare expense categories to industry averages
   - Flag unusually low categories (potential missed deductions)
   - Suggest additional tracking
4. **Timing Strategies**:
   - Suggest expense timing for tax optimization
   - Identify bunching opportunities
   - Recommend prepayments or deferrals

**AI Analysis Logic:**
```typescript
async function analyzeDeductions(
  landlordId: string,
  taxYear: number
): Promise<TaxOptimizationSuggestion[]> {
  const suggestions: TaxOptimizationSuggestion[] = [];
  
  // 1. Check for common missed deductions
  const commonMissed = [
    'home-office',
    'mileage',
    'phone-internet',
    'professional-development',
    'bank-fees',
    'software-subscriptions'
  ];
  
  for (const category of commonMissed) {
    const hasExpenses = await checkCategoryHasExpenses(landlordId, taxYear, category);
    if (!hasExpenses) {
      suggestions.push({
        type: 'missed-deduction',
        priority: 'medium',
        title: `Consider tracking ${category} expenses`,
        description: `Many landlords deduct ${category} but we don't see any expenses in this category.`,
        potentialSavings: estimateSavings(category),
        actionRequired: `Review your records for ${category} expenses`,
        implementationSteps: [
          `Gather receipts for ${category}`,
          `Add expenses to the tracker`,
          `Categorize as deductible`
        ]
      });
    }
  }
  
  // 2. Check depreciation optimization
  const properties = await fetchProperties(landlordId);
  for (const property of properties) {
    if (!property.financialInfo.depreciationSchedules?.length) {
      suggestions.push({
        type: 'depreciation-opportunity',
        priority: 'high',
        title: `Set up depreciation for ${property.details.address.street}`,
        description: `This property doesn't have a depreciation schedule. You could be missing significant deductions.`,
        potentialSavings: estimateDepreciationSavings(property),
        actionRequired: 'Create depreciation schedule',
        implementationSteps: [
          'Enter property purchase information',
          'Allocate land vs. building value',
          'Generate MACRS depreciation schedule'
        ]
      });
    }
  }
  
  // 3. Check for capital improvements
  const largeExpenses = await findLargeExpenses(landlordId, taxYear, 5000);
  for (const expense of largeExpenses) {
    if (!expense.isCapitalImprovement) {
      suggestions.push({
        type: 'categorization-error',
        priority: 'high',
        title: `Review large expense: ${expense.description}`,
        description: `This $${expense.amount} expense might be a capital improvement requiring depreciation instead of immediate deduction.`,
        potentialSavings: 0, // Compliance, not savings
        actionRequired: 'Determine if capital improvement',
        implementationSteps: [
          'Review IRS guidelines for capital improvements',
          'Reclassify if necessary',
          'Set up depreciation schedule'
        ]
      });
    }
  }
  
  return suggestions;
}
```

### 4.6 ReceiptScanner.tsx

**Purpose:** OCR-based receipt upload with automatic data extraction and expense creation.

**Props:**
```typescript
interface ReceiptScannerProps {
  landlordId: string;
  propertyId?: string;
  onReceiptProcessed: (expense: PropertyExpense) => void;
}
```

**Key Features:**
1. **Upload Methods**:
   - Drag-and-drop
   - File browser
   - Mobile camera capture
   - Email forwarding (future)
2. **OCR Processing**:
   - Extract vendor name
   - Extract date
   - Extract amount
   - Extract line items
3. **Smart Matching**:
   - Match to existing expenses
   - Suggest category based on vendor
   - Link to property if applicable
4. **Bulk Upload**:
   - Process multiple receipts at once
   - Queue management
   - Progress tracking
5. **Receipt Storage**:
   - Cloud storage integration
   - Thumbnail generation
   - Full-resolution access

**OCR Processing Flow:**
```typescript
async function processReceipt(
  imageFile: File,
  landlordId: string
): Promise<PropertyExpense> {
  // 1. Upload image to storage
  const imageUrl = await uploadImage(imageFile);
  
  // 2. Run OCR extraction
  const ocrResult = await extractTextFromImage(imageUrl);
  
  // 3. Parse structured data
  const parsedData = parseReceiptData(ocrResult.text);
  
  // 4. Suggest category based on vendor
  const suggestedCategory = await suggestCategoryFromVendor(parsedData.vendor);
  
  // 5. Create expense record
  const expense: PropertyExpense = {
    id: generateId(),
    type: 'other',
    amount: parsedData.amount,
    date: parsedData.date,
    description: parsedData.vendor,
    recurring: false,
    taxCategory: suggestedCategory.category,
    receiptUrl: imageUrl,
    hasReceipt: true,
    aiCategorized: true,
    aiConfidence: suggestedCategory.confidence
  };
  
  return expense;
}

function parseReceiptData(ocrText: string): {
  vendor: string;
  date: Date;
  amount: number;
  lineItems: { description: string; amount: number }[];
} {
  // Use regex patterns and NLP to extract:
  // - Vendor name (usually at top)
  // - Date (various formats)
  // - Total amount (look for "Total", "Amount Due", etc.)
  // - Line items (description + price pairs)
  
  // Return structured data
}
```

### 4.7 PropertyTaxCalendar.tsx

**Purpose:** Track tax deadlines, property tax payments, and insurance renewals with automated reminders.

**Props:**
```typescript
interface PropertyTaxCalendarProps {
  landlordId: string;
  properties: Property[];
  onReminderCreate: (reminder: TaxReminder) => void;
}
```

**Key Features:**
1. **Calendar View**:
   - Monthly calendar with deadline markers
   - Color-coded by urgency (green/yellow/red)
   - Click to view details
2. **Deadline Types**:
   - Quarterly estimated taxes (Apr 15, Jun 15, Sep 15, Jan 15)
   - Property tax payments (varies by locality)
   - Insurance renewals
   - Tax return filing (Apr 15)
   - 1099 filing (Jan 31)
3. **Reminder Management**:
   - Set custom reminders (email, SMS, in-app)
   - Configure notification timing (7 days, 14 days, 30 days before)
   - Mark as complete
4. **Payment Tracking**:
   - Record payment dates
   - Upload payment confirmations
   - Track payment history
5. **Multi-Property View**:
   - See all deadlines across properties
   - Filter by property
   - Aggregate view

**Reminder System:**
```typescript
async function createAutomaticReminders(landlordId: string): Promise<void> {
  const properties = await fetchProperties(landlordId);
  const currentYear = new Date().getFullYear();
  
  // Quarterly estimated tax reminders
  const quarterlyDates = [
    new Date(currentYear, 3, 15), // Apr 15
    new Date(currentYear, 5, 15), // Jun 15
    new Date(currentYear, 8, 15), // Sep 15
    new Date(currentYear + 1, 0, 15) // Jan 15 next year
  ];
  
  for (const date of quarterlyDates) {
    await createReminder({
      landlordId,
      type: 'quarterly-estimated-tax',
      title: 'Quarterly Estimated Tax Payment Due',
      description: 'Pay estimated taxes for rental income',
      dueDate: date,
      notificationPreferences: {
        email: true,
        sms: true,
        inApp: true,
        daysBefore: [30, 14, 7, 1]
      }
    });
  }
  
  // Property-specific reminders
  for (const property of properties) {
    // Property tax reminders
    if (property.financialInfo.taxInfo) {
      const taxDueDate = calculatePropertyTaxDueDate(property);
      await createReminder({
        landlordId,
        type: 'property-tax-payment',
        title: `Property Tax Due - ${property.details.address.street}`,
        description: `Pay property taxes for ${property.details.address.street}`,
        dueDate: taxDueDate,
        propertyIds: [property.id],
        notificationPreferences: {
          email: true,
          sms: false,
          inApp: true,
          daysBefore: [30, 14, 7]
        }
      });
    }
  }
}
```

### 4.8 CPACollaborationPortal.tsx

**Purpose:** Secure portal for accountants and CPAs to access landlord's tax data with role-based permissions.

**Props:**
```typescript
interface CPACollaborationPortalProps {
  landlordId: string;
  onAccessGranted: (access: CPAAccess) => void;
}
```

**Key Features:**
1. **Invite CPA**:
   - Send email invitation
   - Set access level (full, limited, view-only)
   - Define scope (properties, tax years)
   - Set expiration date
2. **Permission Management**:
   - View financials
   - View documents
   - Generate reports
   - Edit categories
   - Approve deductions
3. **Activity Monitoring**:
   - Real-time activity log
   - Track what CPA views/downloads
   - Audit trail for compliance
4. **Secure Sharing**:
   - Encrypted data transfer
   - Two-factor authentication
   - Session timeout
5. **Communication**:
   - In-app messaging
   - Comment threads on transactions
   - Document annotations

**Access Control Logic:**
```typescript
async function grantCPAAccess(
  landlordId: string,
  cpaEmail: string,
  permissions: CPAAccess['permissions'],
  scope: { propertyIds?: string[]; taxYears?: number[] }
): Promise<CPAAccess> {
  // 1. Create access record
  const access: CPAAccess = {
    id: generateId(),
    landlordId,
    cpaInfo: {
      email: cpaEmail,
      // ... other fields filled on acceptance
    },
    permissions,
    accessLevel: determineAccessLevel(permissions),
    propertyIds: scope.propertyIds,
    taxYears: scope.taxYears,
    status: 'pending',
    invitedAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    activityLog: []
  };
  
  // 2. Send invitation email
  await sendCPAInvitation(cpaEmail, landlordId, access.id);
  
  // 3. Save access record
  await saveCPAAccess(access);
  
  return access;
}

function determineAccessLevel(permissions: CPAAccess['permissions']): 'full' | 'limited' | 'view-only' {
  const editPermissions = ['generateReports', 'editCategories', 'approveDeductions'];
  const hasEditPermission = editPermissions.some(p => permissions[p]);
  
  if (hasEditPermission) {
    return permissions.viewFinancials && permissions.viewDocuments ? 'full' : 'limited';
  }
  
  return 'view-only';
}
```

### 4.9 AITaxAssistant.tsx

**Purpose:** Conversational AI chatbot trained on rental property tax laws to answer landlord questions.

**Props:**
```typescript
interface AITaxAssistantProps {
  landlordId: string;
  context?: {
    propertyId?: string;
    taxYear?: number;
    category?: ScheduleECategory;
  };
}
```

**Key Features:**
1. **Chat Interface**:
   - Natural language input
   - Conversational responses
   - Context-aware answers
   - Follow-up questions
2. **Knowledge Base**:
   - IRS Publication 527 (Residential Rental Property)
   - State-specific tax laws
   - Depreciation rules
   - Deduction guidelines
3. **Contextual Awareness**:
   - Access to landlord's property data
   - Reference specific transactions
   - Provide personalized advice
4. **Source Citations**:
   - Link to IRS publications
   - Reference specific tax code sections
   - Provide external resources
5. **Feedback Loop**:
   - Rate responses (helpful/not helpful)
   - Report inaccuracies
   - Improve over time

**AI Response Generation:**
```typescript
async function generateTaxAnswer(
  question: string,
  landlordId: string,
  context?: { propertyId?: string; taxYear?: number }
): Promise<TaxQuestion> {
  // 1. Analyze question intent
  const intent = await analyzeQuestionIntent(question);
  
  // 2. Retrieve relevant knowledge base articles
  const relevantArticles = await searchKnowledgeBase(question, intent);
  
  // 3. Fetch landlord-specific context if needed
  let landlordContext = '';
  if (context?.propertyId) {
    const property = await fetchProperty(context.propertyId);
    landlordContext = `Property: ${property.details.address.street}, Type: ${property.details.propertyType}`;
  }
  
  // 4. Generate answer using LLM
  const prompt = `
    Question: ${question}
    
    Context: ${landlordContext}
    
    Knowledge Base:
    ${relevantArticles.map(a => a.content).join('\n\n')}
    
    Provide a clear, accurate answer to the landlord's tax question. 
    Include specific IRS guidance and cite sources.
  `;
  
  const answer = await callLLM(prompt);
  
  // 5. Extract confidence score and sources
  const confidence = calculateConfidence(answer, relevantArticles);
  const sources = relevantArticles.map(a => a.source);
  
  // 6. Save question for future training
  const taxQuestion: TaxQuestion = {
    id: generateId(),
    landlordId,
    question,
    context,
    answer: answer.text,
    confidence,
    sources,
    timestamp: new Date()
  };
  
  await saveTaxQuestion(taxQuestion);
  
  return taxQuestion;
}
```

### 4.10 TaxComplianceChecker.tsx

**Purpose:** Real-time validation of tax data against IRS rules and state-specific regulations.

**Props:**
```typescript
interface TaxComplianceCheckerProps {
  landlordId: string;
  taxYear: number;
  onIssueFound: (issue: ComplianceIssue) => void;
}
```

**Key Features:**
1. **Automated Checks**:
   - Missing required documentation
   - Expense categorization errors
   - Depreciation calculation accuracy
   - 1099 filing requirements
   - State-specific compliance
2. **Issue Severity Levels**:
   - Critical (must fix before filing)
   - Warning (recommended to fix)
   - Info (optional improvements)
3. **Auto-Fix Suggestions**:
   - One-click fixes for common issues
   - Guided workflows for complex issues
4. **Compliance Score**:
   - Overall score (0-100)
   - Breakdown by category
   - Comparison to previous years
5. **Audit Risk Assessment**:
   - Identify red flags
   - Suggest mitigation strategies

**Compliance Check Logic:**
```typescript
async function runComplianceCheck(
  landlordId: string,
  taxYear: number
): Promise<{
  score: number;
  issues: ComplianceIssue[];
  summary: string;
}> {
  const issues: ComplianceIssue[] = [];
  
  // 1. Check for missing receipts
  const expenses = await fetchExpenses(landlordId, taxYear);
  const largeExpensesWithoutReceipts = expenses.filter(
    e => e.amount > 75 && !e.hasReceipt
  );
  
  if (largeExpensesWithoutReceipts.length > 0) {
    issues.push({
      id: generateId(),
      severity: 'warning',
      ruleId: 'receipt-requirement',
      ruleTitle: 'Receipt Documentation Required',
      description: `${largeExpensesWithoutReceipts.length} expenses over $75 are missing receipts. IRS requires documentation for expenses over $75.`,
      recommendation: 'Upload receipts for these expenses or mark as lost',
      autoFixAvailable: false
    });
  }
  
  // 2. Check depreciation schedules
  const properties = await fetchProperties(landlordId);
  const propertiesWithoutDepreciation = properties.filter(
    p => !p.financialInfo.depreciationSchedules?.length
  );
  
  if (propertiesWithoutDepreciation.length > 0) {
    issues.push({
      id: generateId(),
      severity: 'critical',
      ruleId: 'depreciation-required',
      ruleTitle: 'Missing Depreciation Schedules',
      description: `${propertiesWithoutDepreciation.length} properties don't have depreciation schedules. You may be missing significant deductions.`,
      recommendation: 'Create depreciation schedules for all rental properties',
      autoFixAvailable: true
    });
  }
  
  // 3. Check 1099 filing requirements
  const contractors = await findContractorPayments(landlordId, taxYear);
  const contractorsOver600 = contractors.filter(c => c.totalPayments >= 600);
  const contractorsWithout1099 = contractorsOver600.filter(c => !c.has1099);
  
  if (contractorsWithout1099.length > 0) {
    issues.push({
      id: generateId(),
      severity: 'critical',
      ruleId: '1099-filing-required',
      ruleTitle: '1099 Forms Required',
      description: `${contractorsWithout1099.length} contractors received $600+ but don't have 1099 forms generated. You must file 1099s by January 31.`,
      recommendation: 'Generate and file 1099-NEC forms for these contractors',
      autoFixAvailable: true
    });
  }
  
  // 4. Calculate compliance score
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const warningIssues = issues.filter(i => i.severity === 'warning').length;
  const score = 100 - (criticalIssues * 20) - (warningIssues * 5);
  
  // 5. Generate summary
  const summary = generateComplianceSummary(score, issues);
  
  return { score, issues, summary };
}
```

---

## 5. API & Integration Layer

### 5.1 Tax Preparation Context API

```typescript
// src/contexts/TaxPreparationContext.tsx

interface TaxPreparationContextType {
  // Tax year management
  selectedTaxYear: number;
  setSelectedTaxYear: (year: number) => void;
  availableTaxYears: number[];
  
  // Summary data
  taxYearSummary: TaxYearSummary | null;
  loadTaxYearSummary: (landlordId: string, year: number) => Promise<void>;
  
  // Income & Expenses
  categorizeExpense: (expenseId: string, category: ScheduleECategory) => Promise<void>;
  bulkCategorizeExpenses: (expenseIds: string[], category: ScheduleECategory) => Promise<void>;
  recategorizeExpense: (expenseId: string, newCategory: ScheduleECategory) => Promise<void>;
  
  // Document generation
  generateScheduleE: (landlordId: string, year: number) => Promise<TaxDocument>;
  generate1099Forms: (landlordId: string, year: number) => Promise<TaxDocument[]>;
  generateDepreciationSchedule: (propertyId: string) => Promise<TaxDocument>;
  generateTaxPackage: (landlordId: string, year: number) => Promise<Blob>;
  
  // Depreciation
  createDepreciationSchedule: (propertyId: string, data: Partial<DepreciationSchedule>) => Promise<DepreciationSchedule>;
  updateDepreciationSchedule: (scheduleId: string, updates: Partial<DepreciationSchedule>) => Promise<void>;
  calculateDepreciation: (propertyId: string, year: number) => Promise<number>;
  
  // Deduction optimization
  analyzeDeductions: (landlordId: string, year: number) => Promise<TaxOptimizationSuggestion[]>;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  dismissSuggestion: (suggestionId: string, reason: string) => Promise<void>;
  
  // Receipt management
  uploadReceipt: (file: File, expenseId?: string) => Promise<string>;
  processReceiptOCR: (receiptUrl: string) => Promise<PropertyExpense>;
  linkReceiptToExpense: (receiptUrl: string, expenseId: string) => Promise<void>;
  
  // Reminders
  createReminder: (reminder: Omit<TaxReminder, 'id'>) => Promise<TaxReminder>;
  updateReminder: (reminderId: string, updates: Partial<TaxReminder>) => Promise<void>;
  getUpcomingReminders: (landlordId: string) => Promise<TaxReminder[]>;
  markReminderComplete: (reminderId: string) => Promise<void>;
  
  // CPA collaboration
  inviteCPA: (landlordId: string, cpaEmail: string, permissions: CPAAccess['permissions']) => Promise<CPAAccess>;
  updateCPAPermissions: (accessId: string, permissions: CPAAccess['permissions']) => Promise<void>;
  revokeCPAAccess: (accessId: string) => Promise<void>;
  getCPAActivityLog: (accessId: string) => Promise<CPAAccess['activityLog']>;
  
  // Compliance
  runComplianceCheck: (landlordId: string, year: number) => Promise<{ score: number; issues: ComplianceIssue[] }>;
  fixComplianceIssue: (issueId: string) => Promise<void>;
  
  // AI Assistant
  askTaxQuestion: (question: string, context?: TaxQuestion['context']) => Promise<TaxQuestion>;
  rateTaxAnswer: (questionId: string, helpful: boolean, feedback?: string) => Promise<void>;
  
  // Export
  exportToTurboTax: (landlordId: string, year: number) => Promise<Blob>;
  exportToQuickBooks: (landlordId: string, year: number) => Promise<Blob>;
  exportToExcel: (landlordId: string, year: number) => Promise<Blob>;
  
  // State
  loading: boolean;
  error: string | null;
}
```

### 5.2 Enhanced Landlord Management Context

```typescript
// ADDITIONS to src/contexts/LandlordManagementContext.tsx

interface LandlordManagementContextType {
  // ... existing methods ...
  
  // NEW: Tax-related property methods
  updatePropertyTaxInfo: (propertyId: string, taxInfo: Partial<TaxInformation>) => Promise<void>;
  addCapitalImprovement: (propertyId: string, improvement: CapitalImprovement) => Promise<void>;
  updateCapitalImprovement: (improvementId: string, updates: Partial<CapitalImprovement>) => Promise<void>;
  
  // NEW: Enhanced expense methods
  updateExpenseTaxCategory: (expenseId: string, category: ScheduleECategory) => Promise<void>;
  markExpenseAsCapitalImprovement: (expenseId: string, isCapital: boolean) => Promise<void>;
  attachReceiptToExpense: (expenseId: string, receiptUrl: string) => Promise<void>;
  
  // NEW: Tax year filtering
  getExpensesByTaxYear: (landlordId: string, year: number) => PropertyExpense[];
  getIncomeByTaxYear: (landlordId: string, year: number) => PaymentRecord[];
  getPropertiesByTaxYear: (landlordId: string, year: number) => Property[];
}
```

### 5.3 External Service Integrations

```typescript
// src/lib/integrations/

// OCR Service (e.g., Google Vision API, AWS Textract)
interface OCRService {
  extractText(imageUrl: string): Promise<{ text: string; confidence: number }>;
  extractStructuredData(imageUrl: string): Promise<{
    vendor: string;
    date: Date;
    amount: number;
    lineItems: { description: string; amount: number }[];
  }>;
}

// AI/ML Service (e.g., OpenAI, Anthropic)
interface AIService {
  categorizeExpense(description: string, vendor: string): Promise<{
    category: ScheduleECategory;
    confidence: number;
    reasoning: string;
  }>;
  
  answerTaxQuestion(question: string, context: string): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
  }>;
  
  analyzeDeductions(expenses: PropertyExpense[]): Promise<TaxOptimizationSuggestion[]>;
}

// PDF Generation Service
interface PDFService {
  generateScheduleE(data: ScheduleEData): Promise<Blob>;
  generate1099(data: Form1099Data): Promise<Blob>;
  generateDepreciationSchedule(data: DepreciationSchedule): Promise<Blob>;
}

// Export Service
interface ExportService {
  exportToTurboTax(data: TaxYearSummary): Promise<Blob>; // .txf format
  exportToQuickBooks(data: TaxYearSummary): Promise<Blob>; // .iif format
  exportToXero(data: TaxYearSummary): Promise<Blob>; // .csv format
  exportToExcel(data: TaxYearSummary): Promise<Blob>; // .xlsx format
}

// Bank Feed Integration (Future)
interface BankFeedService {
  connectBank(landlordId: string, bankCredentials: any): Promise<void>;
  syncTransactions(landlordId: string): Promise<PropertyExpense[]>;
  disconnectBank(landlordId: string): Promise<void>;
}
```

---

## 6. Security & Compliance

### 6.1 Data Security

**Encryption:**
- All tax documents encrypted at rest using AES-256
- TLS 1.3 for data in transit
- End-to-end encryption for CPA collaboration

**Access Control:**
- Role-based access control (RBAC) for all tax features
- Multi-factor authentication for sensitive operations
- Session timeout after 30 minutes of inactivity
- IP whitelisting for CPA access (optional)

**Audit Logging:**
- Log all tax document generation
- Track all data exports
- Monitor CPA access and actions
- Retain logs for 7 years (IRS requirement)

### 6.2 IRS Compliance

**Document Retention:**
- Store all tax documents for 7 years minimum
- Maintain version history for amendments
- Track filing dates and confirmation numbers

**Form Accuracy:**
- Validate all generated forms against IRS specifications
- Use official IRS form templates
- Include required disclaimers and instructions

**1099 Filing:**
- Generate 1099-MISC and 1099-NEC forms
- Support electronic filing (future)
- Track filing deadlines (January 31)

### 6.3 Privacy & GDPR

**Data Minimization:**
- Collect only necessary tax information
- Allow users to delete old tax years
- Provide data export functionality

**User Consent:**
- Explicit consent for CPA access
- Clear privacy policy for tax features
- Opt-in for AI-powered features

**Data Portability:**
- Export all tax data in standard formats
- Support data migration to other platforms

---

## 7. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Deliverables:**
1. Type definitions (`landlordTax.ts`)
2. Tax Preparation Context (`TaxPreparationContext.tsx`)
3. Enhanced Landlord Management Context
4. Tax Dashboard (main hub)
5. Basic Income & Expense Tracker

**Success Criteria:**
- All type definitions complete and reviewed
- Context providers functional with mock data
- Tax Dashboard displays summary cards
- Can view and filter income/expenses

### Phase 2: Core Features (Weeks 3-5)

**Deliverables:**
1. Tax Document Generator (Schedule E, 1099)
2. Depreciation Calculator
3. Receipt Scanner with OCR
4. Tax Report Exporter

**Success Criteria:**
- Can generate Schedule E PDF
- Can generate 1099 forms
- Depreciation calculations accurate
- OCR successfully extracts receipt data
- Can export to TurboTax format

### Phase 3: Intelligence & Optimization (Weeks 6-7)

**Deliverables:**
1. AI Tax Assistant
2. Tax Deduction Optimizer
3. Tax Compliance Checker
4. Smart expense categorization

**Success Criteria:**
- AI Assistant answers common tax questions
- Deduction Optimizer identifies opportunities
- Compliance Checker validates tax data
- 90%+ accuracy in auto-categorization

### Phase 4: Collaboration & Calendar (Weeks 8-9)

**Deliverables:**
1. CPA Collaboration Portal
2. Property Tax Calendar
3. Tax Education Center
4. Reminder system

**Success Criteria:**
- CPAs can access landlord data with permissions
- Calendar displays all tax deadlines
- Reminders sent via email/SMS
- Education content accessible

### Phase 5: Testing & Refinement (Weeks 10-11)

**Deliverables:**
1. Comprehensive testing (unit, integration, E2E)
2. Performance optimization
3. Bug fixes
4. Documentation

**Success Criteria:**
- 95%+ test coverage
- All critical bugs resolved
- Performance benchmarks met
- User documentation complete

### Phase 6: Deployment & Monitoring (Week 12)

**Deliverables:**
1. Production deployment
2. Monitoring setup
3. User onboarding materials
4. Support documentation

**Success Criteria:**
- Zero downtime deployment
- Monitoring dashboards active
- Support team trained
- User feedback collected

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Coverage Target:** 90%+

**Key Areas:**
- Tax calculation functions (depreciation, Schedule E totals)
- Expense categorization logic
- Compliance validation rules
- PDF generation utilities
- Date/time calculations for tax years

**Example Test:**
```typescript
describe('calculateMACRSDepreciation', () => {
  it('should calculate first-year depreciation with mid-month convention', () => {
    const depreciableBasis = 275000;
    const placedInServiceDate = new Date(2024, 6, 15); // July 15, 2024
    
    const schedule = calculateMACRSDepreciation(depreciableBasis, placedInServiceDate, 2024);
    
    // First year: 5.5 months (mid-July to end of year)
    const expectedFirstYear = (275000 / 27.5) * (5.5 / 12);
    expect(schedule.yearlyDepreciation[0].depreciation).toBeCloseTo(expectedFirstYear, 2);
  });
  
  it('should calculate 27.5 years of depreciation', () => {
    const depreciableBasis = 275000;
    const placedInServiceDate = new Date(2024, 0, 1);
    
    const schedule = calculateMACRSDepreciation(depreciableBasis, placedInServiceDate, 2024);
    
    expect(schedule.yearlyDepreciation).toHaveLength(28); // 27.5 years = 28 entries
    expect(schedule.yearlyDepreciation[27].remainingBasis).toBeCloseTo(0, 2);
  });
});
```

### 8.2 Integration Tests

**Key Scenarios:**
1. **End-to-End Schedule E Generation:**
   - Create properties with income/expenses
   - Generate Schedule E
   - Verify PDF contents match data
   - Export to TurboTax
   - Verify exported file format

2. **Receipt Upload & OCR:**
   - Upload receipt image
   - Verify OCR extraction
   - Auto-create expense
   - Link receipt to expense
   - Verify receipt accessible

3. **CPA Collaboration:**
   - Invite CPA with permissions
   - CPA logs in and views data
   - CPA edits expense category
   - Verify activity logged
   - Revoke access

### 8.3 E2E Tests (Playwright)

**User Flows:**
1. **New Landlord Tax Setup:**
   - Navigate to Tax Prep tab
   - Select tax year
   - Review income/expenses
   - Upload receipts
   - Generate Schedule E
   - Download PDF

2. **Depreciation Setup:**
   - Go to Depreciation Calculator
   - Enter property purchase info
   - Allocate land value
   - Generate depreciation schedule
   - Verify yearly breakdown

3. **AI Assistant Usage:**
   - Open AI Tax Assistant
   - Ask question about deductions
   - Receive answer with sources
   - Rate answer as helpful
   - Ask follow-up question

### 8.4 Performance Tests

**Benchmarks:**
- Schedule E generation: < 3 seconds
- OCR processing: < 5 seconds per receipt
- AI categorization: < 2 seconds per expense
- Compliance check: < 10 seconds for 100 properties
- Dashboard load: < 2 seconds

**Load Testing:**
- Simulate 1000 concurrent users
- Test document generation under load
- Verify no degradation in response times

### 8.5 Compliance Testing

**IRS Form Validation:**
- Verify Schedule E matches official IRS form
- Check all required fields present
- Validate calculations (totals, subtotals)
- Test edge cases (negative income, large expenses)

**1099 Validation:**
- Verify 1099-MISC and 1099-NEC formats
- Check recipient information fields
- Validate payment amounts
- Test multiple recipients

---

## 9. Performance Considerations

### 9.1 Optimization Strategies

**Data Loading:**
- Lazy load tax years (only load selected year)
- Paginate transaction lists (50 per page)
- Cache tax year summaries (1 hour TTL)
- Preload next/previous tax year in background

**Document Generation:**
- Generate PDFs asynchronously
- Queue multiple document requests
- Cache generated documents (24 hours)
- Use worker threads for CPU-intensive tasks

**OCR Processing:**
- Process receipts in background queue
- Batch multiple receipts for efficiency
- Cache OCR results permanently
- Use thumbnail previews for UI

**AI/ML:**
- Batch expense categorization requests
- Cache category suggestions (by vendor)
- Use local models for simple categorization
- Fall back to cloud API for complex cases

### 9.2 Caching Strategy

**Redis Cache Layers:**
```typescript
// Tax year summary (1 hour)
cache.set(`tax-summary:${landlordId}:${year}`, summary, 3600);

// Expense categories (permanent)
cache.set(`expense-category:${expenseId}`, category);

// AI suggestions (24 hours)
cache.set(`ai-suggestion:${landlordId}:${year}`, suggestions, 86400);

// Generated documents (24 hours)
cache.set(`tax-doc:${documentId}`, pdfBlob, 86400);

// OCR results (permanent)
cache.set(`ocr:${receiptUrl}`, ocrData);
```

### 9.3 Database Indexing

**Critical Indexes:**
```sql
-- Expenses by landlord and tax year
CREATE INDEX idx_expenses_landlord_year ON property_expenses(landlord_id, tax_year);

-- Expenses by category
CREATE INDEX idx_expenses_category ON property_expenses(tax_category);

-- Tax documents by landlord and year
CREATE INDEX idx_tax_docs_landlord_year ON tax_documents(landlord_id, tax_year);

-- Depreciation schedules by property
CREATE INDEX idx_depreciation_property ON depreciation_schedules(property_id);

-- Reminders by landlord and due date
CREATE INDEX idx_reminders_landlord_due ON tax_reminders(landlord_id, due_date);
```

---

## 10. Deployment Plan

### 10.1 Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] IRS form templates validated
- [ ] Documentation complete
- [ ] Support team trained
- [ ] Rollback plan prepared
- [ ] Monitoring dashboards configured

### 10.2 Deployment Strategy

**Blue-Green Deployment:**
1. Deploy to staging environment
2. Run smoke tests
3. Deploy to 10% of production users (canary)
4. Monitor for 24 hours
5. Gradually increase to 50%, then 100%
6. Keep old version running for 48 hours (rollback option)

**Feature Flags:**
```typescript
const FEATURE_FLAGS = {
  TAX_PREP_ENABLED: true,
  AI_ASSISTANT_ENABLED: true,
  OCR_ENABLED: true,
  CPA_COLLABORATION_ENABLED: false, // Gradual rollout
  BANK_FEEDS_ENABLED: false // Future feature
};
```

### 10.3 Monitoring & Alerts

**Key Metrics:**
- Tax document generation success rate (target: 99%+)
- OCR accuracy (target: 95%+)
- AI categorization accuracy (target: 90%+)
- Average response time (target: < 2s)
- Error rate (target: < 0.1%)

**Alerts:**
- Document generation failures > 5 per hour
- OCR service downtime
- AI service errors > 10 per hour
- Database query time > 5 seconds
- Memory usage > 80%

### 10.4 Rollback Plan

**Trigger Conditions:**
- Error rate > 5%
- Critical bug affecting tax calculations
- Data integrity issues
- Performance degradation > 50%

**Rollback Steps:**
1. Switch traffic to old version (< 5 minutes)
2. Disable new tax features via feature flags
3. Notify users of temporary maintenance
4. Investigate and fix issues
5. Re-deploy with fixes

---

## 11. Future Enhancements (Post-Launch)

### 11.1 Phase 2 Features (Q2 2025)

1. **Bank Feed Integration**
   - Connect to bank accounts via Plaid
   - Auto-import transactions
   - Real-time expense tracking

2. **E-Filing Integration**
   - Direct IRS e-filing for 1099 forms
   - State tax return e-filing
   - Electronic signature for tax documents

3. **Mobile App**
   - Receipt capture on mobile
   - Push notifications for reminders
   - Quick expense entry

4. **Advanced Reporting**
   - Multi-year trend analysis
   - Benchmark against similar landlords
   - Tax projection for next year

### 11.2 Phase 3 Features (Q3 2025)

1. **1031 Exchange Wizard**
   - Guide landlords through 1031 exchanges
   - Track timelines and requirements
   - Calculate deferred gains

2. **Cost Segregation Study**
   - Identify assets for accelerated depreciation
   - Generate cost segregation reports
   - Maximize depreciation deductions

3. **State Tax Compliance**
   - State-specific tax forms
   - Multi-state property support
   - State tax payment tracking

4. **Tax Planning Tools**
   - Scenario modeling (buy/sell properties)
   - Estimated tax calculators
   - Retirement planning integration

---

## 12. Appendices

### Appendix A: IRS Schedule E Line Items

| Line | Description | Category |
|------|-------------|----------|
| 3 | Rents received | Income |
| 5 | Advertising | Expense |
| 6 | Auto and travel | Expense |
| 7 | Cleaning and maintenance | Expense |
| 8 | Commissions | Expense |
| 9 | Insurance | Expense |
| 10 | Legal and professional fees | Expense |
| 11 | Management fees | Expense |
| 12 | Mortgage interest | Expense |
| 13 | Other interest | Expense |
| 14 | Repairs | Expense |
| 15 | Supplies | Expense |
| 16 | Taxes | Expense |
| 17 | Utilities | Expense |
| 18 | Depreciation | Expense |
| 19 | Other expenses | Expense |

### Appendix B: MACRS Depreciation Table (27.5 Years)

| Year | Percentage |
|------|------------|
| 1 | 3.485% - 0.152% (depending on month) |
| 2-27 | 3.636% |
| 28 | 3.637% - 0.152% (depending on month) |

### Appendix C: Common Tax Deductions for Landlords

1. **Operating Expenses:**
   - Property management fees
   - Advertising for tenants
   - Insurance premiums
   - Utilities (if landlord pays)
   - Repairs and maintenance
   - Legal and professional fees

2. **Interest:**
   - Mortgage interest
   - Credit card interest (for property expenses)
   - Loan interest for improvements

3. **Depreciation:**
   - Building depreciation (27.5 years)
   - Appliance depreciation (5 years)
   - Improvement depreciation (varies)

4. **Travel:**
   - Mileage to/from properties
   - Travel for property management
   - Lodging for out-of-town properties

5. **Home Office:**
   - Portion of home used exclusively for rental business
   - Utilities, insurance, repairs for home office

### Appendix D: Glossary

- **MACRS:** Modified Accelerated Cost Recovery System - IRS depreciation method
- **Schedule E:** IRS form for reporting rental income and expenses
- **Form 1099-MISC:** Reports miscellaneous income (e.g., rent paid to landlords)
- **Form 1099-NEC:** Reports non-employee compensation (e.g., contractor payments)
- **Form 8825:** Rental income and expenses for partnerships and S-corps
- **Depreciable Basis:** The portion of property value that can be depreciated
- **Capital Improvement:** Major improvement that increases property value (capitalized)
- **Repair:** Maintenance that keeps property in good condition (deductible)
- **Section 179:** Allows immediate deduction of certain property purchases
- **Bonus Depreciation:** Additional first-year depreciation for qualifying property

---

**End of Technical Specification**

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-03 | Engineering Team | Initial draft |

**Approval Required From:**
- [ ] Product Manager
- [ ] Engineering Lead
- [ ] Tax/Legal Advisor
- [ ] Security Team
- [ ] UX/UI Designer

**Next Steps:**
1. Review and approve this specification
2. Confirm implementation timeline
3. Allocate development resources
4. Schedule kickoff meeting