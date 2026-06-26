import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Message, Conversation, ConsultationRequest, PropertyInquiry } from '@/types/messaging';

interface MessagingContextType {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  consultationRequests: ConsultationRequest[];
  propertyInquiries: PropertyInquiry[];
  unreadCount: number;
  sendMessage: (conversationId: string, content: string, attachments?: File[]) => Promise<void>;
  createConversation: (agentId: string, agentName: string, initialMessage?: string) => Promise<string>;
  markAsRead: (conversationId: string) => void;
  getConversationMessages: (conversationId: string) => Message[];
  scheduleConsultation: (request: Omit<ConsultationRequest, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  submitPropertyInquiry: (inquiry: Omit<PropertyInquiry, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  updateConsultationStatus: (id: string, status: ConsultationRequest['status']) => void;
  deleteConversation: (conversationId: string) => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [consultationRequests, setConsultationRequests] = useState<ConsultationRequest[]>([]);
  const [propertyInquiries, setPropertyInquiries] = useState<PropertyInquiry[]>([]);

  // Load from localStorage
  useEffect(() => {
    if (user) {
      const savedConversations = localStorage.getItem(`conversations_${user.id}`);
      const savedMessages = localStorage.getItem(`messages_${user.id}`);
      const savedConsultations = localStorage.getItem(`consultations_${user.id}`);
      const savedInquiries = localStorage.getItem(`inquiries_${user.id}`);

      if (savedConversations) {
        const parsed: Conversation[] = JSON.parse(savedConversations);
        setConversations(parsed.map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })));
      }

      if (savedMessages) {
        const parsed: Record<string, Message[]> = JSON.parse(savedMessages);
        const messagesWithDates: Record<string, Message[]> = {};
        Object.keys(parsed).forEach(key => {
          messagesWithDates[key] = parsed[key].map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        });
        setMessages(messagesWithDates);
      }

      if (savedConsultations) {
        const parsed: ConsultationRequest[] = JSON.parse(savedConsultations);
        setConsultationRequests(parsed.map((c) => ({
          ...c,
          preferredDate: new Date(c.preferredDate),
          createdAt: new Date(c.createdAt),
        })));
      }

      if (savedInquiries) {
        const parsed: PropertyInquiry[] = JSON.parse(savedInquiries);
        setPropertyInquiries(parsed.map((i) => ({
          ...i,
          createdAt: new Date(i.createdAt),
        })));
      }
    } else {
      // Clear state on logout
      setConversations([]);
      setMessages({});
      setConsultationRequests([]);
      setPropertyInquiries([]);
    }
  }, [user]);

  // Save to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(`conversations_${user.id}`, JSON.stringify(conversations));
      localStorage.setItem(`messages_${user.id}`, JSON.stringify(messages));
      localStorage.setItem(`consultations_${user.id}`, JSON.stringify(consultationRequests));
      localStorage.setItem(`inquiries_${user.id}`, JSON.stringify(propertyInquiries));
    }
  }, [conversations, messages, consultationRequests, propertyInquiries, user]);

  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const createConversation = async (agentId: string, agentName: string, initialMessage?: string): Promise<string> => {
    if (!user) throw new Error('User must be logged in');

    // Check if conversation already exists
    const existing = conversations.find(c => c.agentId === agentId && c.userId === user.id);
    if (existing) {
      if (initialMessage) {
        await sendMessage(existing.id, initialMessage);
      }
      return existing.id;
    }

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConversation: Conversation = {
      id: conversationId,
      agentId,
      agentName,
      userId: user.id,
      userName: user.name,
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setConversations(prev => [newConversation, ...prev]);
    setMessages(prev => ({ ...prev, [conversationId]: [] }));

    if (initialMessage) {
      await sendMessage(conversationId, initialMessage);
    }

    return conversationId;
  };

  const sendMessage = async (conversationId: string, content: string, attachments?: File[]): Promise<void> => {
    if (!user) throw new Error('User must be logged in');

    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      senderType: 'user',
      content,
      timestamp: new Date(),
      read: true,
      attachments: attachments?.map(file => ({
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
      })),
    };

    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), message],
    }));

    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: message, updatedAt: new Date() }
          : c
      )
    );

    // Simulate agent response after 2-5 seconds
    setTimeout(() => {
      const agentResponse: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId: conversation.agentId,
        senderName: conversation.agentName,
        senderType: 'agent',
        content: `Thank you for your message! I'll get back to you shortly regarding "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}". In the meantime, feel free to ask any questions you may have.`,
        timestamp: new Date(),
        read: false,
      };

      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), agentResponse],
      }));

      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId
            ? { ...c, lastMessage: agentResponse, unreadCount: c.unreadCount + 1, updatedAt: new Date() }
            : c
        )
      );
    }, Math.random() * 3000 + 2000);
  };

  const markAsRead = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );

    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(m => ({ ...m, read: true })),
    }));
  };

  const getConversationMessages = (conversationId: string): Message[] => {
    return messages[conversationId] || [];
  };

  const scheduleConsultation = async (request: Omit<ConsultationRequest, 'id' | 'status' | 'createdAt'>): Promise<void> => {
    const newRequest: ConsultationRequest = {
      ...request,
      id: `consult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date(),
    };

    setConsultationRequests(prev => [newRequest, ...prev]);

    // Create a conversation if it doesn't exist
    await createConversation(
      request.agentId,
      request.agentName,
      `I've scheduled a consultation request for ${request.preferredDate.toLocaleDateString()} at ${request.preferredTime}. ${request.message}`
    );
  };

  const submitPropertyInquiry = async (inquiry: Omit<PropertyInquiry, 'id' | 'status' | 'createdAt'>): Promise<void> => {
    const newInquiry: PropertyInquiry = {
      ...inquiry,
      id: `inquiry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'new',
      createdAt: new Date(),
    };

    setPropertyInquiries(prev => [newInquiry, ...prev]);

    // Create a conversation if it doesn't exist
    await createConversation(
      inquiry.agentId,
      inquiry.agentName,
      `I'm interested in ${inquiry.propertyType} properties. Budget: ${inquiry.budget}, Timeline: ${inquiry.timeline}. ${inquiry.message}`
    );
  };

  const updateConsultationStatus = (id: string, status: ConsultationRequest['status']) => {
    setConsultationRequests(prev =>
      prev.map(req => (req.id === id ? { ...req, status } : req))
    );
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    setMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[conversationId];
      return newMessages;
    });
  };

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        messages,
        consultationRequests,
        propertyInquiries,
        unreadCount,
        sendMessage,
        createConversation,
        markAsRead,
        getConversationMessages,
        scheduleConsultation,
        submitPropertyInquiry,
        updateConsultationStatus,
        deleteConversation,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}