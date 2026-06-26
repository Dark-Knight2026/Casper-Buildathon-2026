import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import type { IcoProgressResponse } from '@/types/ico';

async function fetchICOProgress(): Promise<IcoProgressResponse> {
  return backendClient.get<IcoProgressResponse>('/api/v1/ico/progress');
}

const REFETCH_INTERVAL = 1000 * 60 * 5; // 5 min
const STALE_TIME = 1000 * 60; // 1 min

export function useICOProgress() {
  return useQuery({
    queryKey: ['ico-progress'],
    queryFn: fetchICOProgress,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });
}
