/**
 * Notification Item Component
 * Individual notification item in the list
 */

import { Notification, NotificationType } from '@/types/notification';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CreditCard,
  Wrench,
  FileText,
  Mail,
  ClipboardList,
  File,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: Notification;
}

const iconMap: Record<NotificationType, React.ElementType> = {
  payment: CreditCard,
  maintenance: Wrench,
  lease: FileText,
  message: Mail,
  application: ClipboardList,
  document: File,
  system: Bell,
};

const colorMap: Record<NotificationType, string> = {
  payment: 'text-green-600',
  maintenance: 'text-orange-600',
  lease: 'text-blue-600',
  message: 'text-purple-600',
  application: 'text-indigo-600',
  document: 'text-gray-600',
  system: 'text-gray-600',
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const Icon = iconMap[notification.type];
  const iconColor = colorMap[notification.type];

  const handleClick = async () => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate if link provided
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notification.id);
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-4 hover:bg-accent cursor-pointer transition-colors',
        !notification.read && 'bg-accent/50'
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className={cn('mt-1', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn('text-sm font-medium', !notification.read && 'font-semibold')}>
            {notification.title}
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleDelete}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Delete notification</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="mt-2">
          <div className="h-2 w-2 bg-blue-600 rounded-full" />
        </div>
      )}
    </div>
  );
}