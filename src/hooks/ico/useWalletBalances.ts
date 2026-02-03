import { useState, useEffect, useCallback } from 'react';
import { ICO_CONFIG } from '@/constants/ico';

const MOTES_PER_CSPR = 1_000_000_000; // 1 CSPR = 10^9 motes

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
  const base = ICO_CONFIG.CASPER.networkName === 'casper-test'
    ? 'https://api.testnet.cspr.cloud'
    : 'https://api.cspr.cloud';
  return `${base}${path}`;
}

function csprCloudHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'accept': 'application/json' };
  if (!import.meta.env.DEV) {
    headers['authorization'] = import.meta.env.VITE_CSPR_CLOUD_API_KEY || '';
  }
  return headers;
}

async function fetchCSPRBalance(publicKey: string): Promise<number> {
  const res = await fetch(csprCloudUrl(`/accounts/${publicKey}`), {
    headers: csprCloudHeaders(),
  });

  if (!res.ok) throw new Error(`CSPR balance error: ${res.status}`);

  const json = await res.json();
  const motes = json.data.balance ?? '0';
  return Number(motes) / MOTES_PER_CSPR;
}

async function fetchFTBalances(publicKey: string): Promise<TokenBalance[]> {
  const res = await fetch(
    csprCloudUrl(`/accounts/${publicKey}/ft-token-ownership?includes=contract_package&page=1&page_size=50`),
    { headers: csprCloudHeaders() },
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

function findTokenBalance(tokens: TokenBalance[], contractAddress: string, symbolFallback: string): number {
  // Match by contract address first (if configured)
  let token = contractAddress
    ? tokens.find(t => t.contractPackageHash === contractAddress)
    : undefined;

  // Fallback: match by symbol
  if (!token) {
    token = tokens.find(t =>
      t.symbol?.toUpperCase() === symbolFallback.toUpperCase()
    );
  }

  if (!token) return 0;

  const decimals = token.decimals ?? 6;
  return Number(token.balance) / Math.pow(10, decimals);
}

const EMPTY_BALANCES: WalletBalances = { cspr: 0, usdt: 0, usdc: 0 };

export function useWalletBalances(publicKey: string | null | undefined): UseCSPRBalanceReturn {
  const [balances, setBalances] = useState<WalletBalances>(EMPTY_BALANCES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!publicKey) {
      setBalances(EMPTY_BALANCES);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [cspr, ftTokens] = await Promise.all([
        fetchCSPRBalance(publicKey),
        fetchFTBalances(publicKey),
      ]);

      setBalances({
        cspr,
        usdt: findTokenBalance(ftTokens, ICO_CONFIG.CONTRACTS.usdtAddress, 'USDT'),
        usdc: findTokenBalance(ftTokens, ICO_CONFIG.CONTRACTS.usdcAddress, 'USDC'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balances';
      setError(message);
      setBalances(EMPTY_BALANCES);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!publicKey) return;
    const interval = setInterval(refetch, 30_000);
    return () => clearInterval(interval);
  }, [publicKey, refetch]);

  return { balances, isLoading, error, refetch };
}
