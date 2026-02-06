import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAllSchedules } from '@/services/ico/icoContractService';
import type { SaleTimestamps } from '@/types/ico';
import type { ICOSchedule } from '@/services/ico/contractTypes';

// ── Types ────────────────────────────────────────────────────────────

export interface ScheduleProgress {
  tokensSold: number;
  totalAllocation: number;
  tokensRemaining: number;
  amountRaised: number;
  priceUsd: number;
  percentSold: number;
}

export interface ICOScheduleData {
  timestamps: SaleTimestamps | null;
  presaleProgress: ScheduleProgress | null;
  icoProgress: ScheduleProgress | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ── Constants ────────────────────────────────────────────────────────

// Poll every 5 minutes - schedule data rarely changes
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const TOKEN_DECIMALS = 18;
const PRICE_DECIMALS = 6; // USD price uses 6 decimals (like USDC/USDT)
const DECIMALS_DIVISOR = 10n ** BigInt(TOKEN_DECIMALS);
const PRICE_DIVISOR = 10n ** BigInt(PRICE_DECIMALS);

// ── Conversion helpers ───────────────────────────────────────────────

function fromDecimals(raw: bigint, decimals: bigint = DECIMALS_DIVISOR): number {
  const whole = raw / decimals;
  const frac = raw % decimals;
  return Number(whole) + Number(frac) / Number(decimals);
}

function scheduleToProgress(schedule: ICOSchedule): ScheduleProgress {
  const tokensSold = fromDecimals(schedule.soldAmount);
  const totalAllocation = fromDecimals(schedule.saleAmount);
  const tokensRemaining = totalAllocation - tokensSold;
  const priceUsd = fromDecimals(schedule.price, PRICE_DIVISOR);

  const amountRaisedRaw = (schedule.soldAmount * schedule.price) / DECIMALS_DIVISOR;
  const amountRaised = fromDecimals(amountRaisedRaw, PRICE_DIVISOR);

  const percentSold = totalAllocation > 0
    ? (tokensSold / totalAllocation) * 100
    : 0;

  return {
    tokensSold,
    totalAllocation,
    tokensRemaining,
    amountRaised,
    priceUsd,
    percentSold,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────

interface FetchedData {
  presale: ICOSchedule | null;
  ico: ICOSchedule | null;
}

export function useICOSchedules(): ICOScheduleData {
  const [data, setData] = useState<FetchedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(false);

  // Reset mountedRef on mount (fixes React StrictMode double-mount)
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSchedules = useCallback(async () => {
    console.log('[useICOSchedules] Starting fetch...');
    try {
      const schedules = await getAllSchedules();
      console.log('[useICOSchedules] Raw schedules from contract:', schedules);

      if (!mountedRef.current) return;

      const presale = schedules.find((s) => s.id === 0n)?.schedule ?? null;
      const ico = schedules.find((s) => s.id === 1n)?.schedule ?? null;

      console.log('[useICOSchedules] Parsed presale:', presale);
      console.log('[useICOSchedules] Parsed ico:', ico);

      setData({ presale, ico });
      setError(null);
    } catch (err) {
      console.error('[useICOSchedules] Fetch error:', err);
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch ICO schedules'));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        console.log('[useICOSchedules] Fetch complete, isLoading = false');
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Poll every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchSchedules, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSchedules]);

  const result = useMemo((): Omit<ICOScheduleData, 'isLoading' | 'error' | 'refetch'> => {
    // Still loading or no data
    if (!data) {
      return {
        timestamps: null,
        presaleProgress: null,
        icoProgress: null,
      };
    }

    const { presale, ico } = data;

    // Build timestamps from contract schedules
    const timestamps: SaleTimestamps | null = (presale || ico) ? {
      presaleStart: presale ? Number(presale.startTimestamp) : 0,
      presaleEnd: presale ? Number(presale.endTimestamp) : 0,
      icoStart: ico ? Number(ico.startTimestamp) : 0,
      icoEnd: ico ? Number(ico.endTimestamp) : 0,
    } : null;

    const presaleProgress = presale ? scheduleToProgress(presale) : null;
    const icoProgress = ico ? scheduleToProgress(ico) : null;

    return {
      timestamps,
      presaleProgress,
      icoProgress,
    };
  }, [data]);

  return {
    ...result,
    isLoading,
    error,
    refetch: fetchSchedules,
  };
}
