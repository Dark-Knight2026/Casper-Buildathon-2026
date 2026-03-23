import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import { stripAccountHashPrefix } from '@/lib/blockchain/accountUtils';
import type { IcoBalanceResponse } from '@/types/ico';

async function fetchICOBalance(address: string): Promise<IcoBalanceResponse> {
  const hex = stripAccountHashPrefix(address);
  return backendClient.get<IcoBalanceResponse>(`/api/v1/ico/balance/${hex}`);
}

export function useICOBalance(
  accountHash: string | null | undefined,
) {
  return useQuery({
    queryKey: ['ico-balance', accountHash],
    queryFn: () => fetchICOBalance(accountHash!),
    enabled: !!accountHash,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
