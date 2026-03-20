import { useQuery } from '@tanstack/react-query';
import { ICO_CONFIG } from '@/constants/ico';

const BIG_TOKEN_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '');
const ICO_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.icoPackageHash.replace(/^hash-/, '').toLowerCase();

const STALE_TIME = 30 * 60 * 1000; // 30 minutes

export interface FTTokenAction {
  deploy_hash: string;
  block_height: number;
  timestamp: string;
  amount: string;
  contract_package_hash: string;
  from_hash: string | null;
  from_type: number | null; // 0 = account, 1 = contract package
  to_hash: string | null;
  to_type: number | null;
  ft_action_type_id: number;
  transform_idx: number;
}

interface FTTokenActionsResponse {
  item_count: number;
  page_count: number;
  data: FTTokenAction[];
}

async function fetchBigTokenActions(page: number, pageSize: number): Promise<FTTokenActionsResponse> {
  const url = `/api/cspr-cloud/contract-packages/${BIG_TOKEN_PACKAGE_HASH}/ft-token-actions?page=${page}&page_size=${pageSize}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`CSPR.cloud API error: ${res.status}`);
  }
  const data = await res.json();
  return data;
}

export function useContractDeploys(page = 1, pageSize = 10) {
  const query = useQuery({
    queryKey: ['big-token-actions', page, pageSize],
    queryFn: () => fetchBigTokenActions(page, pageSize),
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
