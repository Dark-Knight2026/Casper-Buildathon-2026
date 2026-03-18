import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import type { ReleaseScheduleResponse } from '@/types/ico';

async function fetchReleaseSchedule(): Promise<ReleaseScheduleResponse> {
  return backendClient.get<ReleaseScheduleResponse>('/api/v1/vesting/release-schedule');
}

export function useReleaseSchedule() {
  return useQuery({
    queryKey: ['vesting-release-schedule'],
    queryFn: fetchReleaseSchedule,
    staleTime: 1000 * 60 * 10, // 10 min — глобальні дані змінюються рідко
  });
}
