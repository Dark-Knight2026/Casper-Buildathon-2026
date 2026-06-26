import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  Video,
  Phone,
  MoreVertical,
  X,
  Calendar,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: { name: string; type: string; url: string }[];
}

interface Conversation {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  agentName: string;
  agentAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

interface CommunicationCenterProps {
  onClose: () => void;
}

export function CommunicationCenter({ onClose }: CommunicationCenterProps) {
  const [activeTab, setActiveTab] = useState('messages');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const mockConversations: Conversation[] = [
    {
      id: 'conv-1',
      propertyId: 'prop-001',
      propertyTitle: 'Modern Downtown Loft',
      propertyAddress: '123 Main St, Los Angeles',
      agentName: 'Sarah Johnson',
      agentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop',
      lastMessage: 'The property is available for viewing this weekend.',
      lastMessageTime: '2 hours ago',
      unreadCount: 2,
      messages: [
        {
          id: 'msg-1',
          senderId: 'agent-1',
          senderName: 'Sarah Johnson',
          senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop',
          content: 'Hi! Thank you for your interest in this property. How can I help you?',
          timestamp: '2024-01-15 10:30 AM',
          isRead: true,
        },
        {
          id: 'msg-2',
          senderId: 'buyer-1',
          senderName: 'You',
          senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop',
          content: "I'd like to schedule a viewing. Is this weekend available?",
          timestamp: '2024-01-15 11:00 AM',
          isRead: true,
        },
        {
          id: 'msg-3',
          senderId: 'agent-1',
          senderName: 'Sarah Johnson',
          senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop',
          content: 'The property is available for viewing this weekend. Saturday at 2 PM or Sunday at 10 AM work best. Which would you prefer?',
          timestamp: '2024-01-15 11:15 AM',
          isRead: false,
        },
      ],
    },
    {
      id: 'conv-2',
      propertyId: 'prop-002',
      propertyTitle: 'Suburban Family Home',
      propertyAddress: '456 Oak Avenue, Pasadena',
      agentName: 'Michael Chen',
      agentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop',
      lastMessage: 'The inspection report is ready for your review.',
      lastMessageTime: '1 day ago',
      unreadCount: 0,
      messages: [
        {
          id: 'msg-4',
          senderId: 'agent-2',
          senderName: 'Michael Chen',
          senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop',
          content: 'The inspection report is ready for your review. I can walk you through the findings.',
          timestamp: '2024-01-14 3:00 PM',
          isRead: true,
          attachments: [
            { name: 'Inspection_Report.pdf', type: 'pdf', url: '#' },
          ],
        },
      ],
    },
  ];

  const messageTemplates = [
    { id: 1, title: 'Request Viewing', content: "I'm interested in viewing this property. What times are available?" },
    { id: 2, title: 'Ask About Price', content: 'Is the seller open to negotiations on the asking price?' },
    { id: 3, title: 'Request Documents', content: 'Could you please share the property disclosure documents?' },
    { id: 4, title: 'Schedule Call', content: "I'd like to schedule a call to discuss this property in detail." },
  ];

  const currentConversation = mockConversations.find((c) => c.id === selectedConversation);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast({
      title: "Message sent!",
      description: "Your message has been delivered successfully.",
    });
    
    setMessageText('');
    setIsSending(false);
  };

  const handleScheduleCall = () => {
    toast({
      title: "Opening scheduler",
      description: "The call scheduling interface will open shortly.",
    });
  };

  const filteredConversations = mockConversations.filter(
    (conv) =>
      conv.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.agentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-auto animate-in fade-in-0 duration-300">
      <div className="min-h-screen flex items-start justify-center p-4 py-8">
        <Card className="w-full max-w-6xl h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Communication Center
                </CardTitle>
                <CardDescription>Message agents and manage your conversations</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="mx-6 mt-4">
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="messages" className="flex-1 overflow-hidden mt-0">
                <div className="h-full grid md:grid-cols-3 divide-x">
                  {/* Conversations List */}
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          placeholder="Search conversations..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                      {filteredConversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedConversation === conv.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedConversation(conv.id)}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={conv.agentAvatar}
                              alt={conv.agentName}
                              className="w-12 h-12 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{conv.propertyTitle}</p>
                                  <p className="text-xs text-gray-600 truncate">{conv.agentName}</p>
                                </div>
                                {conv.unreadCount > 0 && (
                                  <Badge className="bg-blue-600 text-white ml-2">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                              <p className="text-xs text-gray-500 mt-1">{conv.lastMessageTime}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message Thread */}
                  <div className="md:col-span-2 flex flex-col h-full">
                    {currentConversation ? (
                      <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b bg-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={currentConversation.agentAvatar}
                                alt={currentConversation.agentName}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <p className="font-semibold">{currentConversation.agentName}</p>
                                <p className="text-sm text-gray-600">
                                  {currentConversation.propertyTitle}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={handleScheduleCall}>
                                <Video className="w-4 h-4 mr-2" />
                                Video Call
                              </Button>
                              <Button variant="outline" size="sm">
                                <Phone className="w-4 h-4 mr-2" />
                                Call
                              </Button>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50">
                          {currentConversation.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${
                                message.senderId.startsWith('buyer') ? 'flex-row-reverse' : ''
                              }`}
                            >
                              <img
                                src={message.senderAvatar}
                                alt={message.senderName}
                                className="w-8 h-8 rounded-full flex-shrink-0"
                              />
                              <div
                                className={`max-w-[70%] ${
                                  message.senderId.startsWith('buyer') ? 'items-end' : 'items-start'
                                } flex flex-col`}
                              >
                                <div
                                  className={`rounded-lg p-3 ${
                                    message.senderId.startsWith('buyer')
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white border'
                                  }`}
                                >
                                  <p className="text-sm">{message.content}</p>
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                      {message.attachments.map((attachment, idx) => (
                                        <div
                                          key={idx}
                                          className={`flex items-center gap-2 p-2 rounded ${
                                            message.senderId.startsWith('buyer')
                                              ? 'bg-blue-700'
                                              : 'bg-gray-50'
                                          }`}
                                        >
                                          <FileText className="w-4 h-4" />
                                          <span className="text-xs">{attachment.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t bg-white">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon">
                              <Paperclip className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <ImageIcon className="w-5 h-5" />
                            </Button>
                            <Input
                              placeholder="Type your message..."
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              className="flex-1"
                              disabled={isSending}
                            />
                            <Button onClick={handleSendMessage} disabled={!messageText.trim() || isSending}>
                              {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-semibold mb-2">No conversation selected</p>
                          <p className="text-sm">
                            Select a conversation from the list to start messaging
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Message Templates</h3>
                    <p className="text-sm text-gray-600">
                      Quick templates to speed up your communication with agents
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {messageTemplates.map((template) => (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base">{template.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-700 mb-4">{template.content}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMessageText(template.content)}
                          >
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">Create Custom Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Template Name</label>
                        <Input placeholder="e.g., Follow-up Question" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Message Content</label>
                        <Textarea
                          rows={4}
                          placeholder="Enter your template message..."
                        />
                      </div>
                      <Button>
                        <Send className="w-4 h-4 mr-2" />
                        Save Template
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}