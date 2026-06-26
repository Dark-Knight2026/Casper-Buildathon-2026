import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import MessageBubble from '@/components/communication/MessageBubble';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Message, ConversationParticipant } from '@/types/message';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  typingUser: ConversationParticipant;
}

export default function MessageList({ messages, isTyping, typingUser }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const renderDateSeparator = (date: Date) => (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
        {formatDateSeparator(date)}
      </div>
    </div>
  );

  const groupedMessages: { date: Date; messages: Message[] }[] = [];
  messages.forEach((message) => {
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (!lastGroup || !isSameDay(lastGroup.date, message.createdAt)) {
      groupedMessages.push({ date: message.createdAt, messages: [message] });
    } else {
      lastGroup.messages.push(message);
    }
  });

  return (
    <div className="p-6 space-y-1">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          {renderDateSeparator(group.date)}
          {group.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      ))}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex items-start gap-2 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={typingUser.avatarUrl} />
            <AvatarFallback>
              {typingUser.firstName[0]}
              {typingUser.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}