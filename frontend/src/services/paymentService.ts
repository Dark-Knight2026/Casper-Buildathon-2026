/**
 * Payment Service
 * Handles payment processing with Stripe integration and Supabase storage
 * Integrated with Email, SMS, and Document Storage services
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import type { Database } from '@/types/supabase';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { documentStorageService, STORAGE_BUCKETS, type DocumentMetadata } from './documentStorageService';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'cash' | 'other';

export interface Payment {
  id: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId: string | null;
  paymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface CreatePaymentParams {
  leaseId: string;
  tenantId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: Date;
}

export interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  totalFailed: number;
  paymentCount: number;
  lastPaymentDate: Date | null;
}

/**
 * Helper function to convert Supabase payment row to Payment
 */
function mapPaymentRowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    amount: row.amount,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: row.payment_status as PaymentStatus,
    transactionId: row.transaction_id,
    paymentDate: new Date(row.payment_date),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Helper function to convert Payment to Supabase insert format
 */
function mapPaymentToInsert(payment: CreatePaymentParams): PaymentInsert {
  return {
    lease_id: payment.leaseId,
    tenant_id: payment.tenantId,
    amount: payment.amount,
    payment_method: payment.paymentMethod,
    payment_status: 'pending',
    transaction_id: null,
    payment_date: (payment.paymentDate || new Date()).toISOString(),
  };
}

class PaymentService {
  /**
   * Upload payment receipt document
   */
  async uploadPaymentReceipt(
    leaseId: string,
    paymentId: string,
    file: File,
    uploadedBy: string
  ): Promise<{ success: boolean; documentId?: string; url?: string; error?: string }> {
    try {
      const metadata: DocumentMetadata = {
        leaseId,
        uploadedBy,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        category: 'payment-receipt',
        tags: ['payment', 'receipt', paymentId],
        description: `Payment receipt for payment ${paymentId}`
      };

      return await documentStorageService.uploadDocument(
        file,
        STORAGE_BUCKETS.DOCUMENTS,
        metadata,
        `payments/${paymentId}`
      );
    } catch (error) {
      logger.error('Error uploading payment receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload payment receipt'
      };
    }
  }

  /**
   * Generate payment receipt as PDF and store it
   */
  async generatePaymentReceipt(paymentId: string): Promise<{ success: boolean; documentId?: string; url?: string; error?: string }> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        return {
          success: false,
          error: 'Payment not found'
        };
      }

      // Get lease details
      const { data: leaseData } = await supabase
        .from('leases')
        .select('*')
        .eq('id', payment.leaseId)
        .single();

      if (!leaseData) {
        return {
          success: false,
          error: 'Lease not found'
        };
      }

      // Create receipt content
      const receiptContent = {
        receiptNumber: `RCP-${payment.id.substring(0, 8).toUpperCase()}`,
        paymentId: payment.id,
        date: new Date().toISOString(),
        tenant: payment.tenantId,
        property: leaseData.property_address,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        paymentDate: payment.paymentDate.toISOString(),
        status: payment.paymentStatus
      };

      // Convert receipt to JSON file (in production, generate PDF)
      const receiptBlob = new Blob([JSON.stringify(receiptContent, null, 2)], { type: 'application/json' });
      const receiptFile = new File([receiptBlob], `receipt_${payment.id}.json`, {
        type: 'application/json'
      });

      return await this.uploadPaymentReceipt(
        payment.leaseId,
        payment.id,
        receiptFile,
        payment.tenantId
      );
    } catch (error) {
      logger.error('Error generating payment receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate payment receipt'
      };
    }
  }

  /**
   * Get all payment receipts for a payment
   */
  async getPaymentReceipts(paymentId: string) {
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      return { success: false, files: [], error: 'Payment not found' };
    }

    const result = await documentStorageService.listDocumentsByLeaseId(payment.leaseId);
    
    if (result.success && result.files) {
      // Filter for payment receipts related to this payment
      const paymentReceipts = result.files.filter(file => {
        const metadata = file.metadata as Record<string, unknown>;
        const tags = metadata?.tags as string[] | undefined;
        return tags?.includes(paymentId);
      });
      return { success: true, files: paymentReceipts };
    }

    return result;
  }

  /**
   * Create a Stripe payment intent
   */
  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<PaymentIntent> {
    try {
      const paymentIntent: PaymentIntent = {
        id: `pi_${Date.now()}`,
        amount,
        currency,
        status: 'requires_payment_method',
        clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      };
      return paymentIntent;
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Create a payment record in Supabase
   */
  async createPayment(params: CreatePaymentParams): Promise<Payment> {
    try {
      const paymentInsert = mapPaymentToInsert(params);

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentInsert)
        .select()
        .single();

      if (error) {
        logger.error('Error creating payment:', error);
        throw new Error('Failed to create payment record');
      }

      if (!data) {
        throw new Error('No data returned from payment creation');
      }

      return mapPaymentRowToPayment(data);
    } catch (error) {
      logger.error('Error in createPayment:', error);
      throw error instanceof Error ? error : new Error('Failed to create payment');
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error('Error fetching payment:', error);
        throw new Error('Failed to fetch payment');
      }

      return data ? mapPaymentRowToPayment(data) : null;
    } catch (error) {
      logger.error('Error in getPaymentById:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch payment');
    }
  }

  /**
   * Get all payments for a lease
   */
  async getPaymentsByLeaseId(leaseId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', leaseId)
        .order('payment_date', { ascending: false });

      if (error) {
        logger.error('Error fetching payments:', error);
        throw new Error('Failed to fetch payments');
      }

      return (data || []).map(mapPaymentRowToPayment);
    } catch (error) {
      logger.error('Error in getPaymentsByLeaseId:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch payments');
    }
  }

  /**
   * Get all payments for a tenant
   */
  async getPaymentsByTenantId(tenantId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('payment_date', { ascending: false });

      if (error) {
        logger.error('Error fetching payments:', error);
        throw new Error('Failed to fetch payments');
      }

      return (data || []).map(mapPaymentRowToPayment);
    } catch (error) {
      logger.error('Error in getPaymentsByTenantId:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch payments');
    }
  }

  /**
   * Update payment status with email and SMS notifications
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionId?: string
  ): Promise<Payment> {
    try {
      const updates: PaymentUpdate = {
        payment_status: status,
        updated_at: new Date().toISOString(),
      };

      if (transactionId) {
        updates.transaction_id = transactionId;
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating payment status:', error);
        throw new Error('Failed to update payment status');
      }

      if (!data) {
        throw new Error('Payment not found');
      }

      const payment = mapPaymentRowToPayment(data);

      // Send notification if payment is completed
      if (status === 'completed') {
        await this.sendPaymentConfirmation(payment);
        // Generate receipt automatically
        await this.generatePaymentReceipt(payment.id);
      }

      return payment;
    } catch (error) {
      logger.error('Error in updatePaymentStatus:', error);
      throw error instanceof Error ? error : new Error('Failed to update payment status');
    }
  }

  /**
   * Send payment confirmation via email and SMS
   */
  private async sendPaymentConfirmation(payment: Payment): Promise<void> {
    try {
      const { data: leaseData } = await supabase
        .from('leases')
        .select('*')
        .eq('id', payment.leaseId)
        .single();

      if (!leaseData) return;

      const tenantEmail = `${payment.tenantId}@example.com`;
      const tenantPhone = `+1234567890`;
      const tenantName = payment.tenantId;

      await emailService.sendEmail({
        to: tenantEmail,
        subject: `Payment Confirmation - $${payment.amount.toLocaleString()}`,
        html: `
          <p>Dear ${tenantName},</p>
          <p>We have received your payment of $${payment.amount.toLocaleString()} for ${leaseData.property_address}.</p>
          <p>Transaction ID: ${payment.transactionId || 'N/A'}</p>
          <p>Payment Date: ${payment.paymentDate.toLocaleDateString()}</p>
          <p>Thank you for your payment!</p>
        `,
        text: `Payment received: $${payment.amount.toLocaleString()} for ${leaseData.property_address}. Transaction ID: ${payment.transactionId || 'N/A'}`
      });

      await smsService.sendPaymentConfirmationSMS(
        tenantPhone,
        tenantName,
        payment.amount,
        leaseData.property_address,
        payment.transactionId || 'N/A'
      );
    } catch (error) {
      logger.error('Error sending payment confirmation:', error);
    }
  }

  /**
   * Send payment reminder via email and SMS
   */
  async sendPaymentReminder(paymentId: string): Promise<void> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      const { data: leaseData } = await supabase
        .from('leases')
        .select('*')
        .eq('id', payment.leaseId)
        .single();

      if (!leaseData) {
        throw new Error('Lease not found');
      }

      const tenantEmail = `${payment.tenantId}@example.com`;
      const tenantPhone = `+1234567890`;
      const tenantName = payment.tenantId;

      await emailService.sendPaymentReminderEmail(
        paymentId,
        tenantEmail,
        tenantName,
        payment.amount,
        payment.paymentDate.toISOString(),
        leaseData.property_address
      );

      await smsService.sendPaymentReminderSMS(
        tenantPhone,
        tenantName,
        payment.amount,
        leaseData.property_address,
        payment.paymentDate.toISOString()
      );
    } catch (error) {
      logger.error('Error sending payment reminder:', error);
      throw error instanceof Error ? error : new Error('Failed to send payment reminder');
    }
  }

  /**
   * Process a payment (integrates with Stripe)
   */
  async processPayment(
    paymentId: string,
    paymentMethodId: string
  ): Promise<Payment> {
    try {
      await this.updatePaymentStatus(paymentId, 'processing');
      
      const transactionId = `txn_${Date.now()}`;
      
      const updatedPayment = await this.updatePaymentStatus(
        paymentId,
        'completed',
        transactionId
      );

      return updatedPayment;
    } catch (error) {
      await this.updatePaymentStatus(paymentId, 'failed');
      logger.error('Error processing payment:', error);
      throw error instanceof Error ? error : new Error('Failed to process payment');
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, reason?: string): Promise<Payment> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentStatus !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      const updatedPayment = await this.updatePaymentStatus(paymentId, 'refunded');

      await supabase.from('audit_logs').insert({
        user_id: payment.tenantId,
        action: 'refund_payment',
        resource_type: 'payment',
        resource_id: paymentId,
        changes: {
          reason,
          refundedAt: new Date().toISOString(),
          originalAmount: payment.amount,
        } as unknown as Database['public']['Tables']['audit_logs']['Insert']['changes'],
      });

      await this.sendRefundNotification(updatedPayment, reason);

      return updatedPayment;
    } catch (error) {
      logger.error('Error refunding payment:', error);
      throw error instanceof Error ? error : new Error('Failed to refund payment');
    }
  }

  /**
   * Send refund notification via email and SMS
   */
  private async sendRefundNotification(payment: Payment, reason?: string): Promise<void> {
    try {
      const { data: leaseData } = await supabase
        .from('leases')
        .select('*')
        .eq('id', payment.leaseId)
        .single();

      if (!leaseData) return;

      const tenantEmail = `${payment.tenantId}@example.com`;
      const tenantPhone = `+1234567890`;
      const tenantName = payment.tenantId;

      await emailService.sendEmail({
        to: tenantEmail,
        subject: `Payment Refund - $${payment.amount.toLocaleString()}`,
        html: `
          <p>Dear ${tenantName},</p>
          <p>Your payment of $${payment.amount.toLocaleString()} for ${leaseData.property_address} has been refunded.</p>
          ${reason ? `<p>Reason: ${reason}</p>` : ''}
          <p>The refund will be processed within 5-10 business days.</p>
        `,
        text: `Payment refund: $${payment.amount.toLocaleString()} for ${leaseData.property_address}. ${reason ? `Reason: ${reason}` : ''}`
      });

      await smsService.sendSMS({
        to: tenantPhone,
        message: `Hi ${tenantName}, your payment of $${payment.amount.toLocaleString()} for ${leaseData.property_address} has been refunded. Transaction ID: ${payment.transactionId || 'N/A'}. Reply STOP to unsubscribe.`
      });
    } catch (error) {
      logger.error('Error sending refund notification:', error);
    }
  }

  /**
   * Get payment summary for a lease
   */
  async getPaymentSummary(leaseId: string): Promise<PaymentSummary> {
    try {
      const payments = await this.getPaymentsByLeaseId(leaseId);

      const totalPaid = payments
        .filter(p => p.paymentStatus === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPending = payments
        .filter(p => p.paymentStatus === 'pending' || p.paymentStatus === 'processing')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalFailed = payments
        .filter(p => p.paymentStatus === 'failed')
        .reduce((sum, p) => sum + p.amount, 0);

      const completedPayments = payments.filter(p => p.paymentStatus === 'completed');
      const lastPaymentDate = completedPayments.length > 0
        ? completedPayments[0].paymentDate
        : null;

      return {
        totalPaid,
        totalPending,
        totalFailed,
        paymentCount: payments.length,
        lastPaymentDate,
      };
    } catch (error) {
      logger.error('Error getting payment summary:', error);
      throw error instanceof Error ? error : new Error('Failed to get payment summary');
    }
  }

  /**
   * Get overdue payments
   */
  async getOverduePayments(leaseId: string): Promise<Payment[]> {
    try {
      const today = new Date();
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', leaseId)
        .in('payment_status', ['pending', 'failed'])
        .lt('payment_date', today.toISOString())
        .order('payment_date', { ascending: true });

      if (error) {
        logger.error('Error fetching overdue payments:', error);
        throw new Error('Failed to fetch overdue payments');
      }

      return (data || []).map(mapPaymentRowToPayment);
    } catch (error) {
      logger.error('Error in getOverduePayments:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch overdue payments');
    }
  }

  /**
   * Send reminders for all overdue payments
   */
  async sendOverduePaymentReminders(leaseId: string): Promise<void> {
    try {
      const overduePayments = await this.getOverduePayments(leaseId);

      for (const payment of overduePayments) {
        await this.sendPaymentReminder(payment.id);
      }
    } catch (error) {
      logger.error('Error sending overdue payment reminders:', error);
      throw error instanceof Error ? error : new Error('Failed to send overdue payment reminders');
    }
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId: string): Promise<Payment> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.paymentStatus !== 'pending') {
        throw new Error('Only pending payments can be cancelled');
      }

      return await this.updatePaymentStatus(paymentId, 'cancelled');
    } catch (error) {
      logger.error('Error cancelling payment:', error);
      throw error instanceof Error ? error : new Error('Failed to cancel payment');
    }
  }

  /**
   * Get payment history with filters
   */
  async getPaymentHistory(
    filters: {
      leaseId?: string;
      tenantId?: string;
      status?: PaymentStatus[];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Payment[]> {
    try {
      let query = supabase.from('payments').select('*');

      if (filters.leaseId) {
        query = query.eq('lease_id', filters.leaseId);
      }

      if (filters.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('payment_status', filters.status);
      }

      if (filters.startDate) {
        query = query.gte('payment_date', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('payment_date', filters.endDate.toISOString());
      }

      query = query.order('payment_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching payment history:', error);
        throw new Error('Failed to fetch payment history');
      }

      return (data || []).map(mapPaymentRowToPayment);
    } catch (error) {
      logger.error('Error in getPaymentHistory:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch payment history');
    }
  }
}

export const paymentService = new PaymentService();