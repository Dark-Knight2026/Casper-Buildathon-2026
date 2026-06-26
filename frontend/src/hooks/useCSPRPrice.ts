/**
 * useCSPRPrice Hook
 * Manages CSPR exchange rate data.
 *
 * NOTE: This price is used for DISPLAY PURPOSES ONLY (UI estimation).
 * Actual token/CSPR conversion is handled on-chain by the smart contract.
 * The `isStale` flag lets the UI warn users when the displayed rate
 * may be outdated, but it does not block purchases — the contract
 * determines the real exchange rate independently.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';

/** Consider the price stale after 5 minutes without a successful refresh. */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export const CSPR_PRICE_QUERY_KEY = ['cspr-price'] as const;

export interface CSPRPriceState {
  priceUSD: number;
  priceEUR: number | null;
  priceGBP: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UseCSPRPriceReturn extends CSPRPriceState {
  isStale: boolean;
  fetchPrice: () => Promise<void>;
  convertToUSD: (csprAmount: number) => number;
  convertToCSPR: (usdAmount: number) => number;
  convertToEUR: (csprAmount: number) => number;
  convertToGBP: (csprAmount: number) => number;
}

export function useCSPRPrice(): UseCSPRPriceReturn {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: CSPR_PRICE_QUERY_KEY,
    queryFn: () => csprCloudService.getCSPRRates(['USD', 'EUR', 'GBP']),
    refetchInterval: STALE_THRESHOLD_MS,
    staleTime: STALE_THRESHOLD_MS,
    retry: 1,
  });

  const priceUSD = data?.cspr_usd ?? 0;
  const priceEUR = data?.cspr_eur ?? null;
  const priceGBP = data?.cspr_gbp ?? null;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const isStale = !dataUpdatedAt || Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS;

  const fetchPrice = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const convertToUSD = useCallback(
    (csprAmount: number): number => csprAmount * priceUSD,
    [priceUSD],
  );

  const convertToCSPR = useCallback(
    (usdAmount: number): number => (priceUSD > 0 ? usdAmount / priceUSD : 0),
    [priceUSD],
  );

  const convertToEUR = useCallback(
    (csprAmount: number): number => (priceEUR ? csprAmount * priceEUR : 0),
    [priceEUR],
  );

  const convertToGBP = useCallback(
    (csprAmount: number): number => (priceGBP ? csprAmount * priceGBP : 0),
    [priceGBP],
  );

  return {
    priceUSD,
    priceEUR,
    priceGBP,
    loading: isLoading,
    error: error ? 'Failed to fetch exchange rates' : null,
    lastUpdated,
    isStale,
    fetchPrice,
    convertToUSD,
    convertToCSPR,
    convertToEUR,
    convertToGBP,
  };
}
