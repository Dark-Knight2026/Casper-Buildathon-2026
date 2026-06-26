import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Archive, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MessageList from '@/components/communication/MessageList';
import MessageInput from '@/components/communication/MessageInput';
import { messageService } from '@/services/messageService';
import type { ConversationWithParticipants, Message, MessagesResponse } from '@/types/message';

interface ChatWindowProps {
  conversation: ConversationWithParticipants;
  onArchive: () => void;
}

export default function ChatWindow({ conversation, onArchive }: ChatWindowProps) {
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const participant = conversation.otherParticipant;
  const initials = `${participant.firstName[0]}${participant.lastName[0]}`.toUpperCase();

  // Fetch messages
  const { data: messagesData } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: () => messageService.getMessages(conversation.id, { limit: 50, offset: 0 }),
  });

  // Subscribe to real-time messages
  useEffect(() => {
    const channel = messageService.subscribeToMessages(conversation.id, (newMessage) => {
      queryClient.setQueryData(['messages', conversation.id], (old: MessagesResponse | undefined) => {
        if (!old) return { messages: [newMessage], hasMore: false, total: 1 };
        return {
          ...old,
          messages: [...old.messages, newMessage],
          total: old.total + 1,
        };
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [conversation.id, queryClient]);

  // Subscribe to message updates (read receipts)
  useEffect(() => {
    const channel = messageService.subscribeToMessageUpdates(conversation.id, (updatedMessage) => {
      queryClient.setQueryData(['messages', conversation.id], (old: MessagesResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((msg: Message) =>
            msg.id === updatedMessage.id ? updatedMessage : msg
          ),
        };
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [conversation.id, queryClient]);

  // Subscribe to typing indicators
  useEffect(() => {
    const channel = messageService.subscribeToTyping(conversation.id, (userId, typing) => {
      if (userId !== participant.id) return;
      setIsTyping(typing);

      if (typing) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });

    return () => {
      channel.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversation.id, participant.id]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversation.unreadCount > 0) {
      messageService.markConversationAsRead(conversation.id);
    }
  }, [conversation.id, conversation.unreadCount]);

  const handleSendMessage = async (content: string) => {
    await messageService.sendMessage({
      conversationId: conversation.id,
      content,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={participant.avatarUrl} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {participant.firstName} {participant.lastName}
            </h3>
            {conversation.property && (
              <p className="text-sm text-gray-600">{conversation.property.address}</p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <MessageList
          messages={messagesData?.messages || []}
          isTyping={isTyping}
          typingUser={participant}
        />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-4">
        <MessageInput
          onSend={handleSendMessage}
          onTyping={(typing) => messageService.broadcastTyping(conversation.id, typing)}
        />
      </div>
    </div>
  );
}