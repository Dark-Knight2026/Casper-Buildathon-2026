import { useQuery } from '@tanstack/react-query';
import { ICO_CONFIG } from '@/constants/ico';
import { isICOPurchase } from './useContractDeploys';
import type { FTTokenAction, FTTokenActionsResponse } from '@/types/csprCloud';
import type { ICOTransaction } from '@/types/ico';

const BIG_TOKEN_PACKAGE_HASH = ICO_CONFIG.CONTRACTS.tokenAddress.replace(/^hash-/, '');
const BIG_DECIMALS = ICO_CONFIG.TOKEN.decimals; // 18

async function fetchUserTokenActions(publicKeyHex: string, signal?: AbortSignal): Promise<FTTokenAction[]> {
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
  let raw: bigint;
  try {
    raw = BigInt(action.amount);
  } catch {
    raw = 0n;
  }
  const divisor = 10n ** BigInt(BIG_DECIMALS);
  const tokensReceived = Number(raw / divisor) + Number(raw % divisor) / Number(divisor);

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
    refetchOnWindowFocus: true,
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
