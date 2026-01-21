import { supabase } from '@/lib/supabase/client';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesData,
  NotificationType,
  ChannelPreferences,
} from '@/types/notification';

interface NotificationPreferencesRow {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  preferences: Record<string, ChannelPreferences>;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  email_digest_enabled: boolean;
  email_digest_frequency: string;
  created_at: string;
  updated_at: string;
}

class NotificationPreferencesService {
  /**
   * Get notification preferences for current user
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create default ones
      if (!data) {
        return await this.createDefaultPreferences(user.id);
      }

      return this.formatPreferences(data as NotificationPreferencesRow);
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(updates: UpdateNotificationPreferencesData): Promise<NotificationPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.inAppEnabled !== undefined) {
        updateData.in_app_enabled = updates.inAppEnabled;
      }
      if (updates.emailEnabled !== undefined) {
        updateData.email_enabled = updates.emailEnabled;
      }
      if (updates.smsEnabled !== undefined) {
        updateData.sms_enabled = updates.smsEnabled;
      }
      if (updates.preferences) {
        // Merge with existing preferences
        const { data: current } = await supabase
          .from('notification_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .single();

        updateData.preferences = {
          ...(current?.preferences || {}),
          ...updates.preferences,
        };
      }
      if (updates.quietHoursEnabled !== undefined) {
        updateData.quiet_hours_enabled = updates.quietHoursEnabled;
      }
      if (updates.quietHoursStart) {
        updateData.quiet_hours_start = updates.quietHoursStart;
      }
      if (updates.quietHoursEnd) {
        updateData.quiet_hours_end = updates.quietHoursEnd;
      }
      if (updates.emailDigestEnabled !== undefined) {
        updateData.email_digest_enabled = updates.emailDigestEnabled;
      }
      if (updates.emailDigestFrequency) {
        updateData.email_digest_frequency = updates.emailDigestFrequency;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return this.formatPreferences(data as NotificationPreferencesRow);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update channel preference for a specific notification type
   */
  async updateChannelPreference(
    type: NotificationType,
    channel: 'inApp' | 'email' | 'sms',
    enabled: boolean
  ): Promise<void> {
    try {
      const preferences = await this.getPreferences();
      const typePreferences = preferences.preferences[type] || {
        inApp: true,
        email: true,
        sms: false,
      };

      typePreferences[channel] = enabled;

      await this.updatePreferences({
        preferences: {
          [type]: typePreferences,
        },
      });
    } catch (error) {
      console.error('Error updating channel preference:', error);
      throw error;
    }
  }

  /**
   * Create default preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const defaultPreferences = this.getDefaultPreferences();

      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          in_app_enabled: defaultPreferences.inAppEnabled,
          email_enabled: defaultPreferences.emailEnabled,
          sms_enabled: defaultPreferences.smsEnabled,
          preferences: defaultPreferences.preferences,
          quiet_hours_enabled: defaultPreferences.quietHoursEnabled,
          email_digest_enabled: defaultPreferences.emailDigestEnabled,
          email_digest_frequency: defaultPreferences.emailDigestFrequency,
        })
        .select()
        .single();

      if (error) throw error;

      return this.formatPreferences(data as NotificationPreferencesRow);
    } catch (error) {
      console.error('Error creating default preferences:', error);
      throw error;
    }
  }

  /**
   * Get default notification preferences
   */
  getDefaultPreferences(): Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    const defaultChannelPreferences: ChannelPreferences = {
      inApp: true,
      email: true,
      sms: false,
    };

    return {
      inAppEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      preferences: {
        payment_due: { inApp: true, email: true, sms: false },
        payment_received: { inApp: true, email: true, sms: false },
        payment_overdue: { inApp: true, email: true, sms: true },
        maintenance_request_created: { inApp: true, email: true, sms: false },
        maintenance_request_updated: { inApp: true, email: false, sms: false },
        maintenance_request_completed: { inApp: true, email: true, sms: false },
        lease_expiring: { inApp: true, email: true, sms: true },
        lease_renewed: { inApp: true, email: true, sms: false },
        lease_signed: { inApp: true, email: true, sms: false },
        message_received: { inApp: true, email: false, sms: false },
        application_submitted: { inApp: true, email: true, sms: false },
        application_approved: { inApp: true, email: true, sms: true },
        application_rejected: { inApp: true, email: true, sms: false },
        document_uploaded: { inApp: true, email: false, sms: false },
        document_signed: { inApp: true, email: true, sms: false },
        inspection_scheduled: { inApp: true, email: true, sms: true },
        system_announcement: { inApp: true, email: false, sms: false },
      },
      quietHoursEnabled: false,
      emailDigestEnabled: false,
      emailDigestFrequency: 'daily',
    };
  }

  // Helper methods

  private formatPreferences(data: NotificationPreferencesRow): NotificationPreferences {
    return {
      id: data.id,
      userId: data.user_id,
      inAppEnabled: data.in_app_enabled,
      emailEnabled: data.email_enabled,
      smsEnabled: data.sms_enabled,
      preferences: data.preferences as Record<NotificationType, ChannelPreferences>,
      quietHoursEnabled: data.quiet_hours_enabled,
      quietHoursStart: data.quiet_hours_start,
      quietHoursEnd: data.quiet_hours_end,
      emailDigestEnabled: data.email_digest_enabled,
      emailDigestFrequency: data.email_digest_frequency as 'daily' | 'weekly',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();
