import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';

export interface TokenTransaction {
  deploy_hash: string;
  block_height: number | null;
  timestamp: string | null;
  amount: string | null;
  currency: string | null;
  contract_package_hash: string | null;
  from_hash: string | null;
  from_type: number | null;
  to_hash: string | null;
  to_type: number | null;
  ft_action_type_id: number;
  transform_idx: number | null;
}

interface TokenTransactionsResponse {
  item_count: number;
  page_count: number;
  data: TokenTransaction[];
}

async function fetchTokenTransactions(page: number, pageSize: number): Promise<TokenTransactionsResponse> {
  return backendClient.get<TokenTransactionsResponse>(
    `/api/v1/transactions/token/big?page=${page}&page_size=${pageSize}`,
  );
}

// This endpoint is public — no auth guard needed.
// An optional `enabled` prop is exposed so callers can pause fetching if needed.
export function useTokenTransactions(page = 1, pageSize = 10, enabled = true) {
  const query = useQuery({
    queryKey: ['token-transactions-big', page, pageSize],
    queryFn: () => fetchTokenTransactions(page, pageSize),
    staleTime: 1000 * 60 * 2,
    enabled,
  });

  return {
    transactions: query.data?.data ?? [],
    totalPages: query.data?.page_count ?? 0,
    totalItems: query.data?.item_count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
