/**
 * Real-time Maintenance Request Hook
 * Provides real-time updates for maintenance requests using Supabase Realtime
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { MaintenanceRequest } from '@/services/maintenanceService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export type UserType = 'tenant' | 'landlord' | 'vendor';

export interface UseMaintenanceRealtimeOptions {
  userId: string;
  userType: UserType;
  autoFetch?: boolean;
}

export interface UseMaintenanceRealtimeReturn {
  requests: MaintenanceRequest[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for real-time maintenance request updates
 */
export function useMaintenanceRealtime({
  userId,
  userType,
  autoFetch = true
}: UseMaintenanceRealtimeOptions): UseMaintenanceRealtimeReturn {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const filterColumn = 
        userType === 'tenant' ? 'tenant_id' :
        userType === 'landlord' ? 'landlord_id' : 'vendor_id';

      const { data, error: fetchError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          property:properties(title, address, city, state),
          tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
          landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone),
          vendor:users!maintenance_requests_vendor_id_fkey(full_name, email, phone, company)
        `)
        .eq(filterColumn, userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRequests(data as any || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch maintenance requests');
      setError(error);
      logger.error('Error fetching maintenance requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoFetch) return;

    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      // Initial fetch
      await fetchRequests();

      // Setup realtime subscription
      const filterColumn = 
        userType === 'tenant' ? 'tenant_id' :
        userType === 'landlord' ? 'landlord_id' : 'vendor_id';

      channel = supabase
        .channel(`maintenance_${userType}_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_requests',
            filter: `${filterColumn}=eq.${userId}`
          },
          async (payload) => {
            logger.info('Maintenance request update received:', payload);

            if (payload.eventType === 'INSERT') {
              // Fetch full request with relations
              const { data } = await supabase
                .from('maintenance_requests')
                .select(`
                  *,
                  property:properties(title, address, city, state),
                  tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
                  landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone),
                  vendor:users!maintenance_requests_vendor_id_fkey(full_name, email, phone, company)
                `)
                .eq('id', payload.new.id)
                .single();

              if (data) {
                setRequests((prev) => [data as any, ...prev]);
              }
            } else if (payload.eventType === 'UPDATE') {
              // Fetch updated request with relations
              const { data } = await supabase
                .from('maintenance_requests')
                .select(`
                  *,
                  property:properties(title, address, city, state),
                  tenant:users!maintenance_requests_tenant_id_fkey(full_name, email, phone),
                  landlord:users!maintenance_requests_landlord_id_fkey(full_name, email, phone),
                  vendor:users!maintenance_requests_vendor_id_fkey(full_name, email, phone, company)
                `)
                .eq('id', payload.new.id)
                .single();

              if (data) {
                setRequests((prev) =>
                  prev.map((req) =>
                    req.id === payload.new.id ? (data as any) : req
                  )
                );
              }
            } else if (payload.eventType === 'DELETE') {
              setRequests((prev) =>
                prev.filter((req) => req.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe((status) => {
          logger.info('Realtime subscription status:', status);
        });
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, userType, autoFetch]);

  return { 
    requests, 
    loading, 
    error,
    refetch: fetchRequests
  };
}

/**
 * Hook for real-time maintenance message updates
 */
export function useMaintenanceMessagesRealtime(requestId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      // Initial fetch
      const { data, error } = await supabase
        .from('maintenance_messages')
        .select(`
          *,
          sender:users(full_name)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);

      // Setup realtime subscription
      channel = supabase
        .channel(`maintenance_messages_${requestId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'maintenance_messages',
            filter: `request_id=eq.${requestId}`
          },
          async (payload) => {
            // Fetch full message with sender info
            const { data } = await supabase
              .from('maintenance_messages')
              .select(`
                *,
                sender:users(full_name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages((prev) => [...prev, data]);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [requestId]);

  return { messages, loading };
}