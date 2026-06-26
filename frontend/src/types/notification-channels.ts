/**
 * Notification Channel Type Definitions
 * Defines types for email and SMS notification delivery
 */

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationChannelPreferences {
  userId: string;
  channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  priorityThresholds: {
    email: NotificationPriority; // Send email for this priority and above
    sms: NotificationPriority; // Send SMS for this priority and above
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format (e.g., "22:00")
    end: string; // HH:mm format (e.g., "08:00")
    timezone: string;
  };
  emailAddress?: string;
  phoneNumber?: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export interface SMSNotification {
  to: string; // Phone number in E.164 format (e.g., +1234567890)
  message: string;
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}