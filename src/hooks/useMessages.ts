/**
 * React Query hooks for messaging with Supabase Realtime
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  property_id?: string;
  application_id?: string;
  content: string;
  attachments: string[];
  read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
  receiver?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  property_id?: string;
}

// Fetch messages between two users
export function useMessages(userId?: string, otherUserId?: string, propertyId?: string) {
  return useQuery({
    queryKey: ['messages', userId, otherUserId, propertyId],
    queryFn: async () => {
      if (!userId || !otherUserId) throw new Error('User IDs required');

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!sender_id (
            full_name,
            avatar_url
          ),
          receiver:user_profiles!receiver_id (
            full_name,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!userId && !!otherUserId,
  });
}

// Fetch user conversations
export function useConversations(userId?: string) {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:user_profiles!sender_id (
            full_name,
            avatar_url
          ),
          receiver:user_profiles!receiver_id (
            full_name,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationsMap = new Map<string, Conversation>();

      messages.forEach((message) => {
        const isReceiver = message.receiver_id === userId;
        const partnerId = isReceiver ? message.sender_id : message.receiver_id;
        const partnerName = isReceiver ? message.sender?.full_name : message.receiver?.full_name;
        const partnerAvatar = isReceiver ? message.sender?.avatar_url : message.receiver?.avatar_url;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            user_id: partnerId,
            user_name: partnerName || 'Unknown',
            user_avatar: partnerAvatar,
            last_message: message.content,
            last_message_at: message.created_at,
            unread_count: 0,
            property_id: message.property_id,
          });
        }

        // Count unread messages
        if (isReceiver && !message.read) {
          const conv = conversationsMap.get(partnerId)!;
          conv.unread_count++;
        }
      });

      return Array.from(conversationsMap.values());
    },
    enabled: !!userId,
  });
}

// Send message mutation
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      sender_id: string;
      receiver_id: string;
      content: string;
      property_id?: string;
      application_id?: string;
      attachments?: string[];
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Mark message as read
export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase
        .from('messages')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Mark all messages in conversation as read
export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, otherUserId }: { userId: string; otherUserId: string }) => {
      const { error } = await supabase
        .from('messages')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', userId)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Real-time message subscription hook
export function useRealtimeMessages(userId?: string, otherUserId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !otherUserId) return;

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel(`messages:${userId}:${otherUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId}))`,
          },
          (payload) => {
            // Invalidate queries to refetch messages
            queryClient.invalidateQueries({ queryKey: ['messages', userId, otherUserId] });
            queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, otherUserId, queryClient]);
}

// Real-time conversation updates hook
export function useRealtimeConversations(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      channel = supabase
        .channel(`conversations:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
          },
          (payload) => {
            // Invalidate conversations query
            queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, queryClient]);
}