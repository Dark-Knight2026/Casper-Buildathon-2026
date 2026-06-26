/**
 * Notification Batching Type Definitions
 * Defines types for batching notifications into digest emails
 */

import type { NotificationPriority } from './notification-channels';

export type BatchFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';

export interface BatchingPreferences {
  userId: string;
  enabled: boolean;
  frequency: BatchFrequency;
  batchTime: string; // HH:mm format for daily/weekly batches (e.g., "09:00")
  batchDay?: number; // 0-6 for weekly batches (0 = Sunday)
  excludePriorities: NotificationPriority[]; // Priorities that bypass batching
  timezone: string;
}

export interface BatchedNotification {
  id: string;
  userId: string;
  type: string;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  batchId?: string;
}

export interface NotificationBatch {
  id: string;
  userId: string;
  frequency: BatchFrequency;
  notifications: BatchedNotification[];
  scheduledFor: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  emailMessageId?: string;
}

export interface DigestEmailContent {
  subject: string;
  htmlContent: string;
  textContent: string;
  notificationCount: number;
  categories: {
    [key: string]: BatchedNotification[];
  };
}