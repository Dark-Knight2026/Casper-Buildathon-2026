/**
 * Notification Types
 * Types for real-time notification system
 */

export type NotificationType = 
  | 'payment'
  | 'maintenance'
  | 'lease'
  | 'message'
  | 'application'
  | 'document'
  | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, unknown>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  payment_notifications: boolean;
  maintenance_notifications: boolean;
  lease_notifications: boolean;
  message_notifications: boolean;
  application_notifications: boolean;
  document_notifications: boolean;
  system_notifications: boolean;
}

export interface NotificationFilter {
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  startDate?: string;
  endDate?: string;
}