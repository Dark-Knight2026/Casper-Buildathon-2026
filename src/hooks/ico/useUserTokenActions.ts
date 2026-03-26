import { useQuery } from '@tanstack/react-query';
import { ICO_CONFIG } from '@/constants/ico';
import { isICOPurchase } from './useContractDeploys';
import { rawTokenToNumber } from '@/lib/tokenAmount';
import type { FTTokenAction, FTTokenActionsResponse } from '@/types/csprCloud';
import type { ICOTransaction } from '@/types/ico';

const BIG_TOKEN_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '');
const BIG_DECIMALS = ICO_CONFIG.TOKEN.decimals; // 18

async function fetchUserTokenActions(publicKeyHex: string, signal?: AbortSignal): Promise<FTTokenAction[]> {
  // page_size=100 is intentional: this hook is a temporary direct CSPR.Cloud integration
  // that will be replaced by the backend API (which handles pagination server-side).
  const url = `/api/cspr-cloud/accounts/${publicKeyHex}/ft-token-actions?contract_package_hash=${BIG_TOKEN_PACKAGE_HASH}&page_size=100`;

  const timeout = AbortSignal.timeout(15_000);
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });

  if (!res.ok) {
    throw new Error(`CSPR.Cloud API error: ${res.status}`);
  }

  const data: FTTokenActionsResponse = await res.json();
  return data.data ?? [];
}

function mapToICOTransaction(action: FTTokenAction): ICOTransaction {
  const tokensReceived = rawTokenToNumber(action.amount, BIG_DECIMALS);

  return {
    id: `${action.deploy_hash}-${action.transform_idx}`,
    type: isICOPurchase(action) ? 'purchase' : 'claim',
    tokensReceived,
    tokenSymbol: ICO_CONFIG.TOKEN.symbol,
    status: 'completed',
    timestamp: new Date(action.timestamp),
    txHash: action.deploy_hash,
  };
}

export function useUserTokenActions(publicKey: string | null | undefined) {
  const query = useQuery<ICOTransaction[], Error>({
    queryKey: ['user-token-actions', publicKey],
    queryFn: ({ signal }) => fetchUserTokenActions(publicKey!, signal).then(actions => actions.map(mapToICOTransaction)),
    enabled: !!publicKey,
    staleTime: 120_000,
    refetchOnWindowFocus: true, // intentional: user expects updated balance after switching tabs during a pending purchase
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
