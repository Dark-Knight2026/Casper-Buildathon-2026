/**
 * Notification Batching System
 * Reduces email/SMS costs by grouping non-urgent notifications into digest emails
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from '@/utils/logger';
import { sendEmailNotification } from './notificationChannels';
import type {
  BatchingPreferences,
  BatchedNotification,
  DigestEmailContent,
  BatchFrequency,
} from '@/types/notification-batching';
import type { NotificationPriority } from '@/types/notification-channels';

/**
 * Get user's batching preferences
 */
export async function getBatchingPreferences(
  userId: string
): Promise<BatchingPreferences | null> {
  if (!isSupabaseConfigured()) {
    return {
      userId,
      enabled: false,
      frequency: 'daily',
      batchTime: '09:00',
      excludePriorities: ['urgent', 'high'],
      timezone: 'America/Los_Angeles',
    };
  }

  try {
    const { data, error } = await supabase
      .from('notification_batching_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return {
      userId: data.user_id,
      enabled: data.enabled ?? false,
      frequency: data.frequency ?? 'daily',
      batchTime: data.batch_time ?? '09:00',
      batchDay: data.batch_day,
      excludePriorities: data.exclude_priorities ?? ['urgent', 'high'],
      timezone: data.timezone ?? 'America/Los_Angeles',
    };
  } catch (error) {
    logger.error('Failed to get batching preferences:', error);
    return null;
  }
}

/**
 * Check if notification should be batched based on priority and user preferences
 */
export async function shouldBatchNotification(
  userId: string,
  priority: NotificationPriority
): Promise<boolean> {
  const preferences = await getBatchingPreferences(userId);

  if (!preferences || !preferences.enabled) {
    return false;
  }

  // Don't batch if priority is in exclude list
  return !preferences.excludePriorities.includes(priority);
}

/**
 * Add notification to batch queue
 */
export async function addToBatch(
  notification: Omit<BatchedNotification, 'id' | 'createdAt'>
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured, cannot batch notification');
    return false;
  }

  try {
    const { error } = await supabase
      .from('notification_batch_queue')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        action_url: notification.actionUrl,
        action_label: notification.actionLabel,
        metadata: notification.metadata,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;

    logger.debug('Notification added to batch queue:', notification.title);
    return true;
  } catch (error) {
    logger.error('Failed to add notification to batch:', error);
    return false;
  }
}

/**
 * Get pending notifications for a user
 */
export async function getPendingBatchNotifications(
  userId: string
): Promise<BatchedNotification[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('notification_batch_queue')
      .select('*')
      .eq('user_id', userId)
      .is('batch_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      type: item.type,
      priority: item.priority,
      title: item.title,
      message: item.message,
      actionUrl: item.action_url,
      actionLabel: item.action_label,
      metadata: item.metadata,
      createdAt: new Date(item.created_at),
      batchId: item.batch_id,
    }));
  } catch (error) {
    logger.error('Failed to get pending batch notifications:', error);
    return [];
  }
}

/**
 * Calculate next batch send time based on frequency and preferences
 */
export function calculateNextBatchTime(
  frequency: BatchFrequency,
  batchTime: string,
  timezone: string,
  batchDay?: number
): Date {
  const now = new Date();
  const [hours, minutes] = batchTime.split(':').map(Number);

  // Get current time in user's timezone
  const userTime = new Date(
    now.toLocaleString('en-US', { timeZone: timezone })
  );

  let nextBatch = new Date(userTime);
  nextBatch.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'immediate':
      return now;

    case 'hourly': {
      // Next hour
      nextBatch = new Date(now);
      nextBatch.setMinutes(0, 0, 0);
      nextBatch.setHours(nextBatch.getHours() + 1);
      break;
    }

    case 'daily': {
      // If time has passed today, schedule for tomorrow
      if (nextBatch <= userTime) {
        nextBatch.setDate(nextBatch.getDate() + 1);
      }
      break;
    }

    case 'weekly': {
      // Find next occurrence of specified day
      const targetDay = batchDay ?? 1; // Default to Monday
      const currentDay = nextBatch.getDay();
      let daysUntilTarget = targetDay - currentDay;

      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextBatch <= userTime)) {
        daysUntilTarget += 7;
      }

      nextBatch.setDate(nextBatch.getDate() + daysUntilTarget);
      break;
    }
  }

  return nextBatch;
}

/**
 * Group notifications by category for better digest organization
 */
function groupNotificationsByCategory(
  notifications: BatchedNotification[]
): { [key: string]: BatchedNotification[] } {
  const categories: { [key: string]: BatchedNotification[] } = {
    payments: [],
    maintenance: [],
    documents: [],
    leases: [],
    messages: [],
    appointments: [],
    offers: [],
    other: [],
  };

  notifications.forEach(notification => {
    const category = notification.type.toLowerCase();
    if (categories[category]) {
      categories[category].push(notification);
    } else {
      categories.other.push(notification);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach(key => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
}

/**
 * Generate digest email content from batched notifications
 */
export function generateDigestEmail(
  notifications: BatchedNotification[],
  frequency: BatchFrequency
): DigestEmailContent {
  const categories = groupNotificationsByCategory(notifications);
  const notificationCount = notifications.length;

  // Determine subject based on frequency and count
  let subject = '';
  switch (frequency) {
    case 'hourly':
      subject = `Your Hourly Digest: ${notificationCount} Update${notificationCount !== 1 ? 's' : ''}`;
      break;
    case 'daily':
      subject = `Your Daily Digest: ${notificationCount} Update${notificationCount !== 1 ? 's' : ''}`;
      break;
    case 'weekly':
      subject = `Your Weekly Digest: ${notificationCount} Update${notificationCount !== 1 ? 's' : ''}`;
      break;
    default:
      subject = `You have ${notificationCount} new notification${notificationCount !== 1 ? 's' : ''}`;
  }

  // Generate HTML content
  const htmlContent = generateDigestHTML(categories, notificationCount, frequency);

  // Generate plain text content
  const textContent = generateDigestText(categories, notificationCount, frequency);

  return {
    subject,
    htmlContent,
    textContent,
    notificationCount,
    categories,
  };
}

/**
 * Generate HTML content for digest email
 */
function generateDigestHTML(
  categories: { [key: string]: BatchedNotification[] },
  totalCount: number,
  frequency: BatchFrequency
): string {
  const categoryNames: { [key: string]: string } = {
    payments: '💰 Payments',
    maintenance: '🔧 Maintenance',
    documents: '📄 Documents',
    leases: '📝 Leases',
    messages: '💬 Messages',
    appointments: '📅 Appointments',
    offers: '💼 Offers',
    other: '📌 Other',
  };

  const categoryColors: { [key: string]: string } = {
    payments: '#10b981',
    maintenance: '#f59e0b',
    documents: '#3b82f6',
    leases: '#8b5cf6',
    messages: '#06b6d4',
    appointments: '#ec4899',
    offers: '#14b8a6',
    other: '#6b7280',
  };

  let categorySections = '';

  Object.entries(categories).forEach(([category, notifications]) => {
    const categoryName = categoryNames[category] || category;
    const categoryColor = categoryColors[category] || '#6b7280';

    let notificationItems = '';
    notifications.forEach(notification => {
      notificationItems += `
        <div style="background-color: #f9fafb; border-left: 3px solid ${categoryColor}; padding: 12px; margin-bottom: 12px; border-radius: 4px;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${notification.title}</div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${notification.message}</div>
          ${notification.actionUrl ? `
            <a href="${notification.actionUrl}" style="display: inline-block; background-color: ${categoryColor}; color: white; text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: 500;">
              ${notification.actionLabel || 'View Details'}
            </a>
          ` : ''}
        </div>
      `;
    });

    categorySections += `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #1f2937; font-size: 18px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${categoryColor};">
          ${categoryName} (${notifications.length})
        </h2>
        ${notificationItems}
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notification Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 24px;">
      <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 8px 0;">
        ${frequency === 'daily' ? '📬 Daily' : frequency === 'weekly' ? '📬 Weekly' : frequency === 'hourly' ? '📬 Hourly' : '📬'} Notification Digest
      </h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        You have <strong>${totalCount}</strong> new notification${totalCount !== 1 ? 's' : ''} waiting for you
      </p>
    </div>

    <!-- Categories -->
    ${categorySections}

    <!-- Footer -->
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
      <p style="margin: 0 0 8px 0;">This is your ${frequency} notification digest from your Real Estate Management Platform.</p>
      <p style="margin: 0;">To manage your notification preferences or change digest frequency, visit your account settings.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text content for digest email
 */
function generateDigestText(
  categories: { [key: string]: BatchedNotification[] },
  totalCount: number,
  frequency: BatchFrequency
): string {
  const categoryNames: { [key: string]: string } = {
    payments: 'PAYMENTS',
    maintenance: 'MAINTENANCE',
    documents: 'DOCUMENTS',
    leases: 'LEASES',
    messages: 'MESSAGES',
    appointments: 'APPOINTMENTS',
    offers: 'OFFERS',
    other: 'OTHER',
  };

  let text = `${frequency.toUpperCase()} NOTIFICATION DIGEST\n`;
  text += `${'='.repeat(50)}\n\n`;
  text += `You have ${totalCount} new notification${totalCount !== 1 ? 's' : ''}\n\n`;

  Object.entries(categories).forEach(([category, notifications]) => {
    const categoryName = categoryNames[category] || category.toUpperCase();
    text += `${categoryName} (${notifications.length})\n`;
    text += `${'-'.repeat(50)}\n\n`;

    notifications.forEach((notification, index) => {
      text += `${index + 1}. ${notification.title}\n`;
      text += `   ${notification.message}\n`;
      if (notification.actionUrl) {
        text += `   ${notification.actionLabel || 'View Details'}: ${notification.actionUrl}\n`;
      }
      text += '\n';
    });

    text += '\n';
  });

  text += `${'='.repeat(50)}\n`;
  text += 'This is your notification digest from your Real Estate Management Platform.\n';
  text += 'To manage your notification preferences, visit your account settings.\n';

  return text;
}

/**
 * Create and send a notification batch
 */
export async function createAndSendBatch(
  userId: string,
  userEmail: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured, cannot send batch');
    return false;
  }

  try {
    // Get pending notifications
    const notifications = await getPendingBatchNotifications(userId);

    if (notifications.length === 0) {
      logger.debug('No pending notifications to batch for user:', userId);
      return true;
    }

    // Get batching preferences
    const preferences = await getBatchingPreferences(userId);
    if (!preferences || !preferences.enabled) {
      logger.debug('Batching not enabled for user:', userId);
      return false;
    }

    // Generate digest email
    const digest = generateDigestEmail(notifications, preferences.frequency);

    // Create batch record
    const { data: batchData, error: batchError } = await supabase
      .from('notification_batches')
      .insert({
        user_id: userId,
        frequency: preferences.frequency,
        notification_count: notifications.length,
        scheduled_for: new Date().toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (batchError) throw batchError;

    const batchId = batchData.id;

    // Update queue items with batch ID
    const notificationIds = notifications.map(n => n.id);
    const { error: updateError } = await supabase
      .from('notification_batch_queue')
      .update({ batch_id: batchId })
      .in('id', notificationIds);

    if (updateError) throw updateError;

    // Send digest email
    const emailResult = await sendEmailNotification({
      to: userEmail,
      subject: digest.subject,
      htmlContent: digest.htmlContent,
      textContent: digest.textContent,
      priority: 'medium',
      metadata: {
        batchId,
        notificationCount: digest.notificationCount,
      },
    });

    // Update batch status
    await supabase
      .from('notification_batches')
      .update({
        status: emailResult.success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        email_message_id: emailResult.messageId,
      })
      .eq('id', batchId);

    logger.debug(`Batch ${batchId} sent successfully:`, {
      notificationCount: notifications.length,
      success: emailResult.success,
    });

    return emailResult.success;
  } catch (error) {
    logger.error('Failed to create and send batch:', error);
    return false;
  }
}

/**
 * Process all pending batches (called by scheduled job)
 */
export async function processPendingBatches(): Promise<void> {
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured, cannot process batches');
    return;
  }

  try {
    // Get all users with batching enabled and pending notifications
    const { data: users, error } = await supabase
      .from('notification_batching_preferences')
      .select('user_id, frequency, batch_time, timezone')
      .eq('enabled', true);

    if (error) throw error;

    for (const user of users) {
      const now = new Date();
      const nextBatchTime = calculateNextBatchTime(
        user.frequency,
        user.batch_time,
        user.timezone
      );

      // Check if it's time to send batch
      if (now >= nextBatchTime) {
        // Get user email from auth.users
        const { data: userData } = await supabase
          .from('auth.users')
          .select('email')
          .eq('id', user.user_id)
          .single();

        if (userData?.email) {
          await createAndSendBatch(user.user_id, userData.email);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to process pending batches:', error);
  }
}