import { supabase } from '@/lib/supabase/client';
import type {
  Notification,
  NotificationFilters,
  NotificationPagination,
  NotificationsResponse,
  CreateNotificationData,
} from '@/types/notification';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  read_at?: string;
  priority: string;
  sent_in_app: boolean;
  sent_email: boolean;
  sent_sms: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at?: string;
}

class NotificationService {
  /**
   * Get notifications for the current user
   */
  async getNotifications(
    filters?: NotificationFilters,
    pagination?: NotificationPagination
  ): Promise<NotificationsResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const limit = pagination?.limit || 20;
      const offset = pagination?.offset || 0;

      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`);
      }

      // Filter out expired notifications
      query = query.or('expires_at.is.null,expires_at.gt.now()');

      const { data: notifications, error, count } = await query;

      if (error) throw error;

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or('expires_at.is.null,expires_at.gt.now()');

      return {
        notifications: (notifications || []).map(this.formatNotification),
        hasMore: (count || 0) > offset + limit,
        total: count || 0,
        unreadCount: unreadCount || 0,
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Get a single notification
   */
  async getNotification(id: string): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return this.formatNotification(data as NotificationRow);
    } catch (error) {
      console.error('Error getting notification:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Create a notification
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      const notificationData = {
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        related_entity_type: data.relatedEntityType,
        related_entity_id: data.relatedEntityId,
        action_url: data.actionUrl,
        action_label: data.actionLabel,
        priority: data.priority || 'normal',
        metadata: data.metadata || {},
        expires_at: data.expiresAt?.toISOString(),
        is_read: false,
        sent_in_app: true,
        sent_email: false,
        sent_sms: false,
      };

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) throw error;

      return this.formatNotification(notification as NotificationRow);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe to new notifications
   */
  subscribeToNotifications(callback: (notification: Notification) => void) {
    const { data: { user } } = supabase.auth.getUser();

    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          const notification = payload.new as NotificationRow;
          const currentUser = await user;

          // Only notify if notification is for current user
          if (currentUser && notification.user_id === currentUser.id) {
            callback(this.formatNotification(notification));
          }
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to notification updates
   */
  subscribeToNotificationUpdates(callback: (notification: Notification) => void) {
    const { data: { user } } = supabase.auth.getUser();

    return supabase
      .channel('notification-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          const notification = payload.new as NotificationRow;
          const currentUser = await user;

          if (currentUser && notification.user_id === currentUser.id) {
            callback(this.formatNotification(notification));
          }
        }
      )
      .subscribe();
  }

  // Helper methods

  private formatNotification(data: NotificationRow): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type as Notification['type'],
      title: data.title,
      message: data.message,
      relatedEntityType: data.related_entity_type as Notification['relatedEntityType'],
      relatedEntityId: data.related_entity_id,
      actionUrl: data.action_url,
      actionLabel: data.action_label,
      isRead: data.is_read,
      readAt: data.read_at ? new Date(data.read_at) : undefined,
      priority: data.priority as Notification['priority'],
      sentInApp: data.sent_in_app,
      sentEmail: data.sent_email,
      sentSms: data.sent_sms,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    };
  }
}

export const notificationService = new NotificationService();
