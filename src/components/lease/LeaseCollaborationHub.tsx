/**
 * Lease Collaboration Hub Component
 * Facilitate communication between landlords, tenants, and agents
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Paperclip,
  Users,
  Clock,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'landlord' | 'tenant' | 'agent';
  content: string;
  timestamp: Date;
  read: boolean;
  attachments?: string[];
}

interface LeaseCollaborationHubProps {
  leaseId: string;
  currentUserId: string;
  currentUserRole: 'landlord' | 'tenant' | 'agent';
}

export default function LeaseCollaborationHub({
  leaseId,
  currentUserId,
  currentUserRole
}: LeaseCollaborationHubProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'landlord-1',
      senderName: 'John Smith',
      senderRole: 'landlord',
      content: 'Welcome! Please let me know if you have any questions about the lease.',
      timestamp: new Date(Date.now() - 86400000),
      read: true
    },
    {
      id: '2',
      senderId: 'tenant-1',
      senderName: 'Jane Doe',
      senderRole: 'tenant',
      content: 'Thank you! I have a question about the parking arrangements.',
      timestamp: new Date(Date.now() - 43200000),
      read: true
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    
    const message: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUserId,
      senderName: 'Current User',
      senderRole: currentUserRole,
      content: newMessage,
      timestamp: new Date(),
      read: false
    };

    setMessages([...messages, message]);
    setNewMessage('');
    setIsSending(false);
  };

  const getRoleColor = (role: Message['senderRole']) => {
    switch (role) {
      case 'landlord':
        return 'bg-blue-100 text-blue-800';
      case 'tenant':
        return 'bg-green-100 text-green-800';
      case 'agent':
        return 'bg-purple-100 text-purple-800';
    }
  };

  const getRoleInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Collaboration Hub
              </CardTitle>
              <CardDescription>
                Communicate with all parties involved in this lease
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              3 Participants
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-6">
            <div className="space-y-4">
              {messages.map((message) => {
                const isCurrentUser = message.senderId === currentUserId;
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${message.senderName}`} />
                      <AvatarFallback>{getRoleInitials(message.senderName)}</AvatarFallback>
                    </Avatar>

                    <div className={`flex-1 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{message.senderName}</span>
                        <Badge variant="outline" className={`text-xs ${getRoleColor(message.senderRole)}`}>
                          {message.senderRole}
                        </Badge>
                      </div>

                      <div
                        className={`rounded-lg p-3 max-w-[70%] ${
                          isCurrentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{format(message.timestamp, 'MMM d, HH:mm')}</span>
                        {isCurrentUser && message.read && (
                          <CheckCheck className="h-3 w-3 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Schedule Meeting
            </Button>
            <Button variant="outline" size="sm">
              Request Documents
            </Button>
            <Button variant="outline" size="sm">
              Report Issue
            </Button>
            <Button variant="outline" size="sm">
              View Lease Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}