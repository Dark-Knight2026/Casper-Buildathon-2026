import { useMessaging } from '@/hooks/useMessaging';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export default function ConversationList({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const { conversations, deleteConversation } = useMessaging();

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs mt-1">Start messaging agents from the marketplace</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedConversationId === conversation.id ? 'bg-blue-50' : ''
          }`}
          onClick={() => onSelectConversation(conversation.id)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{conversation.agentName}</h3>
                {conversation.unreadCount > 0 && (
                  <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
              {conversation.lastMessage && (
                <p className="text-xs text-gray-600 truncate">
                  {conversation.lastMessage.senderType === 'user' ? 'You: ' : ''}
                  {conversation.lastMessage.content}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conversation.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}
          </p>
        </div>
      ))}
    </div>
  );
}