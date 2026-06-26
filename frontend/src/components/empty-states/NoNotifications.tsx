/**
 * No Notifications Empty State
 * Displayed when notification list is empty
 */

import { Bell } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface NoNotificationsProps {
  compact?: boolean;
}

export function NoNotifications({ compact = false }: NoNotificationsProps) {
  return (
    <EmptyState
      icon={Bell}
      heading="No notifications"
      message="You're all caught up! Notifications will appear here when you have new activity."
      compact={compact}
    />
  );
}