/**
 * Notification Toast Component
 * Toast notification for real-time alerts
 */

import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/types/notification';

export function NotificationToast() {
  const { toast } = useToast();
  const { notifications } = useNotifications();

  const showToast = useCallback((notification: Notification) => {
    const variant = notification.priority === 'urgent' ? 'destructive' : 'default';

    toast({
      title: notification.title,
      description: notification.message,
      variant,
      duration: notification.priority === 'urgent' ? 10000 : 5000,
    });
  }, [toast]);

  useEffect(() => {
    // Show toast for the latest notification
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      
      // Only show toast for new notifications (created within last 5 seconds)
      const createdAt = new Date(latestNotification.created_at);
      const now = new Date();
      const diffInSeconds = (now.getTime() - createdAt.getTime()) / 1000;

      if (diffInSeconds < 5 && !latestNotification.read) {
        showToast(latestNotification);
      }
    }
  }, [notifications, showToast]);

  return null;
}