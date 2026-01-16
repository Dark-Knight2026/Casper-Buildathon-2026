/**
 * No Messages Empty State
 * Displayed when message inbox is empty
 */

import { Mail, Plus } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface NoMessagesProps {
  compact?: boolean;
  onNewMessage?: () => void;
}

export function NoMessages({ compact = false, onNewMessage }: NoMessagesProps) {
  return (
    <EmptyState
      icon={Mail}
      heading="No messages yet"
      message="Start a conversation with your landlord or tenants."
      action={
        onNewMessage
          ? {
              label: 'New Message',
              onClick: onNewMessage,
              icon: Plus,
            }
          : undefined
      }
      compact={compact}
    />
  );
}