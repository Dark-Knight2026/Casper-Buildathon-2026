/**
 * Payment Reminder Service
 * Handles automated payment reminders for upcoming and overdue payments
 */

import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';
import { emailService } from './emailService';
import { smsService } from './smsService';

export interface ReminderConfig {
  daysBeforeDue: number[];
  daysAfterDue: number[];
  sendEmail: boolean;
  sendSMS: boolean;
}

export interface PaymentReminder {
  id: string;
  paymentId: string;
  leaseId: string;
  tenantId: string;
  reminderType: 'before_due' | 'on_due' | 'overdue';
  daysOffset: number;
  sentDate: Date;
  status: 'sent' | 'opened' | 'clicked';
}

interface PaymentWithRelations {
  id: string;
  lease_id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  users: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
  leases: {
    property_address: string;
  };
}

class PaymentReminderService {
  private defaultConfig: ReminderConfig = {
    daysBeforeDue: [7, 3, 1],
    daysAfterDue: [3, 7, 14],
    sendEmail: true,
    sendSMS: false, // SMS only for overdue by default
  };

  /**
   * Get reminder configuration (can be customized per lease)
   */
  private getReminderConfig(): ReminderConfig {
    return this.defaultConfig;
  }

  /**
   * Process all payment reminders for today
   */
  async processPaymentReminders(): Promise<{ sent: number; errors: string[] }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const config = this.getReminderConfig();
      let sent = 0;
      const errors: string[] = [];

      // Process reminders before due date
      for (const days of config.daysBeforeDue) {
        const result = await this.sendRemindersBeforeDue(days, today);
        sent += result.sent;
        errors.push(...result.errors);
      }

      // Process reminders on due date
      const onDueResult = await this.sendRemindersOnDue(today);
      sent += onDueResult.sent;
      errors.push(...onDueResult.errors);

      // Process reminders after due date (overdue)
      for (const days of config.daysAfterDue) {
        const result = await this.sendRemindersAfterDue(days, today);
        sent += result.sent;
        errors.push(...result.errors);
      }

      return { sent, errors };
    } catch (error) {
      logger.error('Error processing payment reminders:', error);
      return {
        sent: 0,
        errors: [error instanceof Error ? error.message : 'Failed to process payment reminders'],
      };
    }
  }

  /**
   * Send reminders for payments due in X days
   */
  private async sendRemindersBeforeDue(
    daysBeforeDue: number,
    today: Date
  ): Promise<{ sent: number; errors: string[] }> {
    try {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysBeforeDue);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get pending payments due on target date
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*, leases(*), users!payments_tenant_id_fkey(*)')
        .eq('payment_status', 'pending')
        .gte('payment_date', targetDate.toISOString())
        .lt('payment_date', nextDay.toISOString());

      if (error) {
        return { sent: 0, errors: [error.message] };
      }

      if (!payments || payments.length === 0) {
        return { sent: 0, errors: [] };
      }

      let sent = 0;
      const errors: string[] = [];

      for (const payment of payments) {
        try {
          // Check if reminder already sent
          const { data: existingReminder } = await supabase
            .from('payment_reminders')
            .select('id')
            .eq('payment_id', payment.id)
            .eq('reminder_type', 'before_due')
            .eq('days_offset', daysBeforeDue)
            .single();

          if (existingReminder) {
            continue; // Reminder already sent
          }

          // Send reminder
          await this.sendReminderNotification(
            payment as unknown as PaymentWithRelations,
            'before_due',
            daysBeforeDue
          );

          // Record reminder
          await supabase.from('payment_reminders').insert({
            payment_id: payment.id,
            lease_id: payment.lease_id,
            tenant_id: payment.tenant_id,
            reminder_type: 'before_due',
            days_offset: daysBeforeDue,
            sent_date: new Date().toISOString(),
            status: 'sent',
          });

          sent++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to send reminder for payment ${payment.id}: ${errorMessage}`);
        }
      }

      return { sent, errors };
    } catch (error) {
      logger.error('Error sending reminders before due:', error);
      return {
        sent: 0,
        errors: [error instanceof Error ? error.message : 'Failed to send reminders'],
      };
    }
  }

  /**
   * Send reminders for payments due today
   */
  private async sendRemindersOnDue(today: Date): Promise<{ sent: number; errors: string[] }> {
    try {
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get pending payments due today
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*, leases(*), users!payments_tenant_id_fkey(*)')
        .eq('payment_status', 'pending')
        .gte('payment_date', today.toISOString())
        .lt('payment_date', nextDay.toISOString());

      if (error) {
        return { sent: 0, errors: [error.message] };
      }

      if (!payments || payments.length === 0) {
        return { sent: 0, errors: [] };
      }

      let sent = 0;
      const errors: string[] = [];

      for (const payment of payments) {
        try {
          const { data: existingReminder } = await supabase
            .from('payment_reminders')
            .select('id')
            .eq('payment_id', payment.id)
            .eq('reminder_type', 'on_due')
            .single();

          if (existingReminder) {
            continue;
          }

          await this.sendReminderNotification(payment as unknown as PaymentWithRelations, 'on_due', 0);

          await supabase.from('payment_reminders').insert({
            payment_id: payment.id,
            lease_id: payment.lease_id,
            tenant_id: payment.tenant_id,
            reminder_type: 'on_due',
            days_offset: 0,
            sent_date: new Date().toISOString(),
            status: 'sent',
          });

          sent++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to send on-due reminder for payment ${payment.id}: ${errorMessage}`);
        }
      }

      return { sent, errors };
    } catch (error) {
      logger.error('Error sending reminders on due:', error);
      return {
        sent: 0,
        errors: [error instanceof Error ? error.message : 'Failed to send reminders'],
      };
    }
  }

  /**
   * Send reminders for overdue payments
   */
  private async sendRemindersAfterDue(
    daysAfterDue: number,
    today: Date
  ): Promise<{ sent: number; errors: string[] }> {
    try {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysAfterDue);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get overdue payments
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*, leases(*), users!payments_tenant_id_fkey(*)')
        .eq('payment_status', 'pending')
        .gte('payment_date', targetDate.toISOString())
        .lt('payment_date', nextDay.toISOString());

      if (error) {
        return { sent: 0, errors: [error.message] };
      }

      if (!payments || payments.length === 0) {
        return { sent: 0, errors: [] };
      }

      let sent = 0;
      const errors: string[] = [];

      for (const payment of payments) {
        try {
          const { data: existingReminder } = await supabase
            .from('payment_reminders')
            .select('id')
            .eq('payment_id', payment.id)
            .eq('reminder_type', 'overdue')
            .eq('days_offset', daysAfterDue)
            .single();

          if (existingReminder) {
            continue;
          }

          // Send reminder (with SMS for overdue)
          await this.sendReminderNotification(
            payment as unknown as PaymentWithRelations,
            'overdue',
            daysAfterDue,
            true // Send SMS for overdue
          );

          await supabase.from('payment_reminders').insert({
            payment_id: payment.id,
            lease_id: payment.lease_id,
            tenant_id: payment.tenant_id,
            reminder_type: 'overdue',
            days_offset: daysAfterDue,
            sent_date: new Date().toISOString(),
            status: 'sent',
          });

          sent++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to send overdue reminder for payment ${payment.id}: ${errorMessage}`);
        }
      }

      return { sent, errors };
    } catch (error) {
      logger.error('Error sending reminders after due:', error);
      return {
        sent: 0,
        errors: [error instanceof Error ? error.message : 'Failed to send reminders'],
      };
    }
  }

  /**
   * Send reminder notification via email and optionally SMS
   */
  private async sendReminderNotification(
    payment: PaymentWithRelations,
    reminderType: 'before_due' | 'on_due' | 'overdue',
    daysOffset: number,
    sendSMS: boolean = false
  ): Promise<void> {
    try {
      const tenant = payment.users;
      const lease = payment.leases;

      if (!tenant || !lease) {
        throw new Error('Missing tenant or lease data');
      }

      const tenantName = tenant.full_name || 'Tenant';
      const tenantEmail = tenant.email;
      const tenantPhone = tenant.phone;
      const propertyAddress = lease.property_address;
      const amount = payment.amount;
      const dueDate = new Date(payment.payment_date);

      // Generate payment link
      const paymentLink = `${import.meta.env.VITE_APP_URL}/tenant/payments/make-payment?paymentId=${payment.id}`;

      // Prepare email content based on reminder type
      let subject = '';
      let emailHtml = '';
      let emailText = '';

      if (reminderType === 'before_due') {
        subject = `Payment Reminder - Due in ${daysOffset} days`;
        emailHtml = `
          <p>Dear ${tenantName},</p>
          <p>This is a friendly reminder that your rent payment of <strong>$${amount.toLocaleString()}</strong> for ${propertyAddress} is due in <strong>${daysOffset} days</strong>.</p>
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Amount: $${amount.toLocaleString()}</li>
            <li>Due Date: ${dueDate.toLocaleDateString()}</li>
            <li>Property: ${propertyAddress}</li>
          </ul>
          <p><a href="${paymentLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Make Payment</a></p>
          <p>Thank you for your prompt payment!</p>
        `;
        emailText = `Payment of $${amount.toLocaleString()} due in ${daysOffset} days for ${propertyAddress}. Due date: ${dueDate.toLocaleDateString()}. Pay now: ${paymentLink}`;
      } else if (reminderType === 'on_due') {
        subject = `Payment Due Today - $${amount.toLocaleString()}`;
        emailHtml = `
          <p>Dear ${tenantName},</p>
          <p>Your rent payment of <strong>$${amount.toLocaleString()}</strong> for ${propertyAddress} is <strong>due today</strong>.</p>
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Amount: $${amount.toLocaleString()}</li>
            <li>Due Date: ${dueDate.toLocaleDateString()} (Today)</li>
            <li>Property: ${propertyAddress}</li>
          </ul>
          <p><a href="${paymentLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Make Payment Now</a></p>
          <p>Please make your payment today to avoid late fees.</p>
        `;
        emailText = `Payment of $${amount.toLocaleString()} due TODAY for ${propertyAddress}. Pay now: ${paymentLink}`;
      } else {
        // overdue
        subject = `OVERDUE: Payment Required - $${amount.toLocaleString()}`;
        emailHtml = `
          <p>Dear ${tenantName},</p>
          <p>Your rent payment of <strong>$${amount.toLocaleString()}</strong> for ${propertyAddress} is <strong>${daysOffset} days overdue</strong>.</p>
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Amount: $${amount.toLocaleString()}</li>
            <li>Due Date: ${dueDate.toLocaleDateString()}</li>
            <li>Days Overdue: ${daysOffset} days</li>
            <li>Property: ${propertyAddress}</li>
          </ul>
          <p style="color: #DC2626; font-weight: bold;">Late fees may apply. Please make your payment immediately.</p>
          <p><a href="${paymentLink}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a></p>
          <p>If you have any questions or need assistance, please contact us immediately.</p>
        `;
        emailText = `OVERDUE: Payment of $${amount.toLocaleString()} is ${daysOffset} days overdue for ${propertyAddress}. Late fees may apply. Pay now: ${paymentLink}`;
      }

      // Send email
      await emailService.sendEmail({
        to: tenantEmail,
        subject,
        html: emailHtml,
        text: emailText,
      });

      // Send SMS if enabled and phone number available
      if (sendSMS && tenantPhone) {
        let smsMessage = '';

        if (reminderType === 'before_due') {
          smsMessage = `Hi ${tenantName}, your rent payment of $${amount.toLocaleString()} is due in ${daysOffset} days. Pay now: ${paymentLink}. Reply STOP to unsubscribe.`;
        } else if (reminderType === 'on_due') {
          smsMessage = `Hi ${tenantName}, your rent payment of $${amount.toLocaleString()} is due TODAY. Pay now: ${paymentLink}. Reply STOP to unsubscribe.`;
        } else {
          smsMessage = `URGENT: Hi ${tenantName}, your rent payment of $${amount.toLocaleString()} is ${daysOffset} days OVERDUE. Late fees may apply. Pay now: ${paymentLink}. Reply STOP to unsubscribe.`;
        }

        await smsService.sendSMS({
          to: tenantPhone,
          message: smsMessage,
        });
      }
    } catch (error) {
      logger.error('Error sending reminder notification:', error);
      throw error;
    }
  }

  /**
   * Get payment reminders for a lease
   */
  async getPaymentReminders(leaseId: string): Promise<PaymentReminder[]> {
    try {
      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('lease_id', leaseId)
        .order('sent_date', { ascending: false });

      if (error) {
        logger.error('Error fetching payment reminders:', error);
        return [];
      }

      return (data || []).map(reminder => ({
        id: reminder.id,
        paymentId: reminder.payment_id,
        leaseId: reminder.lease_id,
        tenantId: reminder.tenant_id,
        reminderType: reminder.reminder_type as 'before_due' | 'on_due' | 'overdue',
        daysOffset: reminder.days_offset,
        sentDate: new Date(reminder.sent_date),
        status: reminder.status as 'sent' | 'opened' | 'clicked',
      }));
    } catch (error) {
      logger.error('Error in getPaymentReminders:', error);
      return [];
    }
  }

  /**
   * Update reminder status (for tracking opens/clicks)
   */
  async updateReminderStatus(
    reminderId: string,
    status: 'opened' | 'clicked'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('payment_reminders')
        .update({ status })
        .eq('id', reminderId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error updating reminder status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update reminder status',
      };
    }
  }
}

export const paymentReminderService = new PaymentReminderService();