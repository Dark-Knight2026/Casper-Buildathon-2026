import { supabase } from '@/lib/supabase/client';
import type {
  Message,
  SendMessageData,
  MessagePaginationOptions,
  MessagesResponse,
  MessageSearchResult,
} from '@/types/message';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  message_type: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  attachment_size?: number;
  is_read: boolean;
  read_at?: string;
  read_by: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  conversation?: {
    id: string;
    landlord_id: string;
    tenant_id: string;
    landlord?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
    tenant?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

class MessageService {
  /**
   * Send a new message
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const messageData = {
        conversation_id: data.conversationId,
        sender_id: user.id,
        sender_role: profile?.role || 'tenant',
        content: data.content,
        message_type: data.attachments && data.attachments.length > 0 ? 'file' : 'text',
        is_read: false,
        read_by: [],
      };

      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users!sender_id(id, first_name, last_name, email, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: data.content.substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.conversationId);

      // Increment unread count for the other participant
      await this.incrementUnreadCount(data.conversationId, user.id);

      return this.formatMessage(message as MessageRow);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    options: MessagePaginationOptions
  ): Promise<MessagesResponse> {
    try {
      const { limit, offset } = options;

      const { data: messages, error, count } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(id, first_name, last_name, email, avatar_url)
        `, { count: 'exact' })
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        messages: (messages || []).map((m) => this.formatMessage(m as MessageRow)).reverse(),
        hasMore: (count || 0) > offset + limit,
        total: count || 0,
      };
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: message } = await supabase
        .from('messages')
        .select('read_by, conversation_id, sender_id')
        .eq('id', messageId)
        .single();

      if (!message || message.sender_id === user.id) return;

      const readBy = message.read_by || [];
      if (readBy.includes(user.id)) return;

      await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: [...readBy, user.id],
        })
        .eq('id', messageId);

      // Decrement unread count
      await this.decrementUnreadCount(message.conversation_id, user.id);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get unread messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id, read_by')
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (!messages || messages.length === 0) return;

      // Update all unread messages
      for (const message of messages) {
        const readBy = message.read_by || [];
        if (!readBy.includes(user.id)) {
          await supabase
            .from('messages')
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
              read_by: [...readBy, user.id],
            })
            .eq('id', message.id);
        }
      }

      // Reset unread count
      await this.resetUnreadCount(conversationId, user.id);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    query: string,
    conversationId?: string
  ): Promise<MessageSearchResult[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let queryBuilder = supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(id, first_name, last_name, email, avatar_url),
          conversation:conversations(
            *,
            landlord:users!landlord_id(id, first_name, last_name, email),
            tenant:users!tenant_id(id, first_name, last_name, email)
          )
        `)
        .textSearch('content', query)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (conversationId) {
        queryBuilder = queryBuilder.eq('conversation_id', conversationId);
      }

      const { data: messages, error } = await queryBuilder;

      if (error) throw error;

      return (messages || []).map((msg) => ({
        message: this.formatMessage(msg as MessageRow),
        conversation: msg.conversation,
        matchedText: this.extractMatchedText(msg.content, query),
      }));
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch full message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!sender_id(id, first_name, last_name, email, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(this.formatMessage(data as MessageRow));
          }
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to message updates (read receipts)
   */
  subscribeToMessageUpdates(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    return supabase
      .channel(`message-updates:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!sender_id(id, first_name, last_name, email, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(this.formatMessage(data as MessageRow));
          }
        }
      )
      .subscribe();
  }

  /**
   * Broadcast typing indicator
   */
  async broadcastTyping(conversationId: string, isTyping: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase.channel(`typing:${conversationId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, isTyping },
    });
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(
    conversationId: string,
    callback: (userId: string, isTyping: boolean) => void
  ) {
    return supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        callback(payload.payload.userId, payload.payload.isTyping);
      })
      .subscribe();
  }

  // Helper methods

  private async incrementUnreadCount(conversationId: string, senderId: string): Promise<void> {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('landlord_id, tenant_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    const field = conversation.landlord_id === senderId
      ? 'tenant_unread_count'
      : 'landlord_unread_count';

    await supabase.rpc('increment_unread_count', {
      conversation_id: conversationId,
      field_name: field,
    });
  }

  private async decrementUnreadCount(conversationId: string, userId: string): Promise<void> {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('landlord_id, tenant_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    const field = conversation.landlord_id === userId
      ? 'landlord_unread_count'
      : 'tenant_unread_count';

    await supabase.rpc('decrement_unread_count', {
      conversation_id: conversationId,
      field_name: field,
    });
  }

  private async resetUnreadCount(conversationId: string, userId: string): Promise<void> {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('landlord_id, tenant_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) return;

    const field = conversation.landlord_id === userId
      ? 'landlord_unread_count'
      : 'tenant_unread_count';

    await supabase
      .from('conversations')
      .update({ [field]: 0 })
      .eq('id', conversationId);
  }

  private formatMessage(data: MessageRow): Message {
    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      senderRole: data.sender_role as 'landlord' | 'tenant',
      content: data.content,
      messageType: data.message_type as 'text' | 'file' | 'system',
      attachmentUrl: data.attachment_url,
      attachmentName: data.attachment_name,
      attachmentType: data.attachment_type,
      attachmentSize: data.attachment_size,
      isRead: data.is_read,
      readAt: data.read_at ? new Date(data.read_at) : undefined,
      readBy: data.read_by || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
      sender: data.sender ? {
        id: data.sender.id,
        name: `${data.sender.first_name} ${data.sender.last_name}`,
        email: data.sender.email,
        avatarUrl: data.sender.avatar_url,
      } : undefined,
    };
  }

  private extractMatchedText(content: string, query: string): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content.substring(0, 100);

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    return '...' + content.substring(start, end) + '...';
  }
}

export const messageService = new MessageService();