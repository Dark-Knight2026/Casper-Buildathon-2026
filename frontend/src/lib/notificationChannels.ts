/**
 * Notification Channel Management
 * Handles email and SMS delivery for critical notifications
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from '@/utils/logger';
import type {
  NotificationChannelPreferences,
  EmailNotification,
  SMSNotification,
  NotificationDeliveryResult,
  NotificationPriority,
  NotificationChannel,
} from '@/types/notification-channels';

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(preferences: NotificationChannelPreferences): boolean {
  if (!preferences.quietHours.enabled) return false;
  
  const now = new Date();
  const userTimezone = preferences.quietHours.timezone || 'America/Los_Angeles';
  
  // Get current time in user's timezone
  const timeString = now.toLocaleTimeString('en-US', {
    timeZone: userTimezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const [currentHour, currentMinute] = timeString.split(':').map(Number);
  const currentMinutes = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  
  const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
  const endMinutes = endHour * 60 + endMinute;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if notification priority meets threshold for a channel
 */
function meetsPriorityThreshold(
  notificationPriority: NotificationPriority,
  thresholdPriority: NotificationPriority
): boolean {
  const priorityLevels: Record<NotificationPriority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    urgent: 4,
  };
  
  return priorityLevels[notificationPriority] >= priorityLevels[thresholdPriority];
}

/**
 * Get user's notification channel preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationChannelPreferences | null> {
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured, using default preferences');
    return {
      userId,
      channels: {
        in_app: true,
        email: false,
        sms: false,
        push: false,
      },
      priorityThresholds: {
        email: 'high',
        sms: 'urgent',
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'America/Los_Angeles',
      },
    };
  }

  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return {
      userId: data.user_id,
      channels: data.channels || {
        in_app: true,
        email: false,
        sms: false,
        push: false,
      },
      priorityThresholds: data.priority_thresholds || {
        email: 'high',
        sms: 'urgent',
      },
      quietHours: data.quiet_hours || {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'America/Los_Angeles',
      },
      emailAddress: data.email_address,
      phoneNumber: data.phone_number,
    };
  } catch (error) {
    logger.error('Failed to get notification preferences:', error);
    return null;
  }
}

/**
 * Send email notification via edge function
 */
export async function sendEmailNotification(
  notification: EmailNotification
): Promise<NotificationDeliveryResult> {
  if (!isSupabaseConfigured()) {
    return {
      channel: 'email',
      success: false,
      error: 'Supabase not configured',
      timestamp: new Date(),
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: notification.to,
        subject: notification.subject,
        html: notification.htmlContent,
        text: notification.textContent,
        priority: notification.priority,
        metadata: notification.metadata,
      },
    });

    if (error) throw error;

    return {
      channel: 'email',
      success: true,
      messageId: data.messageId,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Failed to send email notification:', error);
    return {
      channel: 'email',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Send SMS notification via edge function
 */
export async function sendSMSNotification(
  notification: SMSNotification
): Promise<NotificationDeliveryResult> {
  if (!isSupabaseConfigured()) {
    return {
      channel: 'sms',
      success: false,
      error: 'Supabase not configured',
      timestamp: new Date(),
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: notification.to,
        message: notification.message,
        priority: notification.priority,
        metadata: notification.metadata,
      },
    });

    if (error) throw error;

    return {
      channel: 'sms',
      success: true,
      messageId: data.messageId,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Failed to send SMS notification:', error);
    return {
      channel: 'sms',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Determine which channels to use for a notification based on user preferences
 */
export async function determineNotificationChannels(
  userId: string,
  priority: NotificationPriority
): Promise<NotificationChannel[]> {
  const preferences = await getUserNotificationPreferences(userId);
  
  if (!preferences) {
    return ['in_app']; // Default to in-app only
  }

  const channels: NotificationChannel[] = [];

  // Always include in-app if enabled
  if (preferences.channels.in_app) {
    channels.push('in_app');
  }

  // Check if we're in quiet hours (only affects email/SMS, not in-app)
  const inQuietHours = isQuietHours(preferences);

  // Only send urgent notifications during quiet hours
  if (inQuietHours && priority !== 'urgent') {
    return channels;
  }

  // Check email threshold
  if (
    preferences.channels.email &&
    preferences.emailAddress &&
    meetsPriorityThreshold(priority, preferences.priorityThresholds.email)
  ) {
    channels.push('email');
  }

  // Check SMS threshold
  if (
    preferences.channels.sms &&
    preferences.phoneNumber &&
    meetsPriorityThreshold(priority, preferences.priorityThresholds.sms)
  ) {
    channels.push('sms');
  }

  return channels;
}

/**
 * Generate email HTML template for notification
 */
export function generateEmailTemplate(
  title: string,
  message: string,
  actionUrl?: string,
  actionLabel?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin: 0 0 10px 0;
    }
    .message {
      color: #4b5563;
      font-size: 16px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="message">
      ${message}
    </div>
    ${actionUrl && actionLabel ? `
      <a href="${actionUrl}" class="button">${actionLabel}</a>
    ` : ''}
    <div class="footer">
      <p>This is an automated notification from your Real Estate Management Platform.</p>
      <p>To manage your notification preferences, visit your account settings.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate SMS message (plain text, max 160 characters recommended)
 */
export function generateSMSMessage(
  title: string,
  message: string,
  actionUrl?: string
): string {
  let smsText = `${title}: ${message}`;
  
  // Truncate if too long (SMS limit is typically 160 characters)
  if (smsText.length > 140) {
    smsText = smsText.substring(0, 137) + '...';
  }
  
  // Add shortened URL if provided
  if (actionUrl) {
    smsText += ` ${actionUrl}`;
  }
  
  return smsText;
}

/**
 * Send notification through multiple channels based on user preferences
 */
export async function sendMultiChannelNotification(
  userId: string,
  title: string,
  message: string,
  priority: NotificationPriority,
  actionUrl?: string,
  actionLabel?: string,
  metadata?: Record<string, unknown>
): Promise<NotificationDeliveryResult[]> {
  const channels = await determineNotificationChannels(userId, priority);
  const preferences = await getUserNotificationPreferences(userId);
  const results: NotificationDeliveryResult[] = [];

  for (const channel of channels) {
    if (channel === 'email' && preferences?.emailAddress) {
      const emailResult = await sendEmailNotification({
        to: preferences.emailAddress,
        subject: title,
        htmlContent: generateEmailTemplate(title, message, actionUrl, actionLabel),
        textContent: `${title}\n\n${message}${actionUrl ? `\n\n${actionLabel}: ${actionUrl}` : ''}`,
        priority,
        metadata,
      });
      results.push(emailResult);
    } else if (channel === 'sms' && preferences?.phoneNumber) {
      const smsResult = await sendSMSNotification({
        to: preferences.phoneNumber,
        message: generateSMSMessage(title, message, actionUrl),
        priority,
        metadata,
      });
      results.push(smsResult);
    } else if (channel === 'in_app') {
      // In-app notification is handled by NotificationContext
      results.push({
        channel: 'in_app',
        success: true,
        timestamp: new Date(),
      });
    }
  }

  return results;
}