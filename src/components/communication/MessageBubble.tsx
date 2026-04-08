import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/message';

// TODO: replace with real user id from auth context when backend is ready
const MOCK_USER_ID = 'mock-tenant-1';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isOwnMessage = message.senderId === MOCK_USER_ID;

  return (
    <div
      className={cn(
        'flex gap-2 mb-4',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOwnMessage && message.sender && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender.avatarUrl} />
          <AvatarFallback>
            {message.sender.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2 shadow-sm',
          isOwnMessage
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {/* Message Content */}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

        {/* Timestamp and Read Receipt */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1 text-xs',
            isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          <span>{format(message.createdAt, 'HH:mm')}</span>
          {isOwnMessage && (
            <>
              {message.isRead ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </>
          )}
        </div>
      </div>

      {isOwnMessage && message.sender && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender.avatarUrl} />
          <AvatarFallback>
            {message.sender.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}