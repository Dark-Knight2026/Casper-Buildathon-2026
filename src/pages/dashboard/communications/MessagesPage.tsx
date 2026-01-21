import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Paperclip,
  Image as ImageIcon,
  Smile
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Mock Data Types
interface User {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  role: 'tenant' | 'vendor' | 'agent';
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  participant: User;
  lastMessage: Message;
  unreadCount: number;
  messages: Message[];
}

export const MessagesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  
  // Current logged in user (mock)
  const currentUser = {
    id: 'current-user',
    name: 'Landlord',
    avatar: '/api/placeholder/40/40'
  };

  // Mock Conversations
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-1',
      participant: {
        id: 'user-1',
        name: 'Mike Davis',
        status: 'online',
        role: 'tenant'
      },
      lastMessage: {
        id: 'msg-1',
        senderId: 'user-1',
        content: 'Hi, I have a question about the lease renewal.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
        read: false
      },
      unreadCount: 1,
      messages: [
        {
          id: 'm1',
          senderId: 'current-user',
          content: 'Hello Mike, how can I help you?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          read: true
        },
        {
          id: 'm2',
          senderId: 'user-1',
          content: 'Hi, I have a question about the lease renewal.',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          read: false
        }
      ]
    },
    {
      id: 'conv-2',
      participant: {
        id: 'user-2',
        name: 'Jennifer Wilson',
        status: 'offline',
        role: 'tenant'
      },
      lastMessage: {
        id: 'msg-2',
        senderId: 'current-user',
        content: 'Thanks, I received the rent payment.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true
      },
      unreadCount: 0,
      messages: [
        {
          id: 'm3',
          senderId: 'user-2',
          content: 'Just sent the rent for this month.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25),
          read: true
        },
        {
          id: 'm4',
          senderId: 'current-user',
          content: 'Thanks, I received the rent payment.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          read: true
        }
      ]
    },
    {
      id: 'conv-3',
      participant: {
        id: 'user-3',
        name: 'CoolAir Services',
        status: 'away',
        role: 'vendor'
      },
      lastMessage: {
        id: 'msg-3',
        senderId: 'user-3',
        content: 'We can stop by tomorrow at 2 PM to fix the AC.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
        read: true
      },
      unreadCount: 0,
      messages: [
        {
          id: 'm5',
          senderId: 'current-user',
          content: 'The tenant reported the AC is not cooling.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50),
          read: true
        },
        {
          id: 'm6',
          senderId: 'user-3',
          content: 'We can stop by tomorrow at 2 PM to fix the AC.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
          read: true
        }
      ]
    }
  ]);

  const [selectedConversationId, setSelectedConversationId] = useState<string>(conversations[0].id);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      content: newMessage,
      timestamp: new Date(),
      read: true
    };

    const updatedConversations = conversations.map(conv => {
      if (conv.id === selectedConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, newMsg],
          lastMessage: newMsg
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    setNewMessage('');
  };

  const filteredConversations = conversations.filter(conv => 
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with your tenants and vendors.
        </p>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full flex">
          {/* Sidebar - Conversation List */}
          <div className="w-80 border-r flex flex-col h-full bg-muted/10">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-8 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={cn(
                      "flex items-start gap-3 p-4 text-left hover:bg-accent transition-colors border-b last:border-0",
                      selectedConversationId === conv.id && "bg-accent"
                    )}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarFallback>{conv.participant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                        conv.participant.status === 'online' ? "bg-green-500" :
                        conv.participant.status === 'away' ? "bg-yellow-500" : "bg-gray-400"
                      )} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium truncate">{conv.participant.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {format(conv.lastMessage.timestamp, 'h:mm a')}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm truncate",
                        conv.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {conv.lastMessage.senderId === currentUser.id && "You: "}
                        {conv.lastMessage.content}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-primary text-primary-foreground text-xs px-1">
                        {conv.unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col h-full">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex justify-between items-center bg-background">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{selectedConversation.participant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.participant.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {selectedConversation.participant.role} • {selectedConversation.participant.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages List */}
                <ScrollArea className="flex-1 p-4 bg-muted/5">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex w-full",
                            isMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "flex max-w-[70%] flex-col gap-1 rounded-lg px-4 py-2 text-sm",
                            isMe 
                              ? "bg-primary text-primary-foreground rounded-br-none" 
                              : "bg-muted rounded-bl-none"
                          )}>
                            <p>{msg.content}</p>
                            <span className={cn(
                              "text-[10px] self-end opacity-70",
                              isMe ? "text-primary-foreground" : "text-muted-foreground"
                            )}>
                              {format(msg.timestamp, 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t bg-background">
                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Input 
                      placeholder="Type a message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button type="submit" disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send</span>
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};