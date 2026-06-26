import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import { stripAccountHashPrefix } from '@/lib/blockchain/accountUtils';
import type { VestingSchedulesResponse } from '@/types/ico';

async function fetchVestingSchedules(accountHash: string): Promise<VestingSchedulesResponse> {
  const hex = stripAccountHashPrefix(accountHash);
  return backendClient.get<VestingSchedulesResponse>(`/api/v1/vesting/schedules?account=${hex}`);
}

export function useVestingSchedules(accountHash: string | null | undefined) {
  return useQuery({
    queryKey: ['vesting-schedules', accountHash],
    queryFn: () => fetchVestingSchedules(accountHash!),
    enabled: !!accountHash,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
