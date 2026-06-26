/**
 * Landlord Tax Preparation Type Definitions
 * Comprehensive types for tax tracking, document generation, and IRS compliance
 */

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
  scheduleELine: number;
  description: string;
  examples: string[];
  isDeductible: boolean;
  requiresDocumentation: boolean;
}

// Standard IRS Schedule E categories with line numbers
export const SCHEDULE_E_CATEGORIES: Record<ScheduleECategory, TaxCategory> = {
  'advertising': {
    id: 'advertising',
    name: 'Advertising',
    scheduleELine: 5,
    description: 'Costs to advertise rental property',
    examples: ['Online listings', 'Newspaper ads', 'Signs', 'Photography'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'auto-travel': {
    id: 'auto-travel',
    name: 'Auto and Travel',
    scheduleELine: 6,
    description: 'Vehicle expenses and travel costs',
    examples: ['Mileage', 'Gas', 'Parking', 'Tolls', 'Lodging'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'cleaning-maintenance': {
    id: 'cleaning-maintenance',
    name: 'Cleaning and Maintenance',
    scheduleELine: 7,
    description: 'Regular cleaning and upkeep',
    examples: ['Cleaning services', 'Lawn care', 'Snow removal', 'Pest control'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'commissions': {
    id: 'commissions',
    name: 'Commissions',
    scheduleELine: 8,
    description: 'Fees paid to agents and brokers',
    examples: ['Real estate agent fees', 'Property manager commissions', 'Finder fees'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'insurance': {
    id: 'insurance',
    name: 'Insurance',
    scheduleELine: 9,
    description: 'Property and liability insurance',
    examples: ['Property insurance', 'Liability insurance', 'Flood insurance', 'Umbrella policy'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'legal-professional': {
    id: 'legal-professional',
    name: 'Legal and Professional Fees',
    scheduleELine: 10,
    description: 'Attorney and professional service fees',
    examples: ['Attorney fees', 'Accountant fees', 'Property management software', 'Consulting'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'management-fees': {
    id: 'management-fees',
    name: 'Management Fees',
    scheduleELine: 11,
    description: 'Property management company fees',
    examples: ['Monthly management fees', 'Leasing fees', 'Tenant placement fees'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'mortgage-interest': {
    id: 'mortgage-interest',
    name: 'Mortgage Interest',
    scheduleELine: 12,
    description: 'Interest paid on property loans',
    examples: ['Mortgage interest', 'Home equity loan interest', 'Construction loan interest'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'other-interest': {
    id: 'other-interest',
    name: 'Other Interest',
    scheduleELine: 13,
    description: 'Interest not related to mortgage',
    examples: ['Credit card interest', 'Personal loan interest for property expenses'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'repairs': {
    id: 'repairs',
    name: 'Repairs',
    scheduleELine: 14,
    description: 'Repairs that maintain property condition',
    examples: ['Plumbing repairs', 'Electrical fixes', 'Painting', 'Appliance repairs'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'supplies': {
    id: 'supplies',
    name: 'Supplies',
    scheduleELine: 15,
    description: 'Materials and supplies for property',
    examples: ['Light bulbs', 'Cleaning supplies', 'Tools', 'Hardware'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'taxes': {
    id: 'taxes',
    name: 'Taxes',
    scheduleELine: 16,
    description: 'Property taxes and other deductible taxes',
    examples: ['Property taxes', 'Personal property taxes', 'Payroll taxes for employees'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'utilities': {
    id: 'utilities',
    name: 'Utilities',
    scheduleELine: 17,
    description: 'Utility costs paid by landlord',
    examples: ['Electricity', 'Gas', 'Water', 'Sewer', 'Trash', 'Internet'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'depreciation': {
    id: 'depreciation',
    name: 'Depreciation',
    scheduleELine: 18,
    description: 'Depreciation expense for property and improvements',
    examples: ['Building depreciation', 'Appliance depreciation', 'Improvement depreciation'],
    isDeductible: true,
    requiresDocumentation: true
  },
  'other': {
    id: 'other',
    name: 'Other Expenses',
    scheduleELine: 19,
    description: 'Other deductible expenses not listed above',
    examples: ['HOA fees', 'Bank fees', 'Office supplies', 'Education'],
    isDeductible: true,
    requiresDocumentation: true
  }
};

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
  propertySummaries: PropertyTaxSummary[];
  
  // Completion status
  incomeRecorded: boolean;
  expensesCategorized: boolean;
  receiptsUploaded: boolean;
  depreciationCalculated: boolean;
  documentsGenerated: boolean;
  
  // Metadata
  lastUpdated: Date;
  completionPercentage: number;
}

export interface PropertyTaxSummary {
  propertyId: string;
  address: string;
  propertyType: string;
  income: number;
  expenses: number;
  depreciation: number;
  netIncome: number;
  daysRented: number;
  personalUseDays: number;
}

// ============================================================================
// Tax Documents
// ============================================================================

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

export interface TaxDocument {
  id: string;
  landlordId: string;
  taxYear: number;
  documentType: TaxDocumentType;
  status: TaxDocumentStatus;
  
  // Content
  data: ScheduleEData | Form1099Data | TaxSummaryData;
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

// ============================================================================
// Schedule E Data Structure
// ============================================================================

export interface ScheduleEData {
  taxYear: number;
  landlordInfo: {
    name: string;
    ssn?: string;
    address: string;
  };
  
  properties: ScheduleEProperty[];
  
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalDepreciation: number;
    netIncome: number;
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
    ein?: string;
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
  ssn?: string;
  address: string;
  
  // Payment info
  totalPayments: number;
  paymentCategory: 'rent' | 'services' | 'other-income';
  
  // Box assignments
  box1Rents?: number;
  box3OtherIncome?: number;
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
// Tax Summary Data
// ============================================================================

export interface TaxSummaryData {
  taxYear: number;
  landlordId: string;
  
  summary: {
    totalProperties: number;
    totalIncome: number;
    totalExpenses: number;
    totalDepreciation: number;
    netIncome: number;
    effectiveTaxRate?: number;
  };
  
  propertyBreakdown: PropertyTaxSummary[];
  
  expenseBreakdown: {
    category: ScheduleECategory;
    amount: number;
    percentage: number;
  }[];
  
  comparisonToPriorYear?: {
    incomeChange: number;
    expenseChange: number;
    netIncomeChange: number;
  };
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
  landValue: number;
  depreciableBasis: number;
  
  // Depreciation method
  method: 'MACRS' | 'SL' | 'ADS';
  recoveryPeriod: number;
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
  depreciationScheduleId?: string;
  isDepreciable: boolean;
  
  // Documentation
  invoices: string[];
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
// Tax Reminders & Calendar
// ============================================================================

export type TaxReminderType =
  | 'quarterly-estimated-tax'
  | 'property-tax-payment'
  | 'insurance-renewal'
  | 'tax-return-deadline'
  | 'document-collection'
  | 'depreciation-review'
  | '1099-filing-deadline';

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

// ============================================================================
// Expense Filter & Search
// ============================================================================

export interface ExpenseFilter {
  taxYear?: number;
  propertyIds?: string[];
  categories?: ScheduleECategory[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  hasReceipt?: boolean;
  isDeductible?: boolean;
  isCapitalImprovement?: boolean;
  searchQuery?: string;
}

// ============================================================================
// Export Configuration
// ============================================================================

export interface TaxExportConfig {
  id: string;
  landlordId: string;
  
  exportType: 'turbotax' | 'quickbooks' | 'xero' | 'hrblock' | 'csv' | 'pdf';
  
  // Export settings
  includeAttachments: boolean;
  includeReceipts: boolean;
  format: 'standard' | 'detailed' | 'summary';
  
  // Field mapping
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

// ============================================================================
// Form Data Types
// ============================================================================

export interface ExpenseCategorization {
  expenseId: string;
  suggestedCategory: ScheduleECategory;
  confidence: number;
  reasoning: string;
  alternativeCategories?: {
    category: ScheduleECategory;
    confidence: number;
  }[];
}