/**
 * Message Thread Component
 * Real-time message display for maintenance requests
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { maintenanceService, type MaintenanceMessage, type SenderType } from '@/services/maintenanceService';
import { getCurrentUserId } from '@/lib/supabase/client';
import { authService } from '@/services/authService';

interface MessageThreadProps {
  requestId: string;
}

export function MessageThread({ requestId }: MessageThreadProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<MaintenanceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [senderType, setSenderType] = useState<SenderType>('tenant');

  const loadMessages = useCallback(async () => {
    try {
      const data = await maintenanceService.getMessages(requestId);
      setMessages(data);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const initializeUser = async () => {
      const userId = await getCurrentUserId();
      if (userId) {
        setCurrentUserId(userId);
        
        // Get user profile to determine sender type
        const profile = await authService.getUserProfile(userId);
        if (profile) {
          setSenderType(profile.role === 'landlord' ? 'landlord' : profile.role === 'vendor' ? 'vendor' : 'tenant');
        }
      }
    };

    initializeUser();
    loadMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);

    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    try {
      setSending(true);

      await maintenanceService.addMessage(
        requestId,
        currentUserId,
        senderType,
        newMessage.trim()
      );

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSenderColor = (type: SenderType) => {
    switch (type) {
      case 'tenant':
        return 'bg-blue-500';
      case 'landlord':
        return 'bg-green-500';
      case 'vendor':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      <div className="space-y-4 max-h-96 overflow-y-auto p-4 border rounded-lg bg-muted/20">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isCurrentUser = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={getSenderColor(message.senderType)}>
                      {message.sender ? getInitials(message.sender.fullName) : '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {!isCurrentUser && (
                        <span className="text-sm font-medium">
                          {message.sender?.fullName || 'Unknown'}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </span>
                      {isCurrentUser && (
                        <span className="text-sm font-medium">You</span>
                      )}
                    </div>

                    <div
                      className={`inline-block px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline block"
                          >
                            Attachment {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={2}
          className="resize-none"
        />
        <Button
          onClick={handleSendMessage}
          disabled={sending || !newMessage.trim()}
          size="icon"
          className="h-auto"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}