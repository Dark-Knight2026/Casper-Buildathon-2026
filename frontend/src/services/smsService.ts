/**
 * SMS Service Stub
 * TODO: SMS functionality will be handled by backend API
 */

import { logger } from '@/utils/logger';

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

class SMSService {
  /**
   * Send a generic SMS - stub implementation
   */
  async sendSMS(_params: SMSParams): Promise<SMSResult> {
    logger.warn('SMS Service: sendSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async sendLeaseAgreementSMS(
    _leaseId: string,
    _recipientPhone: string,
    _recipientName: string,
    _propertyAddress: string
  ): Promise<SMSResult> {
    logger.warn('SMS Service: sendLeaseAgreementSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async sendSignatureRequestSMS(
    _signatureRequestId: string,
    _recipientPhone: string,
    _recipientName: string,
    _documentTitle: string,
    _expiresAt: string
  ): Promise<SMSResult> {
    logger.warn('SMS Service: sendSignatureRequestSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async sendPaymentReminderSMS(
    _paymentId: string,
    _recipientPhone: string,
    _recipientName: string,
    _amount: number,
    _dueDate: string,
    _propertyAddress: string
  ): Promise<SMSResult> {
    logger.warn('SMS Service: sendPaymentReminderSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async sendMaintenanceUpdateSMS(
    _requestId: string,
    _recipientPhone: string,
    _recipientName: string,
    _status: string,
    _propertyAddress: string
  ): Promise<SMSResult> {
    logger.warn('SMS Service: sendMaintenanceUpdateSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async sendPaymentConfirmationSMS(
    _recipientPhone: string,
    _recipientName: string,
    _amount: number,
    _propertyAddress: string,
    _transactionId: string
  ): Promise<SMSResult> {
    logger.warn('SMS Service: sendPaymentConfirmationSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async sendLeaseExpirationReminderSMS(
    _recipientPhone: string,
    _recipientName: string,
    _propertyAddress: string,
    _expirationDate: Date,
    _leaseId?: string
  ): Promise<SMSResult> {
    logger.warn('SMS Service: sendLeaseExpirationReminderSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async sendVerificationCodeSMS(
    _recipientPhone: string,
    _code: string
  ): Promise<SMSResult> {
    logger.warn('SMS Service: sendVerificationCodeSMS called but SMS is handled by backend');
    return { success: true, messageSid: 'stub' };
  }

  async getSMSStatus(_messageSid: string): Promise<{ status: string; error?: string }> {
    return { status: 'stub' };
  }

  async sendBulkSMS(
    recipients: Array<{ phone: string; name: string }>,
    _message: string
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; error?: string }>;
  }> {
    logger.warn('SMS Service: sendBulkSMS called but SMS is handled by backend');
    return {
      successful: recipients.length,
      failed: 0,
      results: recipients.map(r => ({ phone: r.phone, success: true })),
    };
  }
}

export const smsService = new SMSService();
