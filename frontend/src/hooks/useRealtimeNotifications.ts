/**
 * useRealtimeNotifications Hook
 * Hook for subscribing to real-time notifications
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { realtimeService } from '@/services/realtimeService';
import { Notification } from '@/types/notification';
import { useNotifications } from '@/hooks/useNotifications';

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { addNotification, playSound, preferences } = useNotifications();

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      // Add to notification list
      addNotification(notification);

      // Play sound if enabled
      if (preferences.sound_enabled) {
        playSound();
      }

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/images/photo1767669642.jpg',
          tag: notification.id,
        });
      }
    },
    [addNotification, playSound, preferences.sound_enabled]
  );

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to notifications
    const unsubscribe = realtimeService.subscribeToNotifications(
      user.id,
      handleNewNotification
    );

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [user?.id, handleNewNotification]);

  return {
    isConnected: user?.id
      ? realtimeService.isSubscribed(`notifications:${user.id}`)
      : false,
  };
}