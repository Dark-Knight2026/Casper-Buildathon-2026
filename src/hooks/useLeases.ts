import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaseApi } from '@/lib/api/lease';
import { LeaseAgreement, LeaseFormData } from '@/types/lease';

export const LEASE_KEYS = {
  all: ['leases'] as const,
  lists: () => [...LEASE_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...LEASE_KEYS.lists(), { filters }] as const,
  details: () => [...LEASE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...LEASE_KEYS.details(), id] as const,
};

export function useLeases(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: LEASE_KEYS.list(filters || {}),
    queryFn: () => leaseApi.getLeases(filters),
  });
}

export function useLease(id: string) {
  return useQuery({
    queryKey: LEASE_KEYS.detail(id),
    queryFn: () => leaseApi.getLease(id),
    enabled: !!id,
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, userId }: { data: LeaseFormData; userId: string }) =>
      leaseApi.createLease(data, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEASE_KEYS.lists() });
    },
  });
}

export function useUpdateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
      userId,
    }: {
      id: string;
      updates: Partial<LeaseAgreement>;
      userId: string;
    }) => leaseApi.updateLease(id, updates, userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEASE_KEYS.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: LEASE_KEYS.detail(data.id) });
      }
    },
  });
}