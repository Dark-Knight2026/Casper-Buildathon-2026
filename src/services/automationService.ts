/**
 * Automation Service
 * Service for automated lease renewals, payment reconciliation, and late fees
 */

import type {
  RenewalOffer,
  RenewalSchedule,
  BankStatement,
  BankTransaction,
  PaymentReconciliation,
  ReconciliationReport,
  LateFee,
  LateFeePolicy,
  LateFeeSchedule,
  AutomationLog,
} from '@/types/automation';

class AutomationService {
  // ==================== Automated Lease Renewals ====================

  async getRenewalSchedule(): Promise<RenewalSchedule> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: 'schedule_1',
      enabled: true,
      daysBeforeExpiration: 60,
      autoSendEnabled: true,
      rentIncreasePercentage: 3,
      defaultTermMonths: 12,
      lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async updateRenewalSchedule(schedule: Partial<RenewalSchedule>): Promise<RenewalSchedule> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: 'schedule_1',
      enabled: schedule.enabled ?? true,
      daysBeforeExpiration: schedule.daysBeforeExpiration ?? 60,
      autoSendEnabled: schedule.autoSendEnabled ?? true,
      rentIncreasePercentage: schedule.rentIncreasePercentage,
      rentIncreaseAmount: schedule.rentIncreaseAmount,
      defaultTermMonths: schedule.defaultTermMonths ?? 12,
      lastRunAt: new Date().toISOString(),
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async checkExpiringLeases(): Promise<{ leaseId: string; tenantName: string; endDate: string; daysUntilExpiration: number }[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return [
      {
        leaseId: 'lease_1',
        tenantName: 'John Doe',
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiration: 45,
      },
      {
        leaseId: 'lease_2',
        tenantName: 'Jane Smith',
        endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiration: 75,
      },
    ];
  }

  async generateRenewalOffer(leaseId: string): Promise<RenewalOffer> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const currentDate = new Date();
    const endDate = new Date(currentDate.getTime() + 45 * 24 * 60 * 60 * 1000);
    const proposedStartDate = new Date(endDate.getTime() + 1 * 24 * 60 * 60 * 1000);
    const proposedEndDate = new Date(proposedStartDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    return {
      id: `renewal_${Date.now()}`,
      leaseId,
      tenantId: 'tenant_1',
      propertyId: 'property_1',
      currentRent: 1500,
      proposedRent: 1545, // 3% increase
      currentEndDate: endDate.toISOString(),
      proposedStartDate: proposedStartDate.toISOString(),
      proposedEndDate: proposedEndDate.toISOString(),
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async sendRenewalOffer(offerId: string): Promise<void> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`Renewal offer ${offerId} sent to tenant`);
  }

  async getRenewalOffers(filters?: { status?: string; tenantId?: string }): Promise<RenewalOffer[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: 'renewal_1',
        leaseId: 'lease_1',
        tenantId: 'tenant_1',
        propertyId: 'property_1',
        currentRent: 1500,
        proposedRent: 1545,
        currentEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        proposedStartDate: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000).toISOString(),
        proposedEndDate: new Date(Date.now() + 411 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  // ==================== Payment Reconciliation ====================

  async uploadBankStatement(file: File): Promise<BankStatement> {
    // Simulate file upload and processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      id: `statement_${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      fileName: file.name,
      fileSize: file.size,
      format: file.name.endsWith('.csv') ? 'csv' : 'ofx',
      accountNumber: '****1234',
      statementDate: new Date().toISOString(),
      openingBalance: 50000,
      closingBalance: 52500,
      transactionCount: 15,
      status: 'completed',
    };
  }

  async getBankStatements(): Promise<BankStatement[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: 'statement_1',
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        fileName: 'bank_statement_december.csv',
        fileSize: 15420,
        format: 'csv',
        accountNumber: '****1234',
        statementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        openingBalance: 48000,
        closingBalance: 50000,
        transactionCount: 12,
        status: 'completed',
      },
    ];
  }

  async getTransactions(statementId: string): Promise<BankTransaction[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: 'txn_1',
        statementId,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'RENT PAYMENT - JOHN DOE',
        amount: 1500,
        type: 'credit',
        balance: 49500,
        reference: 'REF123456',
        matchStatus: 'matched',
        matchedPaymentId: 'payment_1',
        matchConfidence: 98,
      },
      {
        id: 'txn_2',
        statementId,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'RENT PAYMENT - JANE SMITH',
        amount: 1200,
        type: 'credit',
        balance: 50700,
        reference: 'REF123457',
        matchStatus: 'matched',
        matchedPaymentId: 'payment_2',
        matchConfidence: 95,
      },
      {
        id: 'txn_3',
        statementId,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'UNKNOWN DEPOSIT',
        amount: 800,
        type: 'credit',
        balance: 51500,
        matchStatus: 'unmatched',
        matchConfidence: 0,
      },
    ];
  }

  async reconcileTransactions(statementId: string): Promise<PaymentReconciliation[]> {
    // Simulate API call - auto-match transactions
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return [
      {
        id: 'recon_1',
        statementId,
        transactionId: 'txn_1',
        paymentId: 'payment_1',
        tenantId: 'tenant_1',
        propertyId: 'property_1',
        matchType: 'auto',
        matchConfidence: 98,
        status: 'matched',
        reconciledAt: new Date().toISOString(),
      },
      {
        id: 'recon_2',
        statementId,
        transactionId: 'txn_2',
        paymentId: 'payment_2',
        tenantId: 'tenant_2',
        propertyId: 'property_2',
        matchType: 'auto',
        matchConfidence: 95,
        status: 'matched',
        reconciledAt: new Date().toISOString(),
      },
    ];
  }

  async generateReconciliationReport(statementId: string): Promise<ReconciliationReport> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      id: `report_${Date.now()}`,
      statementId,
      generatedAt: new Date().toISOString(),
      totalTransactions: 15,
      matchedTransactions: 13,
      unmatchedTransactions: 2,
      partialMatches: 0,
      totalMatched: 18500,
      totalUnmatched: 800,
      discrepancies: 0,
      matchRate: 86.67,
      summary: {
        expectedPayments: 19000,
        receivedPayments: 19300,
        variance: 300,
      },
    };
  }

  async manualMatch(transactionId: string, paymentId: string): Promise<PaymentReconciliation> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: `recon_${Date.now()}`,
      statementId: 'statement_1',
      transactionId,
      paymentId,
      matchType: 'manual',
      matchConfidence: 100,
      status: 'matched',
      reconciledBy: 'user_1',
      reconciledAt: new Date().toISOString(),
    };
  }

  // ==================== Automated Late Fees ====================

  async getLateFeePolicy(propertyId?: string): Promise<LateFeePolicy> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: 'policy_1',
      propertyId,
      enabled: true,
      gracePeriodDays: 5,
      feeType: 'flat',
      flatFeeAmount: 50,
      notifyTenant: true,
      autoApply: true,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateLateFeePolicy(policy: Partial<LateFeePolicy>): Promise<LateFeePolicy> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: policy.id || 'policy_1',
      propertyId: policy.propertyId,
      enabled: policy.enabled ?? true,
      gracePeriodDays: policy.gracePeriodDays ?? 5,
      feeType: policy.feeType ?? 'flat',
      flatFeeAmount: policy.flatFeeAmount,
      percentageRate: policy.percentageRate,
      maxFeeAmount: policy.maxFeeAmount,
      recurringDaily: policy.recurringDaily,
      notifyTenant: policy.notifyTenant ?? true,
      autoApply: policy.autoApply ?? true,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getLateFeeSchedule(): Promise<LateFeeSchedule> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: 'schedule_1',
      enabled: true,
      runTime: '09:00',
      lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      feesApplied: 3,
      notificationsSent: 3,
    };
  }

  async checkOverduePayments(): Promise<{ paymentId: string; tenantName: string; amount: number; daysLate: number }[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return [
      {
        paymentId: 'payment_1',
        tenantName: 'John Doe',
        amount: 1500,
        daysLate: 7,
      },
      {
        paymentId: 'payment_2',
        tenantName: 'Jane Smith',
        amount: 1200,
        daysLate: 10,
      },
    ];
  }

  async calculateLateFee(paymentId: string): Promise<{ feeAmount: number; feeType: string; daysLate: number }> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      feeAmount: 50,
      feeType: 'flat',
      daysLate: 7,
    };
  }

  async applyLateFee(paymentId: string): Promise<LateFee> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: `fee_${Date.now()}`,
      paymentId,
      tenantId: 'tenant_1',
      leaseId: 'lease_1',
      propertyId: 'property_1',
      originalAmount: 1500,
      feeAmount: 50,
      feeType: 'flat',
      daysLate: 7,
      gracePeriodDays: 5,
      appliedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'applied',
    };
  }

  async getLateFees(filters?: { status?: string; tenantId?: string }): Promise<LateFee[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: 'fee_1',
        paymentId: 'payment_1',
        tenantId: 'tenant_1',
        leaseId: 'lease_1',
        propertyId: 'property_1',
        originalAmount: 1500,
        feeAmount: 50,
        feeType: 'flat',
        daysLate: 7,
        gracePeriodDays: 5,
        appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'applied',
      },
    ];
  }

  async waiveLateFee(feeId: string, reason: string): Promise<LateFee> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: feeId,
      paymentId: 'payment_1',
      tenantId: 'tenant_1',
      leaseId: 'lease_1',
      propertyId: 'property_1',
      originalAmount: 1500,
      feeAmount: 50,
      feeType: 'flat',
      daysLate: 7,
      gracePeriodDays: 5,
      appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'waived',
      waivedBy: 'user_1',
      waivedAt: new Date().toISOString(),
      waiverReason: reason,
    };
  }

  // ==================== Automation Logs ====================

  async getAutomationLogs(type?: 'renewal' | 'reconciliation' | 'late_fee'): Promise<AutomationLog[]> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: 'log_1',
        type: 'renewal',
        action: 'Generated renewal offers',
        status: 'success',
        details: { offersGenerated: 2, offersSent: 2 },
        executedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        executionTime: 1250,
      },
      {
        id: 'log_2',
        type: 'late_fee',
        action: 'Applied late fees',
        status: 'success',
        details: { feesApplied: 3, notificationsSent: 3 },
        executedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        executionTime: 850,
      },
    ];
  }
}

export const automationService = new AutomationService();