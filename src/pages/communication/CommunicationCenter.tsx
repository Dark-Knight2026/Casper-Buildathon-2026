import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageSquarePlus } from 'lucide-react';
import ConversationList from '@/components/communication/ConversationList';
import ChatWindow from '@/components/communication/ChatWindow';
import { conversationService } from '@/services/conversationService';
import type { ConversationWithParticipants } from '@/types/message';

export default function CommunicationCenter() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived'>('active');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', filterStatus],
    queryFn: () => conversationService.getConversations({ status: filterStatus }),
  });

  const filteredConversations = conversations.filter((conv) =>
    searchQuery
      ? conv.otherParticipant.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.otherParticipant.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessagePreview?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversationId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Messages</h1>
          <Button size="sm">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Conversation List */}
        <div className="w-80 bg-white border-r flex flex-col">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'active' | 'archived')} className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value={filterStatus} className="flex-1 overflow-y-auto mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading conversations...</div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <MessageSquarePlus className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="font-semibold mb-1">No conversations</h3>
                  <p className="text-sm text-gray-600">
                    {searchQuery
                      ? 'No conversations match your search'
                      : 'Start a new conversation to get started'}
                  </p>
                </div>
              ) : (
                <ConversationList
                  conversations={filteredConversations}
                  selectedId={selectedConversationId}
                  onSelect={setSelectedConversationId}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              onArchive={() => {
                conversationService.archiveConversation(selectedConversation.id);
                setSelectedConversationId(null);
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquarePlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-gray-600">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}