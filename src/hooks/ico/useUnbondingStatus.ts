import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import { stripAccountHashPrefix } from '@/lib/blockchain/accountUtils';

export interface UnbondingHistoryEntry {
  amount: number;
  eventType: string;
  timestamp: string;
  transactionHash: string;
}

export interface UnbondingStatus {
  history: UnbondingHistoryEntry[];
  isWithdrawable: boolean;
  timeRemainingMs: number;
  unbondingAmount: number;
  unbondingEndsAt: number;
}

async function fetchUnbondingStatus(accountHash: string): Promise<UnbondingStatus | null> {
  const hex = stripAccountHashPrefix(accountHash);
  return backendClient.get<UnbondingStatus | null>(`/api/v1/staking/${hex}/unbonding`);
}

export function useUnbondingStatus(accountHash: string | null | undefined) {
  return useQuery({
    queryKey: ['unbonding-status', accountHash],
    queryFn: () => fetchUnbondingStatus(accountHash!),
    enabled: !!accountHash,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}
