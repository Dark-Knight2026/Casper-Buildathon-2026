/**
 * Automation Types
 * Types for automated lease renewals, payment reconciliation, and late fees
 */

export interface RenewalOffer {
  id: string;
  leaseId: string;
  tenantId: string;
  propertyId: string;
  currentRent: number;
  proposedRent: number;
  currentEndDate: string;
  proposedStartDate: string;
  proposedEndDate: string;
  status: 'pending' | 'accepted' | 'negotiating' | 'declined' | 'expired';
  sentAt: string;
  respondedAt?: string;
  expiresAt: string;
  terms?: string;
  notes?: string;
}

export interface RenewalSchedule {
  id: string;
  enabled: boolean;
  daysBeforeExpiration: number; // Default: 60-90 days
  autoSendEnabled: boolean;
  rentIncreasePercentage?: number;
  rentIncreaseAmount?: number;
  defaultTermMonths: number; // Default: 12 months
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface BankStatement {
  id: string;
  uploadedAt: string;
  fileName: string;
  fileSize: number;
  format: 'csv' | 'ofx' | 'qbo';
  accountNumber: string;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  transactionCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BankTransaction {
  id: string;
  statementId: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance?: number;
  reference?: string;
  matchStatus: 'matched' | 'unmatched' | 'partial' | 'review';
  matchedPaymentId?: string;
  matchConfidence?: number; // 0-100
}

export interface PaymentReconciliation {
  id: string;
  statementId: string;
  transactionId: string;
  paymentId?: string;
  tenantId?: string;
  propertyId?: string;
  matchType: 'auto' | 'manual' | 'suggested';
  matchConfidence: number;
  discrepancy?: number;
  status: 'matched' | 'pending_review' | 'disputed' | 'resolved';
  reconciledBy?: string;
  reconciledAt?: string;
  notes?: string;
}

export interface ReconciliationReport {
  id: string;
  statementId: string;
  generatedAt: string;
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  partialMatches: number;
  totalMatched: number;
  totalUnmatched: number;
  discrepancies: number;
  matchRate: number; // Percentage
  summary: {
    expectedPayments: number;
    receivedPayments: number;
    variance: number;
  };
}

export interface LateFee {
  id: string;
  paymentId: string;
  tenantId: string;
  leaseId: string;
  propertyId: string;
  originalAmount: number;
  feeAmount: number;
  feeType: 'flat' | 'percentage';
  feeRate?: number; // For percentage fees
  daysLate: number;
  gracePeriodDays: number;
  appliedAt: string;
  dueDate: string;
  status: 'pending' | 'applied' | 'waived' | 'paid';
  waivedBy?: string;
  waivedAt?: string;
  waiverReason?: string;
  paidAt?: string;
}

export interface LateFeePolicy {
  id: string;
  propertyId?: string; // If null, applies to all properties
  leaseId?: string; // If null, applies to all leases in property
  enabled: boolean;
  gracePeriodDays: number; // Days after due date before late fee applies
  feeType: 'flat' | 'percentage';
  flatFeeAmount?: number;
  percentageRate?: number;
  maxFeeAmount?: number;
  recurringDaily?: boolean; // Apply fee daily after grace period
  notifyTenant: boolean;
  autoApply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LateFeeSchedule {
  id: string;
  enabled: boolean;
  runTime: string; // Time of day to run (e.g., "09:00")
  lastRunAt?: string;
  nextRunAt?: string;
  feesApplied: number;
  notificationsSent: number;
}

export interface AutomationLog {
  id: string;
  type: 'renewal' | 'reconciliation' | 'late_fee';
  action: string;
  status: 'success' | 'failed' | 'partial';
  details: Record<string, unknown>;
  error?: string;
  executedAt: string;
  executionTime: number; // milliseconds
}