export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'agent';
  content: string;
  timestamp: Date;
  read: boolean;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
}

export interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  userId: string;
  userName: string;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsultationRequest {
  id: string;
  agentId: string;
  agentName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  preferredDate: Date;
  preferredTime: string;
  propertyType?: string;
  budget?: string;
  location?: string;
  message: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
}

export interface PropertyInquiry {
  id: string;
  agentId: string;
  agentName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  propertyType: string;
  propertyAddress?: string;
  budget: string;
  timeline: string;
  financing: string;
  message: string;
  status: 'new' | 'in_progress' | 'closed';
  createdAt: Date;
}