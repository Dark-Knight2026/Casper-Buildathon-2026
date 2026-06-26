import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessaging } from '@/hooks/useMessaging';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import ConsultationsList from './ConsultationsList';
import InquiriesList from './InquiriesList';
import { MessageSquare, Calendar, FileText, X } from 'lucide-react';

interface MessageCenterProps {
  onClose?: () => void;
}

export default function MessageCenter({ onClose }: MessageCenterProps) {
  const { conversations, consultationRequests, propertyInquiries, unreadCount } = useMessaging();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold">Message Center</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="messages" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="messages" className="relative">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
            {unreadCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="consultations">
            <Calendar className="h-4 w-4 mr-2" />
            Consultations
            {consultationRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {consultationRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inquiries">
            <FileText className="h-4 w-4 mr-2" />
            Inquiries
            {propertyInquiries.filter(i => i.status === 'new').length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {propertyInquiries.filter(i => i.status === 'new').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="flex-1 flex mt-0">
          <div className="flex-1 flex">
            {/* Conversation List */}
            <div className="w-80 border-r flex-shrink-0 overflow-y-auto">
              <ConversationList
                selectedConversationId={selectedConversationId}
                onSelectConversation={setSelectedConversationId}
              />
            </div>

            {/* Message Thread */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <MessageThread
                  conversation={selectedConversation}
                  onClose={() => setSelectedConversationId(null)}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No conversation selected</p>
                    <p className="text-sm">Select a conversation from the list to view messages</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="consultations" className="flex-1 overflow-y-auto p-4">
          <ConsultationsList />
        </TabsContent>

        <TabsContent value="inquiries" className="flex-1 overflow-y-auto p-4">
          <InquiriesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}