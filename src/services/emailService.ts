/**
 * Email Service
 * Handles email sending via Resend API with Supabase logging
 * Gracefully handles missing API keys for development/testing
 */

import type { Resend } from 'resend';
import { logger } from '@/utils/logger';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Check if API key is available
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

// Lazy initialization - only load Resend when needed and configured
let resendInstance: Resend | null = null;
let resendInitialized = false;

async function getResendClient(): Promise<Resend | null> {
  if (resendInitialized) {
    return resendInstance;
  }

  if (!RESEND_API_KEY) {
    resendInitialized = true;
    resendInstance = null;
    return null;
  }

  try {
    const { Resend } = await import('resend');
    resendInstance = new Resend(RESEND_API_KEY);
    resendInitialized = true;
    return resendInstance;
  } catch (error) {
    logger.error('Failed to initialize Resend:', error);
    resendInitialized = true;
    return null;
  }
}

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailMetadata {
  type: 'email';
  messageId?: string;
  sentAt: string;
}

class EmailService {
  private readonly defaultFrom = 'noreply@yourdomain.com'; // Update with your verified domain

  /**
   * Check if email service is configured
   */
  private isConfigured(): boolean {
    return !!RESEND_API_KEY;
  }

  /**
   * Send a generic email
   */
  async sendEmail(params: EmailParams): Promise<EmailResult> {
    // Check if Resend is configured
    if (!this.isConfigured()) {
      logger.warn('Email service not configured. Resend API key is missing.');
      logger.debug('Email would have been sent:', {
        to: params.to,
        subject: params.subject,
      });
      
      // Log email in messages table even if not sent
      await this.logEmail({
        to: Array.isArray(params.to) ? params.to[0] : params.to,
        subject: params.subject,
        body: params.html,
        messageId: `mock-${Date.now()}`,
      });

      return {
        success: false,
        error: 'Email service not configured. Please set VITE_RESEND_API_KEY environment variable.',
      };
    }

    try {
      const resend = await getResendClient();
      if (!resend) {
        throw new Error('Failed to initialize Resend client');
      }

      const { data, error } = await resend.emails.send({
        from: params.from || this.defaultFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
        cc: params.cc,
        bcc: params.bcc,
      });

      if (error) {
        logger.error('Error sending email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      // Log email in messages table
      await this.logEmail({
        to: Array.isArray(params.to) ? params.to[0] : params.to,
        subject: params.subject,
        body: params.html,
        messageId: data?.id,
      });

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      logger.error('Error in sendEmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send lease agreement email
   */
  async sendLeaseAgreementEmail(
    leaseId: string,
    recipientEmail: string,
    recipientName: string,
    leaseDetails: {
      propertyAddress: string;
      startDate: string;
      endDate: string;
      monthlyRent: number;
    }
  ): Promise<EmailResult> {
    const subject = `Lease Agreement - ${leaseDetails.propertyAddress}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lease Agreement</h1>
            </div>
            <div class="content">
              <p>Dear ${recipientName},</p>
              <p>Your lease agreement is ready for review and signature.</p>
              
              <div class="details">
                <h3>Lease Details:</h3>
                <p><strong>Property:</strong> ${leaseDetails.propertyAddress}</p>
                <p><strong>Lease Period:</strong> ${leaseDetails.startDate} to ${leaseDetails.endDate}</p>
                <p><strong>Monthly Rent:</strong> $${leaseDetails.monthlyRent.toLocaleString()}</p>
              </div>

              <p>Please review the lease agreement and sign it at your earliest convenience.</p>
              
              <a href="${window.location.origin}/leases/${leaseId}" class="button">View Lease Agreement</a>
              
              <p>If you have any questions, please don't hesitate to contact us.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Lease Agreement - ${leaseDetails.propertyAddress}

      Dear ${recipientName},

      Your lease agreement is ready for review and signature.

      Lease Details:
      - Property: ${leaseDetails.propertyAddress}
      - Lease Period: ${leaseDetails.startDate} to ${leaseDetails.endDate}
      - Monthly Rent: $${leaseDetails.monthlyRent.toLocaleString()}

      Please visit ${window.location.origin}/leases/${leaseId} to review and sign the lease agreement.

      If you have any questions, please don't hesitate to contact us.
    `;

    const result = await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });

    // Link message to lease
    if (result.success && result.messageId) {
      await this.linkMessageToLease(result.messageId, leaseId);
    }

    return result;
  }

  /**
   * Send lease expiration reminder email
   */
  async sendLeaseExpirationReminderEmail(
    recipientEmail: string,
    recipientName: string,
    propertyAddress: string,
    expirationDate: Date,
    daysUntilExpiration: number
  ): Promise<EmailResult> {
    const subject = `Lease Expiration Reminder - ${propertyAddress}`;
    const urgencyColor = daysUntilExpiration <= 30 ? '#EF4444' : daysUntilExpiration <= 60 ? '#F59E0B' : '#3B82F6';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .alert { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid ${urgencyColor}; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lease Expiration Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${recipientName},</p>
              <p>This is a reminder that your lease is expiring soon.</p>
              
              <div class="alert">
                <p><strong>Property:</strong> ${propertyAddress}</p>
                <p><strong>Expiration Date:</strong> ${expirationDate.toLocaleDateString()}</p>
                <p><strong>Days Remaining:</strong> <span style="color: ${urgencyColor}; font-weight: bold;">${daysUntilExpiration} days</span></p>
              </div>

              <p>Please contact us if you would like to discuss lease renewal options.</p>
              
              <a href="${window.location.origin}/renewals" class="button">View Renewal Options</a>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Lease Expiration Reminder

      Dear ${recipientName},

      This is a reminder that your lease is expiring soon.

      Property: ${propertyAddress}
      Expiration Date: ${expirationDate.toLocaleDateString()}
      Days Remaining: ${daysUntilExpiration} days

      Please contact us if you would like to discuss lease renewal options.

      Visit ${window.location.origin}/renewals to view renewal options.
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send signature request email
   */
  async sendSignatureRequestEmail(
    signatureRequestId: string,
    recipientEmail: string,
    recipientName: string,
    documentTitle: string,
    expiresAt: string
  ): Promise<EmailResult> {
    const subject = `Signature Required - ${documentTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .alert { background-color: #FEF3C7; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #F59E0B; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Signature Required</h1>
            </div>
            <div class="content">
              <p>Dear ${recipientName},</p>
              <p>You have been requested to sign the following document:</p>
              
              <h3>${documentTitle}</h3>

              <div class="alert">
                <p><strong>⏰ Action Required:</strong> Please sign this document before ${new Date(expiresAt).toLocaleDateString()}</p>
              </div>
              
              <a href="${window.location.origin}/signatures/${signatureRequestId}" class="button">Sign Document</a>
              
              <p>If you have any questions about this document, please contact the sender.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Signature Required - ${documentTitle}

      Dear ${recipientName},

      You have been requested to sign: ${documentTitle}

      Please sign this document before ${new Date(expiresAt).toLocaleDateString()}

      Visit ${window.location.origin}/signatures/${signatureRequestId} to sign the document.

      If you have any questions about this document, please contact the sender.
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminderEmail(
    paymentId: string,
    recipientEmail: string,
    recipientName: string,
    amount: number,
    dueDate: string,
    propertyAddress: string
  ): Promise<EmailResult> {
    const subject = `Payment Reminder - $${amount.toLocaleString()} Due ${new Date(dueDate).toLocaleDateString()}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .payment-box { background-color: white; padding: 20px; margin: 15px 0; border-radius: 5px; text-align: center; }
            .amount { font-size: 32px; font-weight: bold; color: #4F46E5; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${recipientName},</p>
              <p>This is a friendly reminder that your rent payment is due.</p>
              
              <div class="payment-box">
                <div class="amount">$${amount.toLocaleString()}</div>
                <p><strong>Property:</strong> ${propertyAddress}</p>
                <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
              </div>
              
              <a href="${window.location.origin}/payments/${paymentId}" class="button">Make Payment</a>
              
              <p>Please ensure your payment is submitted by the due date to avoid any late fees.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Payment Reminder

      Dear ${recipientName},

      This is a friendly reminder that your rent payment is due.

      Amount: $${amount.toLocaleString()}
      Property: ${propertyAddress}
      Due Date: ${new Date(dueDate).toLocaleDateString()}

      Visit ${window.location.origin}/payments/${paymentId} to make your payment.

      Please ensure your payment is submitted by the due date to avoid any late fees.
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send maintenance notification email
   */
  async sendMaintenanceNotificationEmail(
    requestId: string,
    recipientEmail: string,
    recipientName: string,
    status: string,
    details: string,
    propertyAddress: string
  ): Promise<EmailResult> {
    const subject = `Maintenance Update - ${propertyAddress}`;
    const statusColors: Record<string, string> = {
      pending: '#F59E0B',
      'in-progress': '#3B82F6',
      completed: '#10B981',
      cancelled: '#EF4444',
    };
    const statusColor = statusColors[status] || '#6B7280';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .status-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid ${statusColor}; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Maintenance Update</h1>
            </div>
            <div class="content">
              <p>Dear ${recipientName},</p>
              <p>We have an update regarding your maintenance request.</p>
              
              <div class="status-box">
                <p><strong>Property:</strong> ${propertyAddress}</p>
                <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status.toUpperCase()}</span></p>
                <p><strong>Details:</strong> ${details}</p>
              </div>
              
              <a href="${window.location.origin}/maintenance/${requestId}" class="button">View Request</a>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Maintenance Update

      Dear ${recipientName},

      We have an update regarding your maintenance request.

      Property: ${propertyAddress}
      Status: ${status.toUpperCase()}
      Details: ${details}

      Visit ${window.location.origin}/maintenance/${requestId} to view your request.
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Log email in messages table
   */
  private async logEmail(params: {
    to: string;
    subject: string;
    body: string;
    messageId?: string;
  }): Promise<void> {
    try {
      const metadata: EmailMetadata = {
        type: 'email',
        messageId: params.messageId,
        sentAt: new Date().toISOString(),
      };

      const messageData: MessageInsert = {
        sender_id: 'system', // System-generated email
        recipient_id: params.to,
        subject: params.subject,
        body: params.body,
        is_read: false,
        metadata: metadata as Database['public']['Tables']['messages']['Insert']['metadata'],
      };

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) {
        logger.error('Error logging email:', error);
      }
    } catch (error) {
      logger.error('Error in logEmail:', error);
    }
  }

  /**
   * Link message to lease
   */
  private async linkMessageToLease(messageId: string, leaseId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ lease_id: leaseId })
        .eq('metadata->messageId', messageId);

      if (error) {
        logger.error('Error linking message to lease:', error);
      }
    } catch (error) {
      logger.error('Error in linkMessageToLease:', error);
    }
  }
}

export const emailService = new EmailService();