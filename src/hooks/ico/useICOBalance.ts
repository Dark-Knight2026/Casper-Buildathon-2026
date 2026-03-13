import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import type { IcoBalanceResponse } from '@/types/ico';

async function fetchICOBalance(address: string): Promise<IcoBalanceResponse> {
  // Backend expects 64 hex chars without "account-hash-" prefix
  const hex = address.startsWith('account-hash-') ? address.slice('account-hash-'.length) : address;
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
