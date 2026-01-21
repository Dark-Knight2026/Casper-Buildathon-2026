/**
 * useCSPRPrice Hook
 * Manages CSPR exchange rate data
 */

import { useState, useEffect, useCallback } from 'react';
import { csprCloudService } from '@/lib/blockchain/csprCloudService';

export interface CSPRPriceState {
  priceUSD: number;
  priceEUR: number | null;
  priceGBP: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useCSPRPrice() {
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
      console.error('Failed to fetch CSPR price:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch exchange rates',
      }));
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    
    // Update price every minute
    const interval = setInterval(fetchPrice, 60000);
    
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

  return {
    ...state,
    fetchPrice,
    convertToUSD,
    convertToCSPR,
    convertToEUR,
    convertToGBP,
  };
}