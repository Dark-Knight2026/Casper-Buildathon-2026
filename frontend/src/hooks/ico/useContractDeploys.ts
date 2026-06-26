import { useQuery } from '@tanstack/react-query';
import { ICO_CONFIG } from '@/constants/ico';
import type { FTTokenAction, FTTokenActionsResponse } from '@/types/csprCloud';

const BIG_TOKEN_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '');
const ICO_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.icoPackageHash.replace(/^hash-/, '').toLowerCase();

const STALE_TIME = 30 * 60 * 1000; // 30 minutes

async function fetchBigTokenActions(page: number, pageSize: number, querySignal?: AbortSignal): Promise<FTTokenActionsResponse> {
  const url = `/api/cspr-cloud/contract-packages/${BIG_TOKEN_PACKAGE_HASH}/ft-token-actions?page=${page}&page_size=${pageSize}`;

  const timeout = AbortSignal.timeout(15_000);
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: querySignal
      ? typeof AbortSignal.any === 'function'
        ? AbortSignal.any([querySignal, timeout])
        : timeout
      : timeout,
  });

  if (!res.ok) {
    throw new Error(`CSPR.cloud API error: ${res.status}`);
  }
  const data = await res.json();
  return data;
}

export function useContractDeploys(page = 1, pageSize = 10) {
  const query = useQuery({
    queryKey: ['big-token-actions', page, pageSize],
    queryFn: ({ signal }) => fetchBigTokenActions(page, pageSize, signal),
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
    enabled: !!BIG_TOKEN_PACKAGE_HASH,
  });

  return {
    actions: query.data?.data ?? [],
    totalPages: query.data?.page_count ?? 0,
    totalItems: query.data?.item_count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Check if an ft-token-action originates from the ICO contract.
 */
export function isICOPurchase(action: FTTokenAction): boolean {
  return action.from_type === 1 && action.from_hash?.toLowerCase() === ICO_PACKAGE_HASH;
}
