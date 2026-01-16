import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConversationWithParticipants } from '@/types/message';

interface ConversationListProps {
  conversations: ConversationWithParticipants[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="divide-y">
      {conversations.map((conversation) => {
        const participant = conversation.otherParticipant;
        const initials = `${participant.firstName[0]}${participant.lastName[0]}`.toUpperCase();
        const isSelected = conversation.id === selectedId;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              'w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left',
              isSelected && 'bg-blue-50 hover:bg-blue-50'
            )}
          >
            {/* Avatar */}
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={participant.avatarUrl} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm truncate">
                  {participant.firstName} {participant.lastName}
                </h4>
                {conversation.lastMessageAt && (
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDistanceToNow(conversation.lastMessageAt, { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Property Info */}
              {conversation.property && (
                <p className="text-xs text-gray-500 mb-1 truncate">
                  {conversation.property.address}
                </p>
              )}

              {/* Last Message Preview */}
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    'text-sm truncate',
                    conversation.unreadCount > 0
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-600'
                  )}
                >
                  {conversation.lastMessagePreview || 'No messages yet'}
                </p>
                {conversation.unreadCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-2 flex-shrink-0 h-5 min-w-5 px-1.5 text-xs"
                  >
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}