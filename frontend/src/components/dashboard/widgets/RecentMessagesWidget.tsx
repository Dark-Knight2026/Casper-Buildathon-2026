/**
 * Recent Messages Widget
 * Displays recent messages
 */

import { useQuery } from '@tanstack/react-query';
import { messageService } from '@/services/messageService';
import { Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function RecentMessagesWidget() {
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', 'recent'],
    queryFn: () => messageService.getAll({ limit: 5 }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Mail className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No recent messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {message.sender_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium truncate">{message.sender_name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(message.created_at), 'MMM d')}
              </p>
            </div>
            <p className="text-sm text-muted-foreground truncate">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}