import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maintenanceService, MaintenanceMessage } from '@/services/maintenanceService';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface MaintenanceChatProps {
  requestId: string;
}

export default function MaintenanceChat({ requestId }: MaintenanceChatProps) {
  const [messages, setMessages] = useState<MaintenanceMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await maintenanceService.getMessages(requestId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    getCurrentUser();

    // Subscribe to new messages
    const channel = supabase
      .channel(`maintenance_messages:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maintenance_messages',
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MaintenanceMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, loadMessages, getCurrentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;

    setSending(true);
    try {
      await maintenanceService.sendMessage(
        requestId,
        newMessage,
        attachments.length > 0 ? attachments : undefined
      );
      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getSenderLabel = (message: MaintenanceMessage) => {
    if (message.sender_id === currentUserId) {
      return 'You';
    }
    switch (message.sender_type) {
      case 'tenant':
        return 'Tenant';
      case 'landlord':
        return 'Landlord';
      case 'vendor':
        return 'Vendor';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading messages...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Thread</CardTitle>
        <CardDescription>
          Chat with all parties involved in this maintenance request
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.sender_id === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border'
                  }`}
                >
                  <p className="text-xs font-medium mb-1">
                    {getSenderLabel(message)}
                  </p>
                  <p className="text-sm">{message.message}</p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline block"
                        >
                          Attachment {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mt-2 opacity-70">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="space-y-4">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
                >
                  <span>{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="message-attachment"
            />
            <label htmlFor="message-attachment">
              <Button type="button" variant="outline" size="icon" asChild>
                <span>
                  <Paperclip className="h-4 w-4" />
                </span>
              </Button>
            </label>

            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
            />

            <Button type="submit" disabled={sending || (!newMessage.trim() && attachments.length === 0)}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}