/**
 * Notification List Component
 * Displays list of notifications in popover or as a standalone list
 */

import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationItem } from './NotificationItem';
import { CheckCheck, Trash2 } from 'lucide-react';
import { NoNotifications } from '@/components/empty-states';
import type { Notification } from '@/types/notification';

interface NotificationListProps {
  notifications?: Notification[];
  showHeader?: boolean;
  showFooter?: boolean;
  maxHeight?: string;
}

export function NotificationList({
  notifications: externalNotifications,
  showHeader = true,
  showFooter = true,
  maxHeight = '500px',
}: NotificationListProps) {
  const { notifications: contextNotifications, unreadCount, markAllAsRead, clearAll } = useNotifications();
  
  // Use external notifications if provided, otherwise use context notifications
  const notifications = externalNotifications || contextNotifications;

  return (
    <div className="flex flex-col" style={{ height: maxHeight }}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                title="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <NoNotifications compact />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      {showFooter && notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button variant="ghost" className="w-full" size="sm">
              View All Notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Default export for backward compatibility
export default NotificationList;