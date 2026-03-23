import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import { stripAccountHashPrefix } from '@/lib/blockchain/accountUtils';
import type { RewardsHistoryResponse } from '@/types/ico';

async function fetchRewardsHistory(
  accountHash: string,
  period: number,
): Promise<RewardsHistoryResponse> {
  const hex = stripAccountHashPrefix(accountHash);
  return backendClient.get<RewardsHistoryResponse>(
    `/api/v1/staking/${hex}/rewards-history?period=${period}`,
  );
}

export function useRewardsHistory(
  accountHash: string | null | undefined,
  period: number = 90,
) {
  return useQuery({
    queryKey: ['rewards-history', accountHash, period],
    queryFn: () => fetchRewardsHistory(accountHash!, period),
    enabled: !!accountHash,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
