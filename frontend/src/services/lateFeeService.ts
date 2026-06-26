/**
 * Late Fee Service
 * Handles late fee calculation and application for overdue payments
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { emailService } from './emailService';
import { smsService } from './smsService';

export interface LateFeeConfig {
  type: 'fixed' | 'percentage' | 'daily';
  amount: number; // Fixed amount or percentage
  gracePeriodDays: number;
  maxLateFee?: number;
}

export interface LateFee {
  id: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  daysOverdue: number;
  appliedDate: Date;
  paymentId?: string;
  status: 'pending' | 'paid' | 'waived';
}

class LateFeeService {
  /**
   * Calculate late fee based on lease terms
   */
  calculateLateFee(
    rentAmount: number,
    daysOverdue: number,
    config: LateFeeConfig
  ): number {
    // Check grace period
    if (daysOverdue <= config.gracePeriodDays) {
      return 0;
    }

    const effectiveDaysOverdue = daysOverdue - config.gracePeriodDays;
    let lateFee = 0;

    switch (config.type) {
      case 'fixed':
        lateFee = config.amount;
        break;
      case 'percentage':
        lateFee = (rentAmount * config.amount) / 100;
        break;
      case 'daily':
        lateFee = config.amount * effectiveDaysOverdue;
        break;
    }

    // Apply maximum cap if set
    if (config.maxLateFee && lateFee > config.maxLateFee) {
      lateFee = config.maxLateFee;
    }

    return Math.round(lateFee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get late fee configuration from lease
   */
  async getLateFeeConfig(leaseId: string): Promise<LateFeeConfig> {
    try {
      const { data: leaseData, error } = await supabase
        .from('leases')
        .select('late_fee_type, late_fee_amount, grace_period_days, max_late_fee')
        .eq('id', leaseId)
        .single();

      if (error || !leaseData) {
        // Default configuration
        return {
          type: 'fixed',
          amount: 50,
          gracePeriodDays: 5,
          maxLateFee: 200,
        };
      }

      return {
        type: (leaseData.late_fee_type as 'fixed' | 'percentage' | 'daily') || 'fixed',
        amount: leaseData.late_fee_amount || 50,
        gracePeriodDays: leaseData.grace_period_days || 5,
        maxLateFee: leaseData.max_late_fee || undefined,
      };
    } catch (error) {
      logger.error('Error getting late fee config:', error);
      // Return default configuration
      return {
        type: 'fixed',
        amount: 50,
        gracePeriodDays: 5,
        maxLateFee: 200,
      };
    }
  }

  /**
   * Check for overdue payments and apply late fees
   */
  async processOverduePayments(): Promise<{ processed: number; errors: string[] }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all pending payments that are overdue
      const { data: overduePayments, error } = await supabase
        .from('payments')
        .select('*, leases(*)')
        .eq('payment_status', 'pending')
        .lt('payment_date', today.toISOString());

      if (error) {
        logger.error('Error fetching overdue payments:', error);
        return { processed: 0, errors: [error.message] };
      }

      if (!overduePayments || overduePayments.length === 0) {
        return { processed: 0, errors: [] };
      }

      let processed = 0;
      const errors: string[] = [];

      for (const payment of overduePayments) {
        try {
          // Check if late fee already applied
          const { data: existingLateFee } = await supabase
            .from('late_fees')
            .select('id')
            .eq('payment_id', payment.id)
            .single();

          if (existingLateFee) {
            continue; // Late fee already applied
          }

          // Calculate days overdue
          const paymentDate = new Date(payment.payment_date);
          const daysOverdue = Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

          // Get late fee configuration
          const config = await this.getLateFeeConfig(payment.lease_id);

          // Calculate late fee
          const lateFeeAmount = this.calculateLateFee(payment.amount, daysOverdue, config);

          if (lateFeeAmount > 0) {
            // Create late fee record
            const { error: lateFeeError } = await supabase
              .from('late_fees')
              .insert({
                lease_id: payment.lease_id,
                tenant_id: payment.tenant_id,
                payment_id: payment.id,
                amount: lateFeeAmount,
                days_overdue: daysOverdue,
                applied_date: today.toISOString(),
                status: 'pending',
              })
              .select()
              .single();

            if (lateFeeError) {
              errors.push(`Failed to create late fee for payment ${payment.id}: ${lateFeeError.message}`);
              continue;
            }

            // Send notification
            await this.sendLateFeeNotification(
              payment.tenant_id,
              payment.lease_id,
              lateFeeAmount,
              daysOverdue
            );

            processed++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error processing payment ${payment.id}: ${errorMessage}`);
        }
      }

      return { processed, errors };
    } catch (error) {
      logger.error('Error processing overdue payments:', error);
      return {
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Failed to process overdue payments'],
      };
    }
  }

  /**
   * Send late fee notification
   */
  private async sendLateFeeNotification(
    tenantId: string,
    leaseId: string,
    lateFeeAmount: number,
    daysOverdue: number
  ): Promise<void> {
    try {
      // Get tenant and lease details
      const { data: userData } = await supabase
        .from('users')
        .select('email, full_name, phone')
        .eq('id', tenantId)
        .single();

      const { data: leaseData } = await supabase
        .from('leases')
        .select('property_address')
        .eq('id', leaseId)
        .single();

      if (!userData || !leaseData) {
        return;
      }

      const tenantName = userData.full_name || 'Tenant';
      const tenantEmail = userData.email;
      const tenantPhone = userData.phone;
      const propertyAddress = leaseData.property_address;

      // Send email notification
      await emailService.sendEmail({
        to: tenantEmail,
        subject: `Late Fee Applied - $${lateFeeAmount.toLocaleString()}`,
        html: `
          <p>Dear ${tenantName},</p>
          <p>A late fee of <strong>$${lateFeeAmount.toLocaleString()}</strong> has been applied to your account for ${propertyAddress}.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Days Overdue: ${daysOverdue} days</li>
            <li>Late Fee Amount: $${lateFeeAmount.toLocaleString()}</li>
            <li>Property: ${propertyAddress}</li>
          </ul>
          <p>Please make your payment as soon as possible to avoid additional late fees.</p>
          <p>If you have any questions, please contact us.</p>
        `,
        text: `Late fee of $${lateFeeAmount.toLocaleString()} applied for ${propertyAddress}. ${daysOverdue} days overdue. Please pay as soon as possible.`,
      });

      // Send SMS notification if phone number available
      if (tenantPhone) {
        await smsService.sendSMS({
          to: tenantPhone,
          message: `Hi ${tenantName}, a late fee of $${lateFeeAmount.toLocaleString()} has been applied to your account for ${propertyAddress}. ${daysOverdue} days overdue. Please pay ASAP. Reply STOP to unsubscribe.`,
        });
      }
    } catch (error) {
      logger.error('Error sending late fee notification:', error);
    }
  }

  /**
   * Get late fees for a lease
   */
  async getLateFeesByLeaseId(leaseId: string): Promise<LateFee[]> {
    try {
      const { data, error } = await supabase
        .from('late_fees')
        .select('*')
        .eq('lease_id', leaseId)
        .order('applied_date', { ascending: false });

      if (error) {
        logger.error('Error fetching late fees:', error);
        return [];
      }

      return (data || []).map(fee => ({
        id: fee.id,
        leaseId: fee.lease_id,
        tenantId: fee.tenant_id,
        amount: fee.amount,
        daysOverdue: fee.days_overdue,
        appliedDate: new Date(fee.applied_date),
        paymentId: fee.payment_id,
        status: fee.status as 'pending' | 'paid' | 'waived',
      }));
    } catch (error) {
      logger.error('Error in getLateFeesByLeaseId:', error);
      return [];
    }
  }

  /**
   * Waive a late fee
   */
  async waiveLateFee(lateFeeId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('late_fees')
        .update({
          status: 'waived',
          waived_reason: reason,
          waived_date: new Date().toISOString(),
        })
        .eq('id', lateFeeId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error waiving late fee:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to waive late fee',
      };
    }
  }

  /**
   * Mark late fee as paid
   */
  async markLateFeeAsPaid(lateFeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('late_fees')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString(),
        })
        .eq('id', lateFeeId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error marking late fee as paid:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark late fee as paid',
      };
    }
  }
}

export const lateFeeService = new LateFeeService();