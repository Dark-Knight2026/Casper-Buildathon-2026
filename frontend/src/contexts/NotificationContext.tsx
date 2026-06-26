/**
 * Notification Context
 * Global state management for notifications
 */

import React, { createContext, useState, useCallback, useEffect } from 'react';
import { Notification, NotificationPreferences } from '@/types/notification';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  playSound: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Notification sound
const notificationSound = new Audio('/sounds/notification.mp3');

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    user_id: '',
    email_enabled: true,
    push_enabled: true,
    sound_enabled: true,
    payment_notifications: true,
    maintenance_notifications: true,
    lease_notifications: true,
    message_notifications: true,
    application_notifications: true,
    document_notifications: true,
    system_notifications: true,
  });

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load notifications
  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user?.id]);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: user.id,
          email_enabled: true,
          push_enabled: true,
          sound_enabled: true,
          payment_notifications: true,
          maintenance_notifications: true,
          lease_notifications: true,
          message_notifications: true,
          application_notifications: true,
          document_notifications: true,
          system_notifications: true,
        };
        
        await supabase.from('notification_preferences').insert(defaultPrefs);
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, [user?.id]);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      refreshNotifications();
      loadPreferences();
    }
  }, [user?.id, refreshNotifications, loadPreferences]);

  // Add notification
  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Clear all
  const clearAll = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [user?.id]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (preferences.sound_enabled) {
      notificationSound.play().catch((error) => {
        console.error('Error playing notification sound:', error);
      });
    }
  }, [preferences.sound_enabled]);

  // Update preferences
  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!user?.id) return;

      try {
        const updatedPrefs = { ...preferences, ...prefs };
        
        const { error } = await supabase
          .from('notification_preferences')
          .update(updatedPrefs)
          .eq('user_id', user.id);

        if (error) throw error;

        setPreferences(updatedPrefs);
      } catch (error) {
        console.error('Error updating preferences:', error);
      }
    },
    [user?.id, preferences]
  );

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    playSound,
    updatePreferences,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}