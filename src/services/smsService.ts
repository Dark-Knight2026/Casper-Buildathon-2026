/**
 * SMS Service
 * Handles SMS sending via Twilio API with Supabase logging
 */

import { Twilio } from 'twilio';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Initialize Twilio client
const twilioClient = new Twilio(
  import.meta.env.VITE_TWILIO_ACCOUNT_SID,
  import.meta.env.VITE_TWILIO_AUTH_TOKEN
);

export interface SMSParams {
  to: string;
  message: string;
  from?: string;
}

export interface SMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

interface SMSMetadata {
  type: 'sms';
  messageSid?: string;
  sentAt: string;
}

class SMSService {
  private readonly defaultFrom = import.meta.env.VITE_TWILIO_PHONE_NUMBER;

  /**
   * Send a generic SMS
   */
  async sendSMS(params: SMSParams): Promise<SMSResult> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(params.to)) {
        return {
          success: false,
          error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
        };
      }

      const message = await twilioClient.messages.create({
        body: params.message,
        from: params.from || this.defaultFrom,
        to: params.to,
      });

      // Log SMS in messages table
      await this.logSMS({
        to: params.to,
        message: params.message,
        messageSid: message.sid,
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      logger.error('Error sending SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      };
    }
  }

  /**
   * Send lease agreement notification SMS
   */
  async sendLeaseAgreementSMS(
    leaseId: string,
    recipientPhone: string,
    recipientName: string,
    propertyAddress: string
  ): Promise<SMSResult> {
    const message = `Hi ${recipientName}, your lease agreement for ${propertyAddress} is ready for review. Visit ${window.location.origin}/leases/${leaseId} to view and sign. Reply STOP to unsubscribe.`;

    const result = await this.sendSMS({
      to: recipientPhone,
      message,
    });

    // Link message to lease
    if (result.success && result.messageSid) {
      await this.linkMessageToLease(result.messageSid, leaseId);
    }

    return result;
  }

  /**
   * Send signature request SMS
   */
  async sendSignatureRequestSMS(
    signatureRequestId: string,
    recipientPhone: string,
    recipientName: string,
    documentTitle: string,
    expiresAt: string
  ): Promise<SMSResult> {
    const expiryDate = new Date(expiresAt).toLocaleDateString();
    const message = `Hi ${recipientName}, you have a signature request for "${documentTitle}". Please sign before ${expiryDate}. Visit ${window.location.origin}/signatures/${signatureRequestId}. Reply STOP to unsubscribe.`;

    return await this.sendSMS({
      to: recipientPhone,
      message,
    });
  }

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminderSMS(
    paymentId: string,
    recipientPhone: string,
    recipientName: string,
    amount: number,
    dueDate: string,
    propertyAddress: string
  ): Promise<SMSResult> {
    const dueDateFormatted = new Date(dueDate).toLocaleDateString();
    const message = `Hi ${recipientName}, reminder: Your rent of $${amount.toLocaleString()} for ${propertyAddress} is due on ${dueDateFormatted}. Pay now: ${window.location.origin}/payments/${paymentId}. Reply STOP to unsubscribe.`;

    return await this.sendSMS({
      to: recipientPhone,
      message,
    });
  }

  /**
   * Send maintenance update SMS
   */
  async sendMaintenanceUpdateSMS(
    requestId: string,
    recipientPhone: string,
    recipientName: string,
    status: string,
    propertyAddress: string
  ): Promise<SMSResult> {
    const message = `Hi ${recipientName}, your maintenance request for ${propertyAddress} is now ${status.toUpperCase()}. View details: ${window.location.origin}/maintenance/${requestId}. Reply STOP to unsubscribe.`;

    return await this.sendSMS({
      to: recipientPhone,
      message,
    });
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmationSMS(
    recipientPhone: string,
    recipientName: string,
    amount: number,
    propertyAddress: string,
    transactionId: string
  ): Promise<SMSResult> {
    const message = `Hi ${recipientName}, we received your payment of $${amount.toLocaleString()} for ${propertyAddress}. Transaction ID: ${transactionId}. Thank you! Reply STOP to unsubscribe.`;

    return await this.sendSMS({
      to: recipientPhone,
      message,
    });
  }

  /**
   * Send lease expiration reminder SMS
   */
  async sendLeaseExpirationReminderSMS(
    recipientPhone: string,
    recipientName: string,
    propertyAddress: string,
    expirationDate: Date,
    leaseId?: string
  ): Promise<SMSResult> {
    const expiryDateFormatted = expirationDate.toLocaleDateString();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const message = `Hi ${recipientName}, your lease for ${propertyAddress} expires in ${daysUntilExpiration} days (${expiryDateFormatted}). Contact us to renew${leaseId ? `: ${window.location.origin}/leases/${leaseId}` : ''}. Reply STOP to unsubscribe.`;

    return await this.sendSMS({
      to: recipientPhone,
      message,
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCodeSMS(
    recipientPhone: string,
    code: string
  ): Promise<SMSResult> {
    const message = `Your verification code is: ${code}. This code will expire in 10 minutes. Do not share this code with anyone. Reply STOP to unsubscribe.`;

    return await this.sendSMS({
      to: recipientPhone,
      message,
    });
  }

  /**
   * Validate phone number format (E.164)
   */
  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  /**
   * Log SMS in messages table
   */
  private async logSMS(params: {
    to: string;
    message: string;
    messageSid?: string;
  }): Promise<void> {
    try {
      const metadata: SMSMetadata = {
        type: 'sms',
        messageSid: params.messageSid,
        sentAt: new Date().toISOString(),
      };

      const messageData: MessageInsert = {
        sender_id: 'system', // System-generated SMS
        recipient_id: params.to,
        subject: 'SMS Notification',
        body: params.message,
        is_read: false,
        metadata: metadata as Database['public']['Tables']['messages']['Insert']['metadata'],
      };

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) {
        logger.error('Error logging SMS:', error);
      }
    } catch (error) {
      logger.error('Error in logSMS:', error);
    }
  }

  /**
   * Link message to lease
   */
  private async linkMessageToLease(messageSid: string, leaseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ lease_id: leaseId })
        .eq('metadata->messageSid', messageSid);

      if (error) {
        logger.error('Error linking message to lease:', error);
      }
    } catch (error) {
      logger.error('Error in linkMessageToLease:', error);
    }
  }

  /**
   * Get SMS delivery status
   */
  async getSMSStatus(messageSid: string): Promise<{
    status: string;
    error?: string;
  }> {
    try {
      const message = await twilioClient.messages(messageSid).fetch();
      return {
        status: message.status,
      };
    } catch (error) {
      logger.error('Error fetching SMS status:', error);
      return {
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Failed to fetch status',
      };
    }
  }

  /**
   * Send bulk SMS (for notifications to multiple recipients)
   */
  async sendBulkSMS(recipients: Array<{ phone: string; name: string }>, message: string): Promise<{
    successful: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ phone: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const personalizedMessage = message.replace('{name}', recipient.name);
      const result = await this.sendSMS({
        to: recipient.phone,
        message: personalizedMessage,
      });

      if (result.success) {
        successful++;
        results.push({ phone: recipient.phone, success: true });
      } else {
        failed++;
        results.push({
          phone: recipient.phone,
          success: false,
          error: result.error,
        });
      }

      // Add delay to avoid rate limiting (adjust as needed)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { successful, failed, results };
  }
}

export const smsService = new SMSService();