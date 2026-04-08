import { useQuery } from '@tanstack/react-query';
import { ICO_CONFIG } from '@/constants/ico';
import { rawTokenToNumber } from '@/lib/tokenAmount';
import type { FTTokenAction, FTTokenActionsResponse } from '@/types/csprCloud';
import type { ICOTransaction } from '@/types/ico';

const BIG_TOKEN_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '');
const BIG_DECIMALS = ICO_CONFIG.TOKEN.decimals; // 18

async function fetchUserTokenActions(publicKeyHex: string, page: number, pageSize: number, signal?: AbortSignal): Promise<FTTokenActionsResponse> {
  const url = `/api/cspr-cloud/accounts/${publicKeyHex}/ft-token-actions?contract_package_hash=${BIG_TOKEN_PACKAGE_HASH}&page=${page}&page_size=${pageSize}&type=token_transfer&from_type=1`;

  const timeout = AbortSignal.timeout(15_000);
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  if (!res.ok) {
    throw new Error(`CSPR.Cloud API error: ${res.status}`);
  }

  return res.json();
}

function mapToICOTransaction(action: FTTokenAction): ICOTransaction {
  const tokensReceived = rawTokenToNumber(action.amount, BIG_DECIMALS);

  return {
    id: `${action.deploy_hash}-${action.transform_idx}`,
    type: 'purchase',
    tokensReceived,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'completed',
    timestamp: new Date(action.timestamp),
    txHash: action.deploy_hash,
  };
}

export function useUserTokenActions(publicKey: string | null | undefined, page = 1, pageSize = 10) {
  const query = useQuery<{ transactions: ICOTransaction[]; totalPages: number }, Error>({
    queryKey: ['user-token-actions', publicKey, page, pageSize],
    queryFn: async ({ signal }) => {
      const data = await fetchUserTokenActions(publicKey!, page, pageSize, signal);
      return {
        transactions: (data.data ?? []).map(mapToICOTransaction),
        totalPages: data.page_count ?? 1,
      };
    },
    enabled: !!publicKey,
    staleTime: 120_000,
    refetchOnWindowFocus: true, // intentional: user expects updated balance after switching tabs during a pending purchase
  });

  return {
    transactions: query.data?.transactions ?? [],
    totalPages: query.data?.totalPages ?? 1,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
