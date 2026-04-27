import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import { stripAccountHashPrefix } from '@/lib/blockchain/accountUtils';
import type { EarningsPeriod, StakingEarningsResponse } from '@/types/ico';

async function fetchStakingEarnings(
  accountHash: string,
  period: EarningsPeriod,
): Promise<StakingEarningsResponse> {
  const hex = stripAccountHashPrefix(accountHash);
  return backendClient.get<StakingEarningsResponse>(
    `/api/v1/staking/${hex}/earnings?period=${period}`,
  );
}

export function useStakingEarnings(
  accountHash: string | null | undefined,
  period: EarningsPeriod = '6m',
) {
  return useQuery({
    queryKey: ['staking-earnings', accountHash, period],
    queryFn: () => fetchStakingEarnings(accountHash!, period),
    enabled: !!accountHash,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
