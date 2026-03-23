import { useQuery } from '@tanstack/react-query';
import { backendClient } from '@/lib/api-client';
import { stripAccountHashPrefix } from '@/lib/blockchain/accountUtils';
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
  type?: string,
  fromType?: number,
  contractPackageHash?: string,
): Promise<AccountTransactionsResponse> {
  const hex = stripAccountHashPrefix(address);
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (type) params.set('type', type);
  if (fromType !== undefined) params.set('from_type', String(fromType));
  if (contractPackageHash) params.set('contract_package_hash', contractPackageHash);
  return backendClient.get<AccountTransactionsResponse>(
    `/api/v1/transactions/account/${hex}?${params.toString()}`,
  );
}

export function useAccountTransactions(
  address: string | null | undefined,
  page = 1,
  pageSize = 8,
  type?: string,
  fromType?: number,
  contractPackageHash?: string,
) {
  const query = useQuery({
    queryKey: ['account-transactions', address, page, pageSize, type, fromType, contractPackageHash],
    queryFn: () => fetchAccountTransactions(address!, page, pageSize, type, fromType, contractPackageHash),
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
