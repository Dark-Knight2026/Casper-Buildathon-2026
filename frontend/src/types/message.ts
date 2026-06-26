/**
 * Message and Conversation Type Definitions
 * For the Communication Center feature
 */

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'landlord' | 'tenant';
  content: string;
  messageType: 'text' | 'file' | 'system';
  
  // Attachments
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
  
  // Status
  isRead: boolean;
  readAt?: Date;
  readBy: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Populated fields
  sender?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Conversation {
  id: string;
  landlordId: string;
  tenantId: string;
  propertyId?: string;
  leaseId?: string;
  maintenanceRequestId?: string;
  
  status: 'active' | 'archived' | 'closed';
  
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  
  landlordUnreadCount: number;
  tenantUnreadCount: number;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Populated fields
  landlord?: ConversationParticipant;
  tenant?: ConversationParticipant;
  property?: {
    id: string;
    address: string;
  };
}

export interface ConversationParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: 'landlord' | 'tenant';
}

export interface ConversationWithParticipants extends Conversation {
  otherParticipant: ConversationParticipant;
  unreadCount: number;
}

export interface SendMessageData {
  conversationId: string;
  content: string;
  attachments?: File[];
}

export interface CreateConversationData {
  landlordId: string;
  tenantId: string;
  propertyId?: string;
  leaseId?: string;
  maintenanceRequestId?: string;
  initialMessage?: string;
}

export interface ConversationFilters {
  status?: 'active' | 'archived' | 'closed';
  propertyId?: string;
  unreadOnly?: boolean;
  search?: string;
}

export interface MessagePaginationOptions {
  limit: number;
  offset: number;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  total: number;
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface MessageSearchResult {
  message: Message;
  conversation: Conversation;
  matchedText: string;
}