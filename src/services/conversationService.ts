import { supabase } from '@/lib/supabase/client';
import type {
  Conversation,
  ConversationWithParticipants,
  CreateConversationData,
  ConversationFilters,
} from '@/types/message';

interface ConversationRow {
  id: string;
  landlord_id: string;
  tenant_id: string;
  property_id?: string;
  lease_id?: string;
  maintenance_request_id?: string;
  status: string;
  last_message_at?: string;
  last_message_preview?: string;
  landlord_unread_count: number;
  tenant_unread_count: number;
  created_at: string;
  updated_at: string;
  landlord?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    role: string;
  };
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    role: string;
  };
  property?: {
    id: string;
    address: string;
  };
}

class ConversationService {
  /**
   * Get all conversations for the current user
   */
  async getConversations(filters?: ConversationFilters): Promise<ConversationWithParticipants[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('conversations')
        .select(`
          *,
          landlord:users!landlord_id(id, first_name, last_name, email, avatar_url, role),
          tenant:users!tenant_id(id, first_name, last_name, email, avatar_url, role),
          property:properties(id, address)
        `)
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.propertyId) {
        query = query.eq('property_id', filters.propertyId);
      }

      const { data: conversations, error } = await query;

      if (error) throw error;

      // Format conversations with other participant info
      return (conversations || []).map((conv) => {
        const isLandlord = conv.landlord_id === user.id;
        const otherParticipant = isLandlord ? conv.tenant : conv.landlord;
        const unreadCount = isLandlord ? conv.landlord_unread_count : conv.tenant_unread_count;

        return {
          ...this.formatConversation(conv as ConversationRow),
          otherParticipant: {
            id: otherParticipant.id,
            firstName: otherParticipant.first_name,
            lastName: otherParticipant.last_name,
            email: otherParticipant.email,
            avatarUrl: otherParticipant.avatar_url,
            role: otherParticipant.role as 'landlord' | 'tenant',
          },
          unreadCount,
        };
      }).filter((conv) => {
        if (filters?.unreadOnly) {
          return conv.unreadCount > 0;
        }
        return true;
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          landlord:users!landlord_id(id, first_name, last_name, email, avatar_url, role),
          tenant:users!tenant_id(id, first_name, last_name, email, avatar_url, role),
          property:properties(id, address)
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      return this.formatConversation(data as ConversationRow);
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    try {
      const conversationData = {
        landlord_id: data.landlordId,
        tenant_id: data.tenantId,
        property_id: data.propertyId,
        lease_id: data.leaseId,
        maintenance_request_id: data.maintenanceRequestId,
        status: 'active',
        landlord_unread_count: 0,
        tenant_unread_count: 0,
      };

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select(`
          *,
          landlord:users!landlord_id(id, first_name, last_name, email, avatar_url, role),
          tenant:users!tenant_id(id, first_name, last_name, email, avatar_url, role),
          property:properties(id, address)
        `)
        .single();

      if (error) throw error;

      return this.formatConversation(conversation as ConversationRow);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Find or create a conversation between two users
   */
  async findOrCreateConversation(
    landlordId: string,
    tenantId: string,
    propertyId?: string
  ): Promise<Conversation> {
    try {
      // Try to find existing conversation
      let query = supabase
        .from('conversations')
        .select(`
          *,
          landlord:users!landlord_id(id, first_name, last_name, email, avatar_url, role),
          tenant:users!tenant_id(id, first_name, last_name, email, avatar_url, role),
          property:properties(id, address)
        `)
        .eq('landlord_id', landlordId)
        .eq('tenant_id', tenantId);

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        return this.formatConversation(existing as ConversationRow);
      }

      // Create new conversation
      return await this.createConversation({
        landlordId,
        tenantId,
        propertyId,
      });
    } catch (error) {
      console.error('Error finding or creating conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .select(`
          *,
          landlord:users!landlord_id(id, first_name, last_name, email, avatar_url, role),
          tenant:users!tenant_id(id, first_name, last_name, email, avatar_url, role),
          property:properties(id, address)
        `)
        .single();

      if (error) throw error;

      return this.formatConversation(data as ConversationRow);
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    try {
      await this.updateConversation(conversationId, { status: 'archived' });
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversations(callback: (conversation: Conversation) => void) {
    const { data: { user } } = supabase.auth.getUser();
    
    return supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        async (payload) => {
          const conv = payload.new as ConversationRow;
          const currentUser = await user;
          
          // Only notify if user is part of the conversation
          if (currentUser && (conv.landlord_id === currentUser.id || conv.tenant_id === currentUser.id)) {
            const { data } = await supabase
              .from('conversations')
              .select(`
                *,
                landlord:users!landlord_id(id, first_name, last_name, email, avatar_url, role),
                tenant:users!tenant_id(id, first_name, last_name, email, avatar_url, role),
                property:properties(id, address)
              `)
              .eq('id', conv.id)
              .single();

            if (data) {
              callback(this.formatConversation(data as ConversationRow));
            }
          }
        }
      )
      .subscribe();
  }

  // Helper methods

  private formatConversation(data: ConversationRow): Conversation {
    return {
      id: data.id,
      landlordId: data.landlord_id,
      tenantId: data.tenant_id,
      propertyId: data.property_id,
      leaseId: data.lease_id,
      maintenanceRequestId: data.maintenance_request_id,
      status: data.status as 'active' | 'archived' | 'closed',
      lastMessageAt: data.last_message_at ? new Date(data.last_message_at) : undefined,
      lastMessagePreview: data.last_message_preview,
      landlordUnreadCount: data.landlord_unread_count,
      tenantUnreadCount: data.tenant_unread_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      landlord: data.landlord ? {
        id: data.landlord.id,
        firstName: data.landlord.first_name,
        lastName: data.landlord.last_name,
        email: data.landlord.email,
        avatarUrl: data.landlord.avatar_url,
        role: data.landlord.role as 'landlord' | 'tenant',
      } : undefined,
      tenant: data.tenant ? {
        id: data.tenant.id,
        firstName: data.tenant.first_name,
        lastName: data.tenant.last_name,
        email: data.tenant.email,
        avatarUrl: data.tenant.avatar_url,
        role: data.tenant.role as 'landlord' | 'tenant',
      } : undefined,
      property: data.property ? {
        id: data.property.id,
        address: data.property.address,
      } : undefined,
    };
  }
}

export const conversationService = new ConversationService();