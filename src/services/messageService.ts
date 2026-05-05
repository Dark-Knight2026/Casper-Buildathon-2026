// TODO: replace mock implementation with real Supabase calls when backend is ready
import type {
  Message,
  SendMessageData,
  MessagePaginationOptions,
  MessagesResponse,
  MessageSearchResult,
} from '@/types/message';

const MOCK_USER_ID = 'mock-tenant-1';

// In-memory message store keyed by conversationId
const mockMessages: Record<string, Message[]> = {
  'conv-1': [
    msg('m1', 'conv-1', MOCK_USER_ID, 'tenant', 'Hi John, I wanted to ask about the lease renewal offer.', Date.now() - 1000 * 60 * 65),
    msg('m2', 'conv-1', 'mock-landlord-1', 'landlord', 'Hi! Sure, the offer has been sent to your email. The new rent would be $1,575/month for another 12 months.', Date.now() - 1000 * 60 * 60),
    msg('m3', 'conv-1', MOCK_USER_ID, 'tenant', 'That sounds reasonable. Can we discuss the pet policy as well?', Date.now() - 1000 * 60 * 30),
    msg('m4', 'conv-1', 'mock-landlord-1', 'landlord', 'Of course! The current no-pets clause can be updated with an additional deposit.', Date.now() - 1000 * 60 * 5, false),
  ],
  'conv-2': [
    msg('m5', 'conv-2', 'mock-vendor-1', 'tenant', 'We scheduled the AC maintenance for Thursday at 10 AM. Will you be home?', Date.now() - 1000 * 60 * 60 * 24),
    msg('m6', 'conv-2', MOCK_USER_ID, 'tenant', "Yes, I'll be home. Please ring the bell when you arrive.", Date.now() - 1000 * 60 * 60 * 23),
  ],
  'conv-3': [
    msg('m7', 'conv-3', 'mock-vendor-2', 'tenant', 'The plumbing repair is complete. The leak has been fixed.', Date.now() - 1000 * 60 * 60 * 72),
    msg('m8', 'conv-3', MOCK_USER_ID, 'tenant', 'Thank you! Everything looks great.', Date.now() - 1000 * 60 * 60 * 70),
  ],
};

// No-op channel mock
const mockChannel = { unsubscribe: () => {} };

class MessageService {
  async sendMessage(data: SendMessageData): Promise<Message> {
    await delay(150);
    const newMsg = msg(
      `m-${Date.now()}`,
      data.conversationId,
      MOCK_USER_ID,
      'tenant',
      data.content,
      Date.now()
    );
    if (!mockMessages[data.conversationId]) {
      mockMessages[data.conversationId] = [];
    }
    mockMessages[data.conversationId].push(newMsg);
    return newMsg;
  }

  async getMessages(
    conversationId: string,
    options: MessagePaginationOptions
  ): Promise<MessagesResponse> {
    await delay(100);
    const all = mockMessages[conversationId] ?? [];
    const { limit, offset } = options;
    const slice = all.slice(offset, offset + limit);
    return { messages: slice, hasMore: offset + limit < all.length, total: all.length };
  }

  async markAsRead(_messageId: string): Promise<void> {
    // mock — no-op
  }

  async markConversationAsRead(_conversationId: string): Promise<void> {
    // mock — no-op
  }

  async deleteMessage(messageId: string): Promise<void> {
    for (const msgs of Object.values(mockMessages)) {
      const idx = msgs.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        msgs[idx] = { ...msgs[idx], deletedAt: new Date() };
        break;
      }
    }
  }

  async searchMessages(query: string, conversationId?: string): Promise<MessageSearchResult[]> {
    const results: MessageSearchResult[] = [];
    const target = query.toLowerCase();
    const sources = conversationId
      ? { [conversationId]: mockMessages[conversationId] ?? [] }
      : mockMessages;

    for (const [, msgs] of Object.entries(sources)) {
      for (const m of msgs) {
        if (m.content.toLowerCase().includes(target)) {
          results.push({ message: m, conversation: {} as never, matchedText: extractMatch(m.content, query) });
        }
      }
    }
    return results;
  }

  subscribeToMessages(
    _conversationId: string,
    _callback: (message: Message) => void
  ) {
    return mockChannel;
  }

  subscribeToMessageUpdates(
    _conversationId: string,
    _callback: (message: Message) => void
  ) {
    return mockChannel;
  }

  async broadcastTyping(_conversationId: string, _isTyping: boolean): Promise<void> {
    // mock — no-op
  }

  subscribeToTyping(
    _conversationId: string,
    _callback: (userId: string, isTyping: boolean) => void
  ) {
    return mockChannel;
  }
}

// Helpers

function msg(
  id: string,
  conversationId: string,
  senderId: string,
  senderRole: 'landlord' | 'tenant',
  content: string,
  timestamp: number,
  isRead = true
): Message {
  return {
    id,
    conversationId,
    senderId,
    senderRole,
    content,
    messageType: 'text',
    isRead,
    readBy: isRead ? [senderId] : [],
    createdAt: new Date(timestamp),
    updatedAt: new Date(timestamp),
  };
}

function extractMatch(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.substring(0, 100);
  const start = Math.max(0, idx - 50);
  const end = Math.min(content.length, idx + query.length + 50);
  return `...${content.substring(start, end)}...`;
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export const messageService = new MessageService();
