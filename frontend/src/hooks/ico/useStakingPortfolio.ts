import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import { stripAccountHashPrefix } from '@/lib/blockchain/accountUtils';
import type { StakingPortfolioResponse } from '@/types/ico';

async function fetchStakingPortfolio(accountHash: string): Promise<StakingPortfolioResponse> {
  const hex = stripAccountHashPrefix(accountHash);
  return backendClient.get<StakingPortfolioResponse>(`/api/v1/staking/${hex}/portfolio`);
}

export function useStakingPortfolio(accountHash: string | null | undefined) {
  return useQuery({
    queryKey: ['staking-portfolio', accountHash],
    queryFn: () => fetchStakingPortfolio(accountHash!),
    enabled: !!accountHash,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
