import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import type { StakingInfoResponse } from '@/types/ico';

async function fetchStakingInfo(accountHash: string): Promise<StakingInfoResponse | null> {
  const hex = accountHash.startsWith('account-hash-')
    ? accountHash.slice('account-hash-'.length)
    : accountHash;
  return backendClient.get<StakingInfoResponse | null>(`/api/v1/staking/${hex}`);
}

export function useStakingInfo(accountHash: string | null | undefined) {
  return useQuery({
    queryKey: ['staking-info', accountHash],
    queryFn: () => fetchStakingInfo(accountHash!),
    enabled: !!accountHash,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
