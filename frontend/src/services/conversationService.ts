// TODO: replace mock implementation with real Supabase calls when backend is ready
import type {
  Conversation,
  ConversationWithParticipants,
  CreateConversationData,
  ConversationFilters,
} from '@/types/message';

const MOCK_USER_ID = 'mock-tenant-1';

// In-memory store — persists for the lifetime of the page session
let mockConversations: ConversationWithParticipants[] = [
  {
    id: 'conv-1',
    landlordId: 'mock-landlord-1',
    tenantId: MOCK_USER_ID,
    status: 'active',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
    lastMessagePreview: 'Of course! The current no-pets clause can be updated with an additional deposit.',
    landlordUnreadCount: 0,
    tenantUnreadCount: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5),
    property: { id: 'mock-prop-1', address: '123 Demo Street, New York, NY 10001' },
    otherParticipant: {
      id: 'mock-landlord-1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'landlord@demo.com',
      role: 'landlord',
    },
    unreadCount: 1,
  },
  {
    id: 'conv-2',
    landlordId: 'mock-landlord-1',
    tenantId: MOCK_USER_ID,
    status: 'active',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
    lastMessagePreview: 'Yes, I\'ll be home. Please ring the bell when you arrive.',
    landlordUnreadCount: 0,
    tenantUnreadCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 23),
    property: { id: 'mock-prop-1', address: '123 Demo Street, New York, NY 10001' },
    otherParticipant: {
      id: 'mock-vendor-1',
      firstName: 'CoolAir',
      lastName: 'Services',
      email: 'vendor@coolair.com',
      role: 'tenant', // vendor role maps to tenant in current type
    },
    unreadCount: 0,
  },
  {
    id: 'conv-3',
    landlordId: 'mock-landlord-1',
    tenantId: MOCK_USER_ID,
    status: 'archived',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 70),
    lastMessagePreview: 'Thank you! Everything looks great.',
    landlordUnreadCount: 0,
    tenantUnreadCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 70),
    property: { id: 'mock-prop-1', address: '123 Demo Street, New York, NY 10001' },
    otherParticipant: {
      id: 'mock-vendor-2',
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike@plumbing.com',
      role: 'tenant',
    },
    unreadCount: 0,
  },
];

// No-op channel mock — matches the Supabase RealtimeChannel interface used by callers
const mockChannel = { unsubscribe: () => {} };

class ConversationService {
  async getConversations(filters?: ConversationFilters): Promise<ConversationWithParticipants[]> {
    await delay(150);
    return mockConversations.filter((c) => {
      if (filters?.status && c.status !== filters.status) return false;
      if (filters?.propertyId && c.propertyId !== filters.propertyId) return false;
      if (filters?.unreadOnly && c.unreadCount === 0) return false;
      return true;
    });
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    await delay(100);
    const conv = mockConversations.find((c) => c.id === conversationId);
    if (!conv) throw new Error('Conversation not found');
    return conv;
  }

  async createConversation(data: CreateConversationData): Promise<Conversation> {
    await delay(200);
    const newConv: ConversationWithParticipants = {
      id: `conv-${Date.now()}`,
      landlordId: data.landlordId,
      tenantId: data.tenantId,
      propertyId: data.propertyId,
      leaseId: data.leaseId,
      maintenanceRequestId: data.maintenanceRequestId,
      status: 'active',
      landlordUnreadCount: 0,
      tenantUnreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      otherParticipant: {
        id: data.landlordId,
        firstName: 'New',
        lastName: 'Conversation',
        email: '',
        role: 'landlord',
      },
      unreadCount: 0,
    };
    mockConversations.unshift(newConv);
    return newConv;
  }

  async findOrCreateConversation(
    landlordId: string,
    tenantId: string,
    propertyId?: string
  ): Promise<Conversation> {
    const existing = mockConversations.find(
      (c) => c.landlordId === landlordId && c.tenantId === tenantId &&
             (!propertyId || c.propertyId === propertyId)
    );
    if (existing) return existing;
    return this.createConversation({ landlordId, tenantId, propertyId });
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation> {
    await delay(100);
    mockConversations = mockConversations.map((c) =>
      c.id === conversationId ? { ...c, ...updates, updatedAt: new Date() } : c
    );
    return mockConversations.find((c) => c.id === conversationId)!;
  }

  async archiveConversation(conversationId: string): Promise<void> {
    await this.updateConversation(conversationId, { status: 'archived' });
  }

  subscribeToConversations(_callback: (conversation: Conversation) => void) {
    return mockChannel;
  }
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export const conversationService = new ConversationService();
