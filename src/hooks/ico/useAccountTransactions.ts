import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import type { TokenTransaction } from './useTokenTransactions';

interface AccountTransactionsResponse {
  item_count: number;
  page_count: number;
  data: TokenTransaction[];
}

async function fetchAccountTransactions(
  address: string,
  page: number,
  pageSize: number,
): Promise<AccountTransactionsResponse> {
  const hex = address.startsWith('account-hash-') ? address.slice('account-hash-'.length) : address;
  return backendClient.get<AccountTransactionsResponse>(
    `/api/v1/transactions/account/${hex}?page=${page}&page_size=${pageSize}`,
  );
}

export function useAccountTransactions(
  address: string | null | undefined,
  page = 1,
  pageSize = 10,
) {
  const query = useQuery({
    queryKey: ['account-transactions', address, page, pageSize],
    queryFn: () => fetchAccountTransactions(address!, page, pageSize),
    enabled: !!address,
    staleTime: 1000 * 60 * 2,
  });

  return {
    transactions: query.data?.data ?? [],
    totalPages: query.data?.page_count ?? 0,
    totalItems: query.data?.item_count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
