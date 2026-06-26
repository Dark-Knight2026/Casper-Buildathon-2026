import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationList from '@/components/notifications/NotificationList';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types/notification';

export default function NotificationCenter() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch recent notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationService.getNotifications(undefined, { limit: 10, offset: 0 }),
  });

  const unreadCount = notificationsData?.unreadCount || 0;
  const notifications = notificationsData?.notifications || [];

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = notificationService.subscribeToNotifications((newNotification) => {
      // Add new notification to cache
      queryClient.setQueryData(['notifications', 'recent'], (old: typeof notificationsData) => {
        if (!old) return { notifications: [newNotification], hasMore: false, total: 1, unreadCount: 1 };
        return {
          ...old,
          notifications: [newNotification, ...old.notifications].slice(0, 10),
          total: old.total + 1,
          unreadCount: old.unreadCount + 1,
        };
      });

      // Show browser notification for high priority
      if (newNotification.priority === 'high' || newNotification.priority === 'urgent') {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/images/photo1767664045.jpg',
          });
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, notificationsData]);

  // Subscribe to notification updates
  useEffect(() => {
    const channel = notificationService.subscribeToNotificationUpdates((updatedNotification) => {
      queryClient.setQueryData(['notifications', 'recent'], (old: typeof notificationsData) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: Notification) =>
            n.id === updatedNotification.id ? updatedNotification : n
          ),
          unreadCount: updatedNotification.isRead ? Math.max(0, old.unreadCount - 1) : old.unreadCount,
        };
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, notificationsData]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <h4 className="font-semibold mb-1">No notifications</h4>
              <p className="text-sm text-gray-600">
                You're all caught up!
              </p>
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onNotificationClick={() => setIsOpen(false)}
            />
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Link to="/notifications">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}