import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Smile,
  Check,
  CheckCheck,
  Clock,
  Search,
  MoreVertical,
  Calendar,
  Bot,
  Users,
  MessageSquare
} from 'lucide-react';
import { Message, Conversation, QuickReply, AIFAQResponse } from '@/types/tenant-enhanced';
import { useToast } from '@/hooks/use-toast';

export default function EnhancedMessenger() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-1',
      type: 'direct',
      title: 'Landlord - Property Management',
      participants: [
        { user_id: 'landlord-1', user_name: 'John Smith', user_role: 'landlord', joined_at: new Date() },
        { user_id: 'tenant-1', user_name: 'You', user_role: 'tenant', joined_at: new Date() }
      ],
      unread_count: 2,
      created_at: new Date('2024-01-15'),
      updated_at: new Date()
    },
    {
      id: 'conv-2',
      type: 'maintenance',
      title: 'Maintenance Request #1234',
      participants: [
        { user_id: 'tech-1', user_name: 'Bob Wilson', user_role: 'technician', joined_at: new Date() },
        { user_id: 'tenant-1', user_name: 'You', user_role: 'tenant', joined_at: new Date() }
      ],
      unread_count: 0,
      created_at: new Date('2024-01-20'),
      updated_at: new Date()
    }
  ]);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'landlord-1',
      sender_name: 'John Smith',
      sender_role: 'landlord',
      content: 'Hi! Welcome to your new home. Let me know if you have any questions.',
      message_type: 'text',
      read_by: ['tenant-1'],
      read_receipts: [
        { user_id: 'tenant-1', user_name: 'You', read_at: new Date() }
      ],
      created_at: new Date('2024-01-15T10:00:00'),
      updated_at: new Date('2024-01-15T10:00:00')
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-1',
      sender_id: 'tenant-1',
      sender_name: 'You',
      sender_role: 'tenant',
      content: 'Thank you! I have a question about the parking arrangements.',
      message_type: 'text',
      read_by: ['landlord-1'],
      read_receipts: [
        { user_id: 'landlord-1', user_name: 'John Smith', read_at: new Date() }
      ],
      created_at: new Date('2024-01-15T10:05:00'),
      updated_at: new Date('2024-01-15T10:05:00')
    }
  ]);

  const [messageInput, setMessageInput] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickReplies: QuickReply[] = [
    { id: '1', text: 'Thank you!', category: 'general' },
    { id: '2', text: 'I\'ll check and get back to you', category: 'general' },
    { id: '3', text: 'When can you come by?', category: 'maintenance' },
    { id: '4', text: 'Payment has been sent', category: 'payment' },
    { id: '5', text: 'Can we schedule a time?', category: 'scheduling' }
  ];

  const aiSuggestions: AIFAQResponse[] = [
    {
      question: 'How do I pay rent?',
      answer: 'You can pay rent through the Payments tab using your saved payment method. Payments are due on the 1st of each month.',
      confidence: 0.95,
      related_questions: ['Can I set up auto-pay?', 'What payment methods are accepted?']
    },
    {
      question: 'How do I submit a maintenance request?',
      answer: 'Go to the Maintenance tab and click "New Request". Fill out the form with details and photos of the issue.',
      confidence: 0.92,
      related_questions: ['How long do repairs take?', 'Can I track my maintenance request?']
    }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: selectedConversation.id,
      sender_id: 'tenant-1',
      sender_name: 'You',
      sender_role: 'tenant',
      content: messageInput,
      message_type: 'text',
      read_by: ['tenant-1'],
      read_receipts: [],
      scheduled_for: scheduleDate || undefined,
      created_at: new Date(),
      updated_at: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
    setScheduleDate(null);

    if (scheduleDate) {
      toast({
        title: 'Message Scheduled',
        description: `Your message will be sent on ${scheduleDate.toLocaleString()}`
      });
    }
  };

  const sendQuickReply = (reply: QuickReply) => {
    setMessageInput(reply.text);
    setShowQuickReplies(false);
  };

  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast({
        title: 'Recording Started',
        description: 'Speak your message...'
      });
    } else {
      toast({
        title: 'Recording Stopped',
        description: 'Voice message ready to send'
      });
    }
  };

  const getMessageStatusIcon = (message: Message) => {
    if (message.sender_id !== 'tenant-1') return null;
    
    if (message.read_receipts.length > 0) {
      return <CheckCheck className="h-4 w-4 text-blue-600" />;
    } else if (message.read_by.length > 1) {
      return <Check className="h-4 w-4 text-gray-400" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const conversationMessages = messages.filter(
    msg => msg.conversation_id === selectedConversation?.id
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Messages</span>
            <Button size="sm" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[650px]">
            <div className="space-y-1 p-4">
              {filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {conv.type === 'group' ? <Users className="h-4 w-4" /> : conv.title?.[0] || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{conv.title}</p>
                        <p className="text-sm text-gray-600">
                          {conv.participants.length} participants
                        </p>
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge className="bg-blue-600">{conv.unread_count}</Badge>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="text-sm text-gray-600 truncate">
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="lg:col-span-2">
        {selectedConversation ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>{selectedConversation.title?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedConversation.title}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {selectedConversation.participants.map(p => p.user_name).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAIAssistant(!showAIAssistant)}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AI Help
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[650px]">
              {/* AI Assistant Panel */}
              {showAIAssistant && (
                <div className="bg-blue-50 border-b p-4">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Bot className="h-5 w-5 mr-2" />
                    AI Assistant - Frequently Asked Questions
                  </h4>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border">
                        <p className="font-medium text-sm mb-1">{suggestion.question}</p>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.answer}</p>
                        <div className="flex flex-wrap gap-2">
                          {suggestion.related_questions.map((q, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {q}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {conversationMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === 'tenant-1' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender_id === 'tenant-1'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.sender_id !== 'tenant-1' && (
                          <p className="text-xs font-semibold mb-1">{message.sender_name}</p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-end space-x-2 mt-2">
                          <span className="text-xs opacity-75">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {getMessageStatusIcon(message)}
                        </div>
                        {message.read_receipts.length > 0 && message.sender_id === 'tenant-1' && (
                          <p className="text-xs opacity-75 mt-1">
                            Read by {message.read_receipts.map(r => r.user_name).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Replies */}
              {showQuickReplies && (
                <div className="border-t p-3 bg-gray-50">
                  <p className="text-sm font-semibold mb-2">Quick Replies</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map(reply => (
                      <Button
                        key={reply.id}
                        size="sm"
                        variant="outline"
                        onClick={() => sendQuickReply(reply)}
                      >
                        {reply.text}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="border-t p-4">
                {scheduleDate && (
                  <div className="mb-2 p-2 bg-blue-50 rounded flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Scheduled for: {scheduleDate.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setScheduleDate(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={toggleVoiceRecording}
                        className={isRecording ? 'text-red-600' : ''}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button onClick={sendMessage} disabled={!messageInput.trim()} className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}