import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Archive, MoreVertical, MessageSquarePlus, Send, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ConversationSidebar from '@/components/communication/ConversationSidebar';
import { conversationService } from '@/services/conversationService';
import { messageService } from '@/services/messageService';

// TODO: replace with real user id from auth context when backend is ready
const CURRENT_USER_ID = 'mock-tenant-1';

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export default function CommunicationCenter() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived'>('active');
  const [newMessage, setNewMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<string, { id: string; senderId: string; content: string; timestamp: Date }[]>>({});
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const { data: conversations = [], refetch } = useQuery({
    queryKey: ['conversations', filterStatus],
    queryFn: () => conversationService.getConversations({ status: filterStatus }),
  });

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => selectedId
      ? messageService.getMessages(selectedId, { limit: 50, offset: 0 })
      : Promise.resolve({ messages: [], hasMore: false, total: 0 }),
    enabled: !!selectedId,
  });

  const messages = messagesData?.messages ?? [];

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileView('chat');
    messageService.markConversationAsRead(id);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedId) return;
    const content = newMessage.trim();
    setNewMessage('');
    await messageService.sendMessage({ conversationId: selectedId, content });
    // Optimistically add message to local state for immediate display
    setLocalMessages((prev) => ({
      ...prev,
      [selectedId]: [
        ...(prev[selectedId] ?? []),
        { id: `opt-${Date.now()}`, senderId: CURRENT_USER_ID, content, timestamp: new Date() },
      ],
    }));
  };

  const handleArchive = async (id: string) => {
    await conversationService.archiveConversation(id);
    setSelectedId(null);
    refetch();
  };

  // Merge server messages with optimistic local messages
  const allMessages = [
    ...messages,
    ...(localMessages[selectedId ?? ''] ?? []).map((m) => ({
      id: m.id,
      conversationId: selectedId!,
      senderId: m.senderId,
      senderRole: 'tenant' as const,
      content: m.content,
      messageType: 'text' as const,
      isRead: true,
      readBy: [],
      createdAt: m.timestamp,
      updatedAt: m.timestamp,
    })),
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <Button size="sm">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — always visible on md+, toggled on mobile */}
        <div className={cn('w-full md:w-auto md:flex', mobileView === 'list' ? 'flex' : 'hidden')}>
          <ConversationSidebar
            conversations={conversations}
            selectedId={selectedId}
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            onSelect={handleSelect}
            onSearchChange={setSearchQuery}
            onFilterChange={(s) => { setFilterStatus(s); setSelectedId(null); }}
          />
        </div>

        {/* Chat area */}
        <div className={cn(
          'flex-1 flex flex-col overflow-hidden',
          mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        )}>
          {selected ? (
            <>
              {/* Chat header */}
              <div className="border-b px-4 py-4 flex items-center justify-between bg-background shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden shrink-0"
                    onClick={() => setMobileView('list')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {initials(selected.otherParticipant.firstName, selected.otherParticipant.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selected.otherParticipant.firstName} {selected.otherParticipant.lastName}
                    </h3>
                    {selected.property && (
                      <p className="text-sm text-muted-foreground">{selected.property.address}</p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleArchive(selected.id)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-muted/5">
                <div className="space-y-4">
                  {allMessages.map((msg) => {
                    const isMe = msg.senderId === CURRENT_USER_ID;
                    return (
                      <div key={msg.id} className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'flex max-w-[70%] flex-col gap-1 rounded-lg px-4 py-2 text-sm',
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted text-foreground rounded-bl-none'
                        )}>
                          <p>{msg.content}</p>
                          <span className={cn(
                            'text-[10px] self-end opacity-70',
                            isMe ? 'text-primary-foreground' : 'text-muted-foreground'
                          )}>
                            {format(msg.createdAt, 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4 bg-background shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquarePlus className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">Choose a conversation from the list</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
