import { useQuery } from '@tanstack/react-query';
import { ICO_CONFIG } from '@/constants/ico';
import { type FTTokenAction } from './useContractDeploys';
import type { ICOTransaction } from '@/pages/ico/components/shared/TransactionHistory';

const BIG_TOKEN_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '');
const BIG_DECIMALS = ICO_CONFIG.TOKEN.decimals; // 18

interface FTTokenActionsResponse {
  item_count: number;
  page_count: number;
  data: FTTokenAction[];
}

async function fetchUserTokenActions(publicKeyHex: string, page: number, pageSize: number): Promise<FTTokenActionsResponse> {
  const url = `/api/cspr-cloud/accounts/${publicKeyHex}/ft-token-actions?contract_package_hash=${BIG_TOKEN_PACKAGE_HASH}&page=${page}&page_size=${pageSize}&type=token_transfer&from_type=1`;

  const res = await fetch(url, {
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`CSPR.Cloud API error: ${res.status}`);
  }

  return res.json();
}

function mapToICOTransaction(action: FTTokenAction): ICOTransaction {
  const raw = BigInt(action.amount);
  const divisor = 10n ** BigInt(BIG_DECIMALS);
  const tokensReceived = Number(raw / divisor) + Number(raw % divisor) / Number(divisor);

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
    queryFn: async () => {
      const data = await fetchUserTokenActions(publicKey!, page, pageSize);
      return {
        transactions: (data.data ?? []).map(mapToICOTransaction),
        totalPages: data.page_count ?? 1,
      };
    },
    enabled: !!publicKey,
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });

  return {
    transactions: query.data?.transactions ?? [],
    totalPages: query.data?.totalPages ?? 1,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
