import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ICO_CONFIG } from '@/constants/ico';

const MOTES_PER_CSPR = 1_000_000_000; // 1 CSPR = 10^9 motes
const BALANCE_POLL_MS = 30_000; // 30 seconds

/**
 * Validates Casper public key format.
 * Public keys are 66 hex characters starting with '01' (Ed25519) or '02' (Secp256k1).
 */
function isValidPublicKey(key: string): boolean {
  if (key.length !== 66) return false;
  if (!key.startsWith('01') && !key.startsWith('02')) return false;
  return /^[0-9a-fA-F]+$/.test(key);
}

interface TokenBalance {
  balance: string;
  contractPackageHash: string;
  symbol?: string;
  name?: string;
  decimals?: number;
}

export interface WalletBalances {
  cspr: number;
  usdt: number;
  usdc: number;
  big: number;
}

interface UseCSPRBalanceReturn {
  balances: WalletBalances;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function csprCloudUrl(path: string): string {
  if (import.meta.env.DEV) {
    return `/api/cspr-cloud${path}`;
  }
  // Production: use Vercel serverless proxy (API key stays on server)
  return `/api/cspr-cloud?path=${encodeURIComponent(path.replace(/^\//, ''))}`;
}

async function fetchCSPRBalance(publicKey: string): Promise<number> {
  const res = await fetch(csprCloudUrl(`/accounts/${publicKey}`));

  if (!res.ok) throw new Error(`CSPR balance error: ${res.status}`);

  const json = await res.json();
  const motes = json.data.balance ?? '0';
  return Number(motes) / MOTES_PER_CSPR;
}

async function fetchFTBalances(publicKey: string): Promise<TokenBalance[]> {
  const res = await fetch(
    csprCloudUrl(`/accounts/${publicKey}/ft-token-ownership?includes=contract_package&page=1&page_size=50`),
  );

  if (!res.ok) {
    // 404 means account has no FT tokens — not an error
    if (res.status === 404) return [];
    throw new Error(`FT balance error: ${res.status}`);
  }

  const json = await res.json();
  const items: TokenBalance[] = (json.data ?? []).map((item: Record<string, unknown>) => {
    const pkg = item.contract_package as Record<string, unknown> | undefined;
    return {
      balance: String(item.balance ?? '0'),
      contractPackageHash: String(item.contract_package_hash ?? ''),
      symbol: pkg?.metadata ? (pkg.metadata as Record<string, string>).symbol : undefined,
      name: pkg?.metadata ? (pkg.metadata as Record<string, string>).name : undefined,
      decimals: pkg?.metadata ? Number((pkg.metadata as Record<string, string>).decimals ?? 0) : undefined,
    };
  });

  return items;
}

/**
 * Normalize contract hash by removing 'hash-' prefix for comparison
 */
function normalizeHash(hash: string): string {
  return hash.replace(/^hash-/, '').toLowerCase();
}

function findTokenBalance(tokens: TokenBalance[], contractAddress: string, symbolFallback: string): number {
  // Match by contract address first (if configured)
  // Compare normalized hashes (without 'hash-' prefix)
  const normalizedAddress = contractAddress ? normalizeHash(contractAddress) : '';

  let token = normalizedAddress
    ? tokens.find(t => normalizeHash(t.contractPackageHash) === normalizedAddress)
    : undefined;

  // Fallback: match by symbol (case-insensitive, handle tUSDC/tUSDT variants)
  if (!token) {
    const symbolUpper = symbolFallback.toUpperCase();
    token = tokens.find(t => {
      const tokenSymbol = t.symbol?.toUpperCase() ?? '';
      // Match exact or with 't' prefix (tUSDC, tUSDT for testnet)
      return tokenSymbol === symbolUpper ||
             tokenSymbol === `T${symbolUpper}` ||
             tokenSymbol === symbolUpper.replace(/^T/, '');
    });
  }

  if (!token) return 0;

  const decimals = token.decimals ?? 6;
  return Number(token.balance) / Math.pow(10, decimals);
}

const EMPTY_BALANCES: WalletBalances = { cspr: 0, usdt: 0, usdc: 0, big: 0 };

async function fetchAllBalances(publicKey: string): Promise<WalletBalances> {
  if (!isValidPublicKey(publicKey)) {
    throw new Error('Invalid public key format');
  }

  const [cspr, ftTokens] = await Promise.all([
    fetchCSPRBalance(publicKey),
    fetchFTBalances(publicKey),
  ]);

  return {
    cspr,
    usdt: findTokenBalance(ftTokens, ICO_CONFIG.CONTRACTS.usdtAddress, 'USDT'),
    usdc: findTokenBalance(ftTokens, ICO_CONFIG.CONTRACTS.usdcAddress, 'USDC'),
    big: findTokenBalance(ftTokens, ICO_CONFIG.CONTRACTS.tokenAddress, 'BIG'),
  };
}

/**
 * Hook for fetching wallet token balances from CSPR.Cloud API.
 *
 * Fetches CSPR native balance and CEP-18 token balances (USDT, USDC, BIG)
 * with automatic 30-second refresh interval when a publicKey is provided.
 *
 * @param publicKey - Casper account public key (hex string)
 */
export function useWalletBalances(publicKey: string | null | undefined): UseCSPRBalanceReturn {
  const {
    data,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<WalletBalances, Error>({
    queryKey: ['wallet-balances', publicKey],
    queryFn: () => fetchAllBalances(publicKey!),
    enabled: !!publicKey,
    refetchInterval: BALANCE_POLL_MS,
    staleTime: 10_000,
  });

  const refetch = useCallback(() => {
    queryRefetch();
  }, [queryRefetch]);

  return {
    balances: data ?? EMPTY_BALANCES,
    isLoading,
    error: queryError?.message ?? null,
    refetch,
  };
}
