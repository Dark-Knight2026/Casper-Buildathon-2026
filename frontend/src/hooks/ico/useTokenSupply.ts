import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import type { TokenSupplyResponse } from '@/types/ico';

async function fetchTokenSupply(): Promise<TokenSupplyResponse> {
  return backendClient.get<TokenSupplyResponse>('/api/v1/vesting/token-supply');
}

export function useTokenSupply() {
  return useQuery({
    queryKey: ['vesting-token-supply'],
    queryFn: fetchTokenSupply,
    staleTime: 1000 * 60 * 10, // 10 min
  });
}
