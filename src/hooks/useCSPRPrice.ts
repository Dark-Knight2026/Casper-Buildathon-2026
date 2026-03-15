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

import { useState, useEffect, useCallback } from 'react';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';
import logger from '@/lib/logger';

/** Consider the price stale after 5 minutes without a successful refresh. */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

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
  const [state, setState] = useState<CSPRPriceState>({
    priceUSD: 0,
    priceEUR: null,
    priceGBP: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchPrice = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const rates = await csprCloudService.getCSPRRates(['USD', 'EUR', 'GBP']);
      
      setState({
        priceUSD: rates.cspr_usd,
        priceEUR: rates.cspr_eur || null,
        priceGBP: rates.cspr_gbp || null,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      logger.error('Failed to fetch CSPR price:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch exchange rates',
      }));
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    
    // Update price every 5 minutes (matches STALE_THRESHOLD_MS)
    const interval = setInterval(fetchPrice, STALE_THRESHOLD_MS);
    
    return () => clearInterval(interval);
  }, [fetchPrice]);

  const convertToUSD = useCallback(
    (csprAmount: number): number => {
      return csprAmount * state.priceUSD;
    },
    [state.priceUSD]
  );

  const convertToCSPR = useCallback(
    (usdAmount: number): number => {
      return state.priceUSD > 0 ? usdAmount / state.priceUSD : 0;
    },
    [state.priceUSD]
  );

  const convertToEUR = useCallback(
    (csprAmount: number): number => {
      return state.priceEUR ? csprAmount * state.priceEUR : 0;
    },
    [state.priceEUR]
  );

  const convertToGBP = useCallback(
    (csprAmount: number): number => {
      return state.priceGBP ? csprAmount * state.priceGBP : 0;
    },
    [state.priceGBP]
  );

  const isStale =
    !state.lastUpdated ||
    Date.now() - state.lastUpdated.getTime() > STALE_THRESHOLD_MS;

  return {
    ...state,
    isStale,
    fetchPrice,
    convertToUSD,
    convertToCSPR,
    convertToEUR,
    convertToGBP,
  };
}